const arrayExpansion = require('./arrayExpansion.js')
const ut = require('./util.js')
const json2moExpression = require('../json2mo/expression.js')
const logger = require('winston') // use the default logger

// TODO: change structure to put all instances in "defined_instances" keyword

/*
{
    "instances": {
      "instance_a": {
        "type": "element",
        "type_specifier": "...",
        "type_prefix": "...",
        "annotation": {},
        "class_modification": {},
        "long_class_specifier_identifier": "..."
      },
      ...
    },
    "requiredReferences": {
        "extends_clause": [
            {
                "name": ...,
                "long_class_specifier_identifier": ..
                "class_modification": {},
                "annotation": {}
            }
        ],
        "import_clause": [
            {
                ...
            }
        ],
        "connections": {
          "instance_a": ["instance_b", "instance_c", ...],
          "instance_b": [...]
        }
    }
}

*/
function updateRequiredReferences (requiredReferences, newRequiredReferences) {
  if (newRequiredReferences !== null && newRequiredReferences !== undefined) {
    if ('extends_clause' in newRequiredReferences) {
      if ('extends_clause' in requiredReferences) {
        requiredReferences.extends_clause = requiredReferences.extends_clause.concat(newRequiredReferences.extends_clause)
      } else {
        requiredReferences.extends_clause = newRequiredReferences.extends_clause.concat([])
      }
    }
    if ('import_clause' in newRequiredReferences) {
      if ('import_clause' in requiredReferences) {
        requiredReferences.import_clause = requiredReferences.import_clause.concat(newRequiredReferences.import_clause)
      } else {
        requiredReferences.import_clause = newRequiredReferences.import_clause.concat([])
      }
    }
    if ('connections' in newRequiredReferences) {
      if ('connections' in requiredReferences) {
        requiredReferences.connections = updateConnections(requiredReferences.connections, newRequiredReferences.connections)
      } else {
        requiredReferences.connections = Object.assign({}, newRequiredReferences.connections)
      }
    }
  }
  return requiredReferences
}

function updateConnections (connections, newConnections) {
  if (newConnections !== null && newConnections !== undefined) {
    for (const element in newConnections) {
      if (!(element in connections)) {
        connections[element] = newConnections[element].concat([])
      } else {
        newConnections[element].forEach(connectedElement => {
          if (!(connectedElement in connections[element])) {
            connections[element] = connections[element].concat([connectedElement])
          }
        })
      }
    }
  }
  return connections
}

function extractAllObjects (jsonOutput, within = null, mode = 'cdl', jsons = null, userValues = null, withDefaults = false) {
  let instances = {}
  let requiredReferences = {}
  if (within === null) {
    if (jsonOutput.within === null || jsonOutput.within === undefined) {
      within = null
    } else {
      within = jsonOutput.within
    }
  }
  const fullMoFilePath = jsonOutput.fullMoFilePath

  const classDefinitions = jsonOutput.stored_class_definitions
  for (let i = 0; i < classDefinitions.length; i++) {
    let longClassSpecifier = null
    let shortClassSpecifier = null
    let derClassSpecifier = null
    let identifier = null

    const classDefinition = classDefinitions[i]
    const classSpecifier = classDefinition.class_specifier
    const classPrefixes = classDefinition.class_prefixes
    if ('long_class_specifier' in classSpecifier) {
      longClassSpecifier = classSpecifier.long_class_specifier
      // create the evaluation context for this class 
      const evalContext = buildEvaluationContext(
        Object.assign({}, classDefinition, { within, fullMoFilePath }), jsons, userValues, withDefaults)
      const newAllObjects = extractFromLongClassSpecifier(longClassSpecifier, fullMoFilePath, classPrefixes, within, evalContext)
      if (evalContext !== null && evalContext !== undefined) {
        // if evalContext is not null or undefined, expand arrays within the new objects
        // because the arrays may contain expressions that need to be evaluated in the context of the class
        arrayExpansion.expandArrays(newAllObjects, longClassSpecifier.identifier)
      }
      instances = Object.assign({}, instances, newAllObjects.instances)
      requiredReferences = updateRequiredReferences(requiredReferences, newAllObjects.requiredReferences)
    }
    if ('short_class_specifier' in classSpecifier) {
      shortClassSpecifier = classSpecifier.short_class_specifier
      identifier = shortClassSpecifier.identifier
      const shortClassSpeciiferValue = shortClassSpecifier.value
      let name = null

      if ('name' in shortClassSpeciiferValue && shortClassSpeciiferValue.name !== undefined) {
        name = shortClassSpeciiferValue.name
        instances[identifier] = {
          type: 'short_class_specifier',
          type_specifier: name,
          short_class_specifier_value: shortClassSpeciiferValue,
          within,
          fullMoFilePath,
          description: shortClassSpeciiferValue.description
        }
      }
      if ('enum_list' in shortClassSpeciiferValue && shortClassSpeciiferValue.enum_list !== undefined) {
        instances[identifier] = {
          type: 'enumeration_class',
          type_specifier: name,
          short_class_specifier_value: shortClassSpeciiferValue,
          within,
          fullMoFilePath,
          description: shortClassSpeciiferValue.description
        }
        const enumList = shortClassSpeciiferValue.enum_list

        for (let j = 0; j < enumList.length; j++) {
          const enumListIdentifier = enumList[j].identifier
          instances[enumListIdentifier] = {
            type: 'enumeration',
            description: enumList[j].description,
            enumeration_literal: enumList[j],
            enumeration_kind: identifier
          }
        }
      }
    }
    if ('der_class_specifier' in classSpecifier && classSpecifier.der_class_specifier !== undefined) {
      derClassSpecifier = classSpecifier.der_class_specifier
      identifier = derClassSpecifier.identifier
      const derClassSpeciiferValue = derClassSpecifier.value
      instances[identifier] = {
        type: 'der_class_specifier',
        value: derClassSpeciiferValue,
        within,
        fullMoFilePath
      }
    }
  }
  const allObjects = { instances, requiredReferences }
  return allObjects
}

