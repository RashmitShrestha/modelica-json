'use strict'
const as = require('assert')
const mo = require('mocha')
const path = require('path')
const fs = require('fs')
const logger = require('winston')

const pa = require('../lib/parser')
const ut = require('../lib/util')
const cxfExt = require('../lib/cxfExtractor')

// function with helper files
const hp = require('./helpers_test')

logger.level = 'error'

// Layout of the evalAndArrays test package:
//   evalAndArrays/ -- the sequences under test, a Modelica package so the folder
//                    name must equal the package name declared in its package.mo
//   objects/ -- the objects json every sequence is expected to produce
//   value_prop/ -- user supplied parameter values, only for the sequences needing them

// order of exec for this file
// 1. Parse the Modelica files to generate the objects json.
// 2. Read the generated objects json and compare against the references.
// 3. Run the cxf extractor and check the resulting graphs.

// although this test file is mainly for the object layer, it's crucial to check if the cxf layer correctly creates the objects

// Specific qualities that are being tested:
//   * every paramater points to a literal value instead of an expression
//   * an array of components becomes one plain component per element, named
//     "<name>_<index>"", and the connections are expanded to match
//   * conditional components that are "false" are removed
//   * each instantiated sub sequences gets its own file based on the path of the instance

// The cxf layer gets no specific references; all of it's input comes solely from the objects layer,
// the bottleneck is the correctness of the objects layer. Thus the cxf creator is unaware of the expression evaluation
// and array support functionality of the previous layer, it simply works with what it's handed

const moDir = path.join('test', 'evalAndArrays', 'evalAndArrays')
const packageDir = path.join(__dirname, 'evalAndArrays')
const referenceDir = path.join(packageDir, 'objects')
const valuePropDir = path.join(packageDir, 'value_prop')

// retrievers the current set of test cases from the reference objects json
//   mainCases -- the top level sequences
//   testCases -- combination of top level and sub sequences
const { mainCases, testCases } = hp.testCaseNames(referenceDir)

