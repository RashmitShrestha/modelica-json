'use strict'
//
// A compact reporter for a single spec file: one line per test, then a tally
// and a one line reason for each failure.
//
// The default spec reporter prints the whole assertion message and diff inline,
// which for this suite runs to hundreds of lines and buries the list of what
// actually passed. Here the list stays readable and the reasons are trimmed to
// their first line; run with `--reporter spec` when the full message is wanted.
//
const mocha = require('mocha')

const Base = mocha.reporters.Base
const {
  EVENT_SUITE_BEGIN,
  EVENT_SUITE_END,
  EVENT_TEST_PASS,
  EVENT_TEST_FAIL,
  EVENT_TEST_PENDING,
  EVENT_RUN_END
} = mocha.Runner.constants

// Longest first line worth showing next to a failure; the full message is one
// `--reporter spec` away.
const REASON_WIDTH = 100

class Summary extends Base {
  constructor (runner, options) {
    super(runner, options)

    let depth = 0
    const failures = []
    const pad = function () { return '  '.repeat(depth) }

    runner.on(EVENT_SUITE_BEGIN, function (suite) {
      // The root suite has no title and would print a blank line.
      if (suite.root) return
      console.log(pad() + suite.title)
      depth += 1
    })

    runner.on(EVENT_SUITE_END, function (suite) {
      if (!suite.root) depth -= 1
    })

    runner.on(EVENT_TEST_PASS, function (test) {
      console.log(pad() + Base.color('checkmark', '  ' + Base.symbols.ok) + ' ' + test.title)
    })

    runner.on(EVENT_TEST_FAIL, function (test) {
      failures.push(test)
      console.log(pad() + Base.color('fail', '  ' + Base.symbols.err + ' ' + test.title))
    })

    runner.on(EVENT_TEST_PENDING, function (test) {
      console.log(pad() + Base.color('pending', '  - ' + test.title))
    })

    runner.once(EVENT_RUN_END, function () {
      const stats = runner.stats
      console.log()
      console.log(Base.color('green', stats.passes + ' passing') + '  ' +
        Base.color('fail', stats.failures + ' failing') + '  ' +
        Base.color('pending', stats.pending + ' pending') +
        Base.color('light', '  (' + stats.duration + 'ms)'))

      if (failures.length === 0) return
      console.log()
      failures.forEach(function (test, i) {
        // Only the first line: the assertion messages in this suite carry a
        // full listing of every difference on the lines after it.
        const first = String(test.err && test.err.message).split('\n')[0]
        const reason = first.length > REASON_WIDTH ? first.slice(0, REASON_WIDTH - 1) + '…' : first
        // Parent suite only: the root title is the same on every line.
        console.log(Base.color('fail', '  ' + (i + 1) + ') ' + test.parent.title + ' > ' + test.title))
        console.log(Base.color('error message', '     ' + reason))
      })
    })
  }
}

module.exports = Summary