function extractFromLongClassSpecifier (longClassSpecifier, fullMoFilePath, classPrefixes = null, within = null, evalContext = null) {
  let instances = {}
  let requiredReferences = {}
  let identifier = null
  let composition = null
  let compositionInstances = {}
  let compositionRequiredReferences = {}
  const dictIdentifier = {}
  dictIdentifier.within = within
  dictIdentifier.fullMoFilePath = fullMoFilePath

  if ('identifier' in longClassSpecifier) {
    identifier = longClassSpecifier.identifier
    dictIdentifier.type = 'long_class_specifier'
  }

  if (classPrefixes !== null) {
    dictIdentifier.class_prefixes = classPrefixes
  }

  if (longClassSpecifier.extends !== null && longClassSpecifier.extends !== undefined) {
    dictIdentifier.extends = true
    if ('class_modification' in longClassSpecifier && longClassSpecifier.class_modification !== undefined) {
      // classModification = longClassSpecifier.classModification
      // TODO: handle later
    }
  }
  if ('composition' in longClassSpecifier && longClassSpecifier.composition !== undefined) {
    composition = longClassSpecifier.composition
    const newAllObjects = extractFromComposition(composition, identifier, fullMoFilePath, within, evalContext)
    compositionInstances = Object.assign({}, compositionInstances, newAllObjects.instances)
    compositionRequiredReferences = updateRequiredReferences(compositionRequiredReferences, newAllObjects.requiredReferences)

    if ('annotation' in composition && composition.annotation !== undefined) {
      dictIdentifier.annotation = composition.annotation
      dictIdentifier.semantics = extractSemanticsFromAnnotations(composition.annotation, identifier)
      dictIdentifier.cdl_annotations = extractCdlAnnotations(composition.annotation)
    }
  }
  if (identifier !== null) {
    instances[identifier] = dictIdentifier
  }
  if (compositionInstances.length !== 0) {
    instances = Object.assign({}, instances, compositionInstances)
  }
  requiredReferences = updateRequiredReferences(requiredReferences, compositionRequiredReferences)
  const allObjects = { instances, requiredReferences }
  return allObjects
}