mo.describe('evaluation and arrays', function () {
  mo.describe('Testing parse from Modelica to Objects Json', function () {
    // remove the outputs before running the tests, then generate the object files
    mo.before(function () {
      hp.removeOutputDirs(['objects', 'json'])
      // dumps of the previous run, so whatever is left behind belongs to this one
      if (fs.existsSync(hp.diffDir())) ut.removeDir(hp.diffDir())
      pa.getJsons(ut.getMoFiles(moDir), 'semantic', 'current', true,
        /* generateElementary= */ false, /* generateCxfCore= */ false,
        /* mode= */ 'cdl', /* valueProp= */ valuePropDir)
    })

    // remove after running the tests just in case; the dumps a failing
    // comparison writes live outside these folders and are kept on purpose
    mo.after(function () {
      hp.removeOutputDirs(['objects', 'json'])

      if (!fs.existsSync(hp.diffDir())) return
      console.log('\n  Both sides of every failing case were written to ' + hp.diffDir() +
        '\n  Diff one with: git diff --no-index ' +
        path.join('test', 'diffs', '<name>.expected.json') + ' ' +
        path.join('test', 'diffs', '<name>.generated.json') + '\n')
    })

    // testing per each expected objects json file
    hp.jsonBaseNames(referenceDir).forEach(function (name) {
      mo.it('Objects json for ' + name, function () {
        const generatedPath = hp.objectsJsonPath(hp.generatedObjectsDir(moDir), name)
        const referencePath = hp.objectsJsonPath(referenceDir, name)

        // check to capture files that weren't generated
        as.ok(fs.existsSync(generatedPath), 'No objects json was generated at ' + generatedPath)

        // compare the generated and reference objects json files and capture differences
        const generated = hp.readNormalizedObjects(generatedPath)
        const reference = hp.readNormalizedObjects(referencePath)
        const differences = []
        hp.compare(generated, reference, name, differences, 0.001)

        // dump both sides so the mismatch can be read with a diff tool, the
        // generated tree itself being deleted once the suite is done
        let dumpedTo = ''
        if (differences.length > 0) {
          dumpedTo = '\n  Both sides were written to ' +
            hp.writeDiffArtifacts(name, generated, reference, differences)
        }

        // assert the failures as differences
        as.deepStrictEqual(differences, [],
          differences.length + ' difference(s) from ' + referencePath + ':\n  ' +
            differences.join('\n  ') + dumpedTo)
      })
    })

    mo.it('No objects json is generated that is not expected', function () {
      // test case where a generated objects json file has no corresponding reference file
      const generatedDir = hp.generatedObjectsDir(moDir)

      if (!fs.existsSync(generatedDir)) return
      const extraFile = hp.jsonBaseNames(generatedDir).filter(function (name) {
        return !hp.jsonBaseNames(referenceDir).includes(name)
      })

      as.deepStrictEqual(extraFile, [], 'Unexpected objects json: ' + extraFile.join(', '))
    })
  })

  mo.describe('Testing the expected objects', function () {
    // testing the generated object files against the expected sequences
    mo.it('Every value_prop file belongs to a sequence of the package', function () {
      // checking if every value_prop file belongs to a sequence of the package
      if (!fs.existsSync(valuePropDir)) return

      const orphans = hp.jsonBaseNames(valuePropDir)
        .filter(function (name) { return !mainCases.includes(name) })
      as.deepStrictEqual(orphans, [], 'value_prop files with no matching sequence: ' + orphans.join(', '))
    })

    mainCases.forEach(function (name) {
      const inputPath = path.join(valuePropDir, name + '.json')

      if (!fs.existsSync(inputPath)) return

      mo.it('values in ' + name + ' propogated correctly', function () {
        // for each parameter-value pair in the input file, check against the expected objects
        // ensure that the value in the input file matches the value in the expected objects

        Object.entries(JSON.parse(fs.readFileSync(inputPath, 'utf8'))).forEach(function ([parameter, value]) {
          const instance = hp.readNormalizedObjects(hp.objectsJsonPath(referenceDir, name)).instances[parameter]
          as.ok(instance !== undefined, name + ' declares no parameter named ' + parameter)

          // find and assert the differences
          const differences = []
          hp.compare(hp.parameterValue(instance), String(value),
            name + '.' + parameter, differences, 0.001)
          as.deepStrictEqual(differences, [],
            'Value supplied in ' + inputPath + ' is not the one the expected objects carry: ' +
              differences.join(', '))
        })
      })
    })

    // testing if the expected objects hold literal values only
    testCases.forEach(function (name) {
      mo.it('expected objects of ' + name + ' hold literal values only', function () {
        const objectsJson = hp.readNormalizedObjects(hp.objectsJsonPath(referenceDir, name))
        const unresolved = []
        Object.entries(objectsJson.instances).forEach(function ([parameter, instance]) {
          // check if instance is a parameter
          if (instance.type_prefix === undefined || !String(instance.type_prefix).includes('parameter')) return

          const value = hp.parameterValue(instance)
          if (value === undefined) {
            unresolved.push(parameter + ' (no value)')
          } else if (typeof value !== 'string') {
            // a structured node here means a for_loop or function_call survived
            unresolved.push(parameter + ' (' + JSON.stringify(value) + ')')
          } else if (/[A-Za-z_]/.test(value) && value !== 'true' && value !== 'false') {
            // checks to see if the value contains any letters, indicating it might be an unresolved identifier
            unresolved.push(parameter + ' (' + value + ')')
          }
        })
        // assert that there are no unresolved parameters if none of the checks above failed
        as.deepStrictEqual(unresolved, [], name + ' has unresolved parameters: ' + unresolved.join(', '))
      })
    })
  })

  mo.describe('Testing CXF generation from the expected objects', function () {
    // the graph each test case produced, filled in below and read by the last test
    const graphs = {}

    // creating the cxf graphs for each test case
    testCases.forEach(function (name) {
      mo.it('CXF graph of ' + name, function () {
        const objectsJson = hp.readNormalizedObjects(hp.objectsJsonPath(referenceDir, name))
        const cxf = cxfExt.getCxfGraph(
          objectsJson.instances, objectsJson.requiredReferences, name, false, false)

        // assert that the CXF graph is not empty
        as.ok(cxf !== null && Array.isArray(cxf['@graph']) && cxf['@graph'].length > 0,
          'CXF of ' + name + ' has an empty graph')
        graphs[name] = cxf
      })
    })

    mo.it('Every instantiated sub-sequence equates to a valid block ', function () {
      // finally see if the sub-sequences in the CXF graphs resolve to blocks
      const blocks = new Set()
      Object.values(graphs).forEach(function (cxf) {
        cxf['@graph'].forEach(function (node) {
          if (node['@type'] === 'S231:Block') blocks.add(node['@id'])
        })
      })

      // collect dangling blocks indicating an unresolved or missing block definition
      const dangling = []
      Object.entries(graphs).forEach(function ([name, cxf]) {
        cxf['@graph'].forEach(function (node) {
          const type = node['@type']
          if (typeof type !== 'string') return

          // CDL blocks can't dangle so only check for blocks from this suite of tests
          if (!type.startsWith('ex:evalAndArrays.')) return
          if (!blocks.has(type)) dangling.push(name + ': ' + node['@id'] + ' is a ' + type)
        })
      })
      // assert that there are no dangling blocks
      as.deepStrictEqual(dangling, [], 'Components with no block definition:\n  ' + dangling.join('\n  '))
    })
  })
})