function extractFromComposition (composition, longClassSpecifierIdentifier, fullMoFilePath, within, evalContext = null) {
  let elementSections = null
  let instances = {}
  let requiredReferences = {}
  let newAllObjects = null

  if (composition === null || composition === undefined) {
    return { instances: {}, requiredReferences: {} }
  }

  if ('element_list' in composition && composition.element_list !== undefined) {
    const elementList = composition.element_list
    // TODO: check with jianjun
    newAllObjects = extractFromElementList(elementList, longClassSpecifierIdentifier, fullMoFilePath, within, 'public', evalContext)
    instances = Object.assign({}, instances, newAllObjects.instances)
    requiredReferences = updateRequiredReferences(requiredReferences, newAllObjects.requiredReferences)
  }

  if ('element_sections' in composition && composition.element_sections !== undefined) {
    elementSections = composition.element_sections
    for (let i = 0; i < elementSections.length; i++) {
      const elementSection = elementSections[i]
      if ('public_element_list' in elementSection && elementSection.public_element_list !== undefined) {
        const publicElementList = elementSection.public_element_list
        newAllObjects = extractFromElementList(publicElementList, longClassSpecifierIdentifier, fullMoFilePath, within, 'public', evalContext)
        instances = Object.assign({}, instances, newAllObjects.instances)
        requiredReferences = updateRequiredReferences(requiredReferences, newAllObjects.requiredReferences)
      }
      if ('protected_element_list' in elementSection && elementSection.protected_element_list !== undefined) {
        const protectedElementList = elementSection.protected_element_list
        newAllObjects = extractFromElementList(protectedElementList, longClassSpecifierIdentifier, fullMoFilePath, within, 'protected', evalContext)
        instances = Object.assign({}, instances, newAllObjects.instances)
        requiredReferences = updateRequiredReferences(requiredReferences, newAllObjects.requiredReferences)
      }
      if ('equation_section' in elementSection && elementSection.equation_section !== undefined) {
        const equationSection = elementSection.equation_section
        const newConnections = extractConnectionsFromEquationSection(equationSection)
        const newRequiredReferences = { connections: newConnections }
        requiredReferences = updateRequiredReferences(requiredReferences, newRequiredReferences)
      }
    }
  }

  if ('external_composition' in composition && composition.external_composition !== undefined) {
    // TODO:
  }
  const allObjects = { instances, requiredReferences }
  return allObjects
}

function extractFromElementList (elementList, longClassSpecifierIdentifier, fullMoFilePath, within, compositionSpecifier, evalContext = null) {
  let instances = {}
  let requiredReferences = {}

  for (let i = 0; i < elementList.length; i++) {
    const element = elementList[i]

    if ('extends_clause' in element && element.extends_clause !== undefined) {
      const extendsClause = element.extends_clause
      if (longClassSpecifierIdentifier !== null) {
        extendsClause.long_class_specifier_identifier = longClassSpecifierIdentifier
        extendsClause.within = within
        extendsClause.compositionSpecifier = compositionSpecifier
      }

      if ('extends_clause' in requiredReferences) {
        requiredReferences.extends_clause = requiredReferences.extends_clause.concat([extendsClause])
      } else {
        requiredReferences.extends_clause = [extendsClause]
      }
    }
    if ('import_clause' in element && element.import_clause !== undefined) {
      const importClause = element.import_clause
      if (longClassSpecifierIdentifier !== null) {
        importClause.long_class_specifier_identifier = longClassSpecifierIdentifier
        importClause.within = within
        importClause.compositionSpecifier = compositionSpecifier
      }
      if ('import_clause' in requiredReferences) {
        requiredReferences.import_clause = requiredReferences.import_clause.concat([importClause])
      } else {
        requiredReferences.import_clause = [importClause]
      }
    }
    if ('class_definition' in element && element.class_definition !== undefined) {
      const classDefinitionInstance = {}
      const classSpecifier = element.class_definition.class_specifier
      const classPrefixes = element.class_definition.class_prefixes
      let identifier2 = null
      const dict = {
        within,
        fullMoFilePath,
        classPrefixes,
        compositionSpecifier
      }
      if ('long_class_specifier' in classSpecifier) {
        dict.type = 'long_class_specifier'
        identifier2 = classSpecifier.long_class_specifier.identifier
        dict.annotation = classSpecifier.long_class_specifier.composition.annotation
        dict.semantics = extractSemanticsFromAnnotations(dict.annotation, identifier2)
        dict.cdl_annotations = extractCdlAnnotations(dict.annotation)

        classDefinitionInstance[identifier2] = dict
      } else if ('short_class_specifier' in classSpecifier) {
        // TODO: handle
      }
      // var jsonOp = {'class_definition': [element.class_definition], 'within': within, 'fullMoFilePath': fullMoFilePath}
      // var newAllObjects = extractAllObjects(jsonOp, within=within)
      instances = Object.assign({}, instances, classDefinitionInstance)
      requiredReferences = updateRequiredReferences(requiredReferences, {})
    }
    if ('component_clause' in element && element.component_clause !== undefined) {
      let componentClause = element.component_clause
      if (evalContext !== null && evalContext !== undefined) {
        // expressions replace their placeholders with evaluated values
        componentClause = JSON.parse(JSON.stringify(componentClause))
        evaluateComponentClause(componentClause, evalContext)
      }

      let typePrefix = null
      let typeSpecifier = null
      let arraySubscripts = null
      let constrainingClause = null
      let replaceable = null
      const componentList = componentClause.component_list

      typePrefix = componentClause.type_prefix
      typeSpecifier = ut.resolveTypeSpecifier(componentClause.type_specifier, within, fullMoFilePath)
      arraySubscripts = componentClause.array_subscripts

      if ('constraining_clause' in element && element.constraining_clause !== undefined) {
        constrainingClause = element.constraining_clause
      }
      if ('replaceable' in element && element.replaceable !== undefined) {
        replaceable = element.replaceable
      }

      for (let i = 0; i < componentList.length; i++) {
        const singleComponentList = componentList[i]
        const identifier = singleComponentList.declaration.identifier
        let annotation = null

        if ('description' in singleComponentList && singleComponentList.description !== undefined) {
          if ('annotation' in singleComponentList.description && singleComponentList.description.annotation !== undefined) {
            annotation = singleComponentList.description.annotation
          }
        }
        let isVector = false
        let singleComponentArraySubscripts = ''
        if ('array_subscripts' in singleComponentList.declaration && singleComponentList.declaration.array_subscripts !== undefined) {
          isVector = true
          singleComponentArraySubscripts = parseArraySubscripts(singleComponentList.declaration.array_subscripts)
        }
        instances[identifier] = {
          type_prefix: typePrefix,
          type_specifier: typeSpecifier,
          array_subscripts: arraySubscripts,
          type: 'element',
          compositionSpecifier,
          long_class_specifier_identifier: longClassSpecifierIdentifier,
          single_component_list: singleComponentList,
          annotation,
          semantics: extractSemanticsFromAnnotations(annotation, identifier),
          cdl_annotations: extractCdlAnnotations(annotation),
          isVector,
          arraySubscripts: singleComponentArraySubscripts,
          replaceable,
          constraining_clause: constrainingClause,
          within,
          fullMoFilePath
        }
      }
    }
  }
  const allObjects = { instances, requiredReferences }
  return allObjects
}

function extractConnectionsFromEquationSection (equationSection) {
  const connections = {}
  let equations = null
  if ('equation' in equationSection && equationSection.equation !== undefined) {
    equations = equationSection.equation
    for (let i = 0; i < equations.length; i++) {
      const equation = equations[i]
      let connectClause = null

      if ('connect_clause' in equation && equation.connect_clause !== undefined) {
        connectClause = equation.connect_clause

        const from = parseComponentReference(connectClause.from)
        const to = parseComponentReference(connectClause.to)
        if (from in connections) {
          if (!(to in connections[from])) {
            connections[from] = connections[from].concat([to])
          }
        } else {
          connections[from] = [to]
        }
      }
    }
  }
  return connections
}

function parseComponentReference (reference) {
  let name = ''
  reference.forEach(namePart => {
    if (namePart.dot_op === true) {
      name = name + '.'
    }

    if (namePart.identifier !== undefined && namePart.identifier !== null) {
      name = name + namePart.identifier
    }
    if (namePart.array_subscripts !== undefined && namePart.array_subscripts !== null) {
      name = name + parseArraySubscripts(namePart.array_subscripts)
    }
  })
  return name
}

function parseArraySubscripts (arraySubscripts) {
  let arraySubscriptsString = ''
  if (arraySubscripts !== undefined && arraySubscripts !== null && arraySubscripts.length !== 0) {
    arraySubscripts.forEach(subscript => {
      if (subscript !== undefined) {
        if ('colon_op' in subscript && subscript.colon_op !== undefined && subscript.colon_op) {
          arraySubscriptsString += ':'
        }
        if ('expression' in subscript && subscript.expression !== undefined) {
          if ('simple_expression' in subscript.expression && subscript.expression.simple_expression !== undefined) {
            arraySubscriptsString += subscript.expression.simple_expression
          } else {
            arraySubscriptsString += json2moExpression.parse(subscript.expression)
          }
        }
        arraySubscriptsString += ','
      }
    })
    if (arraySubscriptsString !== '') {
      arraySubscriptsString = arraySubscriptsString.slice(0, -1)
      arraySubscriptsString = '[' + arraySubscriptsString + ']'
    }
    return arraySubscriptsString
  } else {
    return ''
  }
}

/**
 * builds the context of which the expressions of a class are evaluated
 *
 * the context maps every parameter and constant of the class, and of all the
 * classes it instantiates, to its binding
 * @param {Object} classDefinition the class definition to build the context for.
 *     It must carry the additional within and fullMoFilePath properties.
 * @param {Array} jsons the JSON representations of the class and of every class
 *     it instantiates. Without them no lookup is possible and no context is built.
 * @param {Object} [userValues] values that take precedence over the bindings
 *     declared in the Modelica source, keyed the same way as the context.
 * @param {boolean} [withDefaults] whether a parameter with no binding takes the
 *     default of its declared attributes or of its data type.
 * @returns {{values: Object, prefix: string|null}|null} The context, or null
 *     when it cannot be built, in which case the expressions are left untouched.
 */
function buildEvaluationContext (classDefinition, jsons, userValues, withDefaults = false) {
  if (jsons === null || jsons === undefined) {
    return null
  }
  try {
    const expressionEvaluation = require('./expressionEvaluation.js')
    const values = {}

    expressionEvaluation.getParametersAndBindings(
      classDefinition, jsons, /* fetchDoc= */ false, /* fetchVariables= */ false,
      /* _instance= */ undefined, /* _bindings= */ undefined, withDefaults)
      .parameters.forEach(parameter => {
        values[parameter.name] = parameter.value
      })
    return { values: Object.assign(values, userValues), prefix: null }
  } catch (error) {
    logger.debug(`Could not build the evaluation context of ${classDefinition.within}: ${error}`)
    return null
  }
}


/**
 * turns an evaluation value into a Modelica literal
 *
 * @param {*} value The value to convert
 * @returns {string} The Modelica literal
 */
function stringifyEvaluatedValue (value) {
  if (Array.isArray(value)) {
    return '{' + value.map(stringifyEvaluatedValue).join(',') + '}'
  }
  return `${value}`
}

/**
 * evaluates an expression and returns the value it evaluates to
 *
 * only numbers, booleans and arrays are substituted, but not strings, enumerations, or other expressions
 *
 * @param {Object} expression The expression object to evaluate
 * @param {Object} context The context to evaluate the expression in
 * @returns {Object} The value the expression evaluates to, as an expression
 *     object, or the expression itself when it does not evaluate to a value
 */
function evaluateExpression (expression, context) {
  if (expression === null || expression === undefined) {
    return expression
  }

  const expressionEvaluation = require('./expressionEvaluation.js')
  let value = null

  try {
    value = expressionEvaluation.evalExpression(
      expressionEvaluation.stringifyExpression(expression),
      context.values, context.prefix ?? undefined)
  } catch (error) {
    logger.debug(`Could not evaluate ${JSON.stringify(expression)}: ${error}`)
    return expression
  }

  if (typeof value === 'number' || typeof value === 'boolean' || Array.isArray(value)) {
    return { simple_expression: stringifyEvaluatedValue(value) }
  }

  return expression
}

/**
 * replaces every modification's expression by the value it evaluates to
 *
 * nested class modifications are evaluated as well, so that the values bound to
 * the parameters of a sub-component - such as con1(final k=input1) - are resolved.
 *
 * @param {Object} modification the modification to evaluate
 * @param {Object} context the context to evaluate the expressions in
 * @returns {void}
 */
function evaluateModification (modification, context) {
  if (modification === null || modification === undefined) {
    return
  }

  // evaluate the main expression of the modification, if it exists
  if (modification.expression !== undefined) {
    modification.expression = evaluateExpression(modification.expression, context)
  }

  if (Array.isArray(modification.class_modification)) {
    modification.class_modification.forEach(classModification => {
      evaluateModification(
        classModification.element_modification_or_replaceable?.element_modification?.modification,
        context)
    })
  }
}

/**
 * replaces in place every array subscript by the value it evaluates to.
 *
 * @param {Array} arraySubscripts the array subscripts to evaluate
 * @param {Object} context the context to evaluate the expressions in
 * @returns {void}
 */
function evaluateArraySubscripts (arraySubscripts, context) {
  if (!Array.isArray(arraySubscripts)) {
    return
  }
  arraySubscripts.forEach(subscript => {
    if (subscript !== undefined && subscript !== null && subscript.expression !== undefined) {
      subscript.expression = evaluateExpression(subscript.expression, context)
    }
  })
}

/**
 * replaces in place every expression of a component clause 
 *
 * A parameter with no binding of its own takes its value from the context when
 * there is one, which is how the values a user supplies reach the extracted objects.
 *
 * @param {Object} componentClause The component clause to evaluate.
 * @param {Object} context The context to evaluate the expressions in.
 * @returns {void}
 */
function evaluateComponentClause (componentClause, context) {
  evaluateArraySubscripts(componentClause.array_subscripts, context)

  componentClause.component_list.forEach(singleComponentList => {
    const declaration = singleComponentList.declaration

    evaluateArraySubscripts(declaration.array_subscripts, context)
    if (declaration.modification !== null && declaration.modification !== undefined) {
      evaluateModification(declaration.modification, context)
    }
    // if a declaration isnt modified to be equal, take its value from the context
    // since it has no binding of its own, it relies on the context for its value
    if (declaration.modification?.equal !== true) {
      const value = context.values[context.prefix == null ? declaration.identifier : `${context.prefix}.${declaration.identifier}`]
      
      // if there's a value in the context, hard-code it into the modification
      if (value !== undefined && value !== null) {
        declaration.modification = Object.assign({}, declaration.modification, {
          equal: true,
          expression: evaluateExpression({ simple_expression: `${value}` }, context)
        })
      }
    }
    if (singleComponentList.condition_attribute !== null &&
      singleComponentList.condition_attribute !== undefined) {
      singleComponentList.condition_attribute.expression = evaluateExpression(
        singleComponentList.condition_attribute.expression, context)
    }
  })
}

/**
 * renames the class an extracted objects json describes based on the instance path
 * it records the class it came from in instanceOf.
 *
 * @param {Object} allObjects The instances and connections of the sub-sequence,
 *     mutated in place.
 * @param {string} identifier The name the class is declared with.
 * @param {string} name The name the sub-sequence takes.
 * @param {string} instanceOf The full name of the class it came from.
 * @returns {void}
 */
function renameExtractedClass (allObjects, identifier, name, instanceOf) {
  const instances = {}

  Object.entries(allObjects.instances).forEach(([key, instance]) => {
    if (instance.long_class_specifier_identifier === identifier) {
      instance.long_class_specifier_identifier = name
    }

    if (key === identifier && instance.type === 'long_class_specifier') {
      instances[name] = Object.assign(instance, { instanceOf })
    } else {
      instances[key] = instance
    }
  })
  // replace the old instances map with the new one that has renamed classes
  allObjects.instances = instances
}

/**
 * class definition of a custom-made sub-sequence, as CDL blocks have transparent definitions
 *
 * @param {Object} instance One entry of an objects json instances map
 * @param {Array} jsons The JSON representations of every class in the run
 * @param {Object} classObject The JSON representation of the class declaring
 *     the component, for short class name lookups
 * @returns {Object|null} the class definition, with its within and
 *     fullMoFilePath properties, or null when the component is not one
 */
function findSubSequenceDefinition (instance, jsons, classObject) {
  const expressionEvaluation = require('./expressionEvaluation.js')
  const typeSpecifier = instance.type_specifier
  if (typeof typeSpecifier !== 'string' ||
    expressionEvaluation.primitiveTypes.includes(typeSpecifier)) {
    return null
  }
  // if a type specifier includes a dot, it is already a full class name
  // if it doesn't then it needs to be looked up in the context of the instance's location
  const fullClassName = typeSpecifier.includes('.')
    ? typeSpecifier
    : expressionEvaluation.lookupClassName(typeSpecifier, instance.within, instance.fullMoFilePath)

  if (fullClassName == null || ut.checkIfCdlElementaryBlockOrPackage(fullClassName, true)) return null
  

  const classDefinition = expressionEvaluation.getClassDefinition(fullClassName, jsons, classObject)
  if (classDefinition?.class_specifier?.long_class_specifier?.composition == null) {
    return null
  }
  return Object.assign({}, classDefinition, { fullClassName })
}

/**
 * the values an instantiation supplies to the class it instantiates
 *
 * A sub-sequence takes its parameters at the point of instantiation, so the
 * modifications the component was declared with are what the expressions inside
 * it resolve against - the guard of a conditional component above all. They are
 * read off the component rather than off the class definition, which is what
 * makes two instantiations of the same class differ: `setChaPre` declared with
 * `use_mulSteSetCha=false` drops the components `setChaShe` keeps.
 *
 * The modifications have already been evaluated in the context of the class
 * that declares the component, so what is read here is literal.
 *
 * @param {Object} instance The component that instantiates the class.
 * @param {string} prefix The instance path the sub-sequence takes, which is how
 *     the evaluation context is keyed.
 * @returns {Object} The values, keyed the same way as the context.
 */
function instantiationValues (instance, prefix) {
  const expressionEvaluation = require('./expressionEvaluation.js')
  const values = {}
  const classModification =
    instance.single_component_list?.declaration?.modification?.class_modification

  if (!Array.isArray(classModification)) {
    return values
  }

  classModification.forEach(modification => {
    const elementModification =
      modification.element_modification_or_replaceable?.element_modification
    const name = elementModification?.name
    const expression = elementModification?.modification?.expression
    /* A nested modification - con1(k(min=0)) - binds no value of its own, and a
       name with a dot in it belongs to a component of the sub-sequence, not to
       one of its parameters. */
    if (name == null || name.includes('.') || expression === undefined) {
      return
    }
    values[`${prefix}.${name}`] = expressionEvaluation.stringifyExpression(expression)
  })

  return values
}

/**
 * extracts every sub-sequence a class instantiates as a class of its own
 *
 * different classes instantiated from the same definition will be treated as separate sub-sequences.
 *
 * @param {Object} allObjects The instances and connections of the class,
 *     mutated in place so that its components name the sub-sequences
 * @param {string} name The name the class is known by, which the sub-sequences
 *     are named after
 * @param {Object} context The context the expressions are evaluated in, built
 *     for the class the extraction started from
 * @param {Array} jsons The JSON representations of every class in the run
 * @param {Object} classObject The JSON representation of the class the
 *     extraction started from, for short class name lookups
 * @param {string} [within] The package the sub-sequences belong to
 * @returns {Object} One entry per sub-sequence, keyed by the name it takes
 */
function extractSubSequences (allObjects, name, context, jsons, classObject, within = null) {
  const subSequences = {}
  Object.entries(allObjects.instances).forEach(([identifier, instance]) => {
    if (instance.type !== 'element') {
      return
    }
    const classDefinition = findSubSequenceDefinition(instance, jsons, classObject)
    if (classDefinition === null) {
      return
    }
    const longClassSpecifier = classDefinition.class_specifier.long_class_specifier
    const subName = `${name}.${identifier}`
    const subPrefix = context.prefix == null ? identifier : `${context.prefix}.${identifier}`
    const subContext = {
      /* The context of the class that declares the component, plus what this
         instantiation binds. The latter wins: it is the value the parameter
         takes in this copy of the sub-sequence. */
      values: Object.assign({}, context.values, instantiationValues(instance, subPrefix)),
      prefix: subPrefix
    }
    const subObjects = extractFromLongClassSpecifier(
      longClassSpecifier, classDefinition.fullMoFilePath, classDefinition.class_prefixes,
      classDefinition.within, subContext)
    renameExtractedClass(
      subObjects, longClassSpecifier.identifier, subName, classDefinition.fullClassName)
    arrayExpansion.expandArrays(subObjects, subName)

    /* The block a sub-sequence yields keeps the package of the file that
       defines the class, because that is the package `extractFromLongClassSpecifier`
       stamped on it above. The component has to name it the same way, or the
       type it refers to resolves to nothing. Note this is not the package of
       the sequence: two sequences of different packages instantiating the same
       class each get their own block, told apart by `subName`. */
    const subWithin = classDefinition.within
    instance.type_specifier = subWithin == null ? subName : `${subWithin}.${subName}`
    subSequences[subName] = subObjects
    Object.assign(subSequences, extractSubSequences(
      subObjects, subName, subContext, jsons, classObject, within))
  })
  return subSequences
}

/**
 * extracts every sub-sequence the classes of one Modelica file instantiate
 *
 * @param {Object} allObjects The instances and connections the file yielded,
 *     mutated in place so that its components name the sub-sequences.
 * @param {Object} jsonOutput The JSON representation of the file.
 * @param {Array} jsons The JSON representations of every class in the run.
 * @param {Object} [userValues] Values that take precedence over the bindings
 *     declared in the Modelica source.
 * @param {boolean} [withDefaults] Whether a parameter with no binding takes the
 *     default of its declared attributes or of its data type.
 * @returns {Object} One entry per sub-sequence, keyed by the name it takes.
 */
function extractAllSubSequences (allObjects, jsonOutput, jsons, userValues = null, withDefaults = false) {
  if (jsons === null || jsons === undefined) {
    return {}
  }

  const within = jsonOutput.within ?? null
  const fullMoFilePath = jsonOutput.fullMoFilePath
  const subSequences = {}

  for (const classDefinition of jsonOutput.stored_class_definitions ?? []) {
    const longClassSpecifier = classDefinition.class_specifier?.long_class_specifier
    if (longClassSpecifier?.identifier == null) {
      continue
    }
    const context = buildEvaluationContext(
      Object.assign({}, classDefinition, { within, fullMoFilePath }), jsons, userValues, withDefaults)
   
    if (context === null) {
      continue
    }

    Object.assign(subSequences, extractSubSequences(
      allObjects, longClassSpecifier.identifier, context, jsons, jsonOutput, within))
  }
  return subSequences
}

/**
 * Parses *class* modifications and constructs an output dictionary.
 *
 * - Direct assignments (such as in parameter declarations) are not returned.
 *
 * @param {Object} modifications The modifications object to parse.
 * @param {function} [stringifyExpression=] Function to convert expression
 *     objects into Modelica expressions (strings).
 * @returns {Object} The parsed modifications as a dictionary.
 */
function parseModifications (modifications, stringifyExpression) {
  let outputDict = {}
  if (Object.keys(modifications).length > 0) {
    Object.keys(modifications).forEach(modificationKey => {
      const classModifications = modifications[modificationKey]
      if (classModifications?.length > 0) {
        classModifications.forEach(classModification => {
          const eleMod = classModification.element_modification_or_replaceable.element_modification
          const eleKey = eleMod.name
          const eleDict = {}
          const mod = eleMod.modification
          if (mod.expression !== undefined) {
            if (stringifyExpression != null) {
              eleDict[eleKey] = stringifyExpression(mod.expression)
            } else {
              eleDict[eleKey] = mod.expression.simple_expression || mod.expression.if_expression
            }
          } else {
            eleDict[eleKey] = parseModifications(mod, stringifyExpression)
          }
          if (eleKey !== 'propagate') {
            outputDict = Object.assign({}, outputDict, eleDict)
          } else {
            if (outputDict.propagate === undefined) {
              outputDict.propagate = [eleDict[eleKey]]
            } else {
              const existingPropagateList = outputDict.propagate
              existingPropagateList.push(eleDict[eleKey])
              outputDict.propagate = existingPropagateList
            }
          }
        })
      }
    })
  }
  return outputDict
}

function extractCdlAnnotations (annotation) {
  let cdlAnnotations = {}
  if (annotation !== null && annotation !== undefined) {
    annotation.forEach(singleAnnotation => {
      const annotationName = singleAnnotation.element_modification_or_replaceable.element_modification.name
      if (annotationName === '__cdl' || annotationName === '__Buildings') {
        const modifications = singleAnnotation.element_modification_or_replaceable.element_modification.modification
        cdlAnnotations = parseModifications(modifications)
      }
    })
  }
  return cdlAnnotations
}

function extractSemanticsFromAnnotations (annotation, instanceIdentifier) {
  const semantics = {}
  if (annotation !== null && annotation !== undefined) {
    annotation.forEach(singleAnnotation => {
      const annotationName = singleAnnotation.element_modification_or_replaceable.element_modification.name
      if (annotationName === '__cdl' || annotationName === '__Buildings') {
        const classModifications = singleAnnotation.element_modification_or_replaceable.element_modification.modification.class_modification
        classModifications.forEach(classModification => {
          const keyName = classModification.element_modification_or_replaceable.element_modification.name
          if (keyName === 'semantic') {
            const semanticClassModifications = classModification.element_modification_or_replaceable.element_modification.modification.class_modification
            semanticClassModifications.forEach(semanticClassModification => {
              const semanticLanguageKey = semanticClassModification.element_modification_or_replaceable.element_modification.name
              let semanticLanguage = semanticClassModification.element_modification_or_replaceable.element_modification.modification.expression.simple_expression
              const semanticLanguageContent = semanticClassModification.element_modification_or_replaceable.element_modification.description_string
              semanticLanguage = semanticLanguage.split('"')[1]
              // semanticLanguageContent = semanticLanguageContent.replaceAll('<cdl_instance_name>', instanceIdentifier)
              if (semanticLanguageKey === 'metadataLanguageDefinition' || semanticLanguageKey === 'naturalLanguageDefinition') {
                if (!(semanticLanguage in semantics)) {
                  semantics[semanticLanguage] = ''
                }
              } else if (semanticLanguageKey === 'metadataLanguage' || semanticLanguageKey === 'naturalLanguage') {
                if (semanticLanguage in semantics) {
                  semantics[semanticLanguage] = semantics[semanticLanguage] + semanticLanguageContent + '\n'
                } else {
                  semantics[semanticLanguage] = semanticLanguageContent + '\n'
                }
              }
            })
          }
        })
      }
    })
  }

  return semantics
}

module.exports.extractAllObjects = extractAllObjects
module.exports.extractAllSubSequences = extractAllSubSequences
module.exports.updateConnections = updateConnections
module.exports.updateRequiredReferences = updateRequiredReferences
module.exports.extractSemanticsFromAnnotations = extractSemanticsFromAnnotations
module.exports.parseModifications = parseModifications
