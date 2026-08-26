function parse (content, rawJson = false) {
  const util = require('util')

  let moOutput = ''
  if (content.not != null) {
    moOutput += 'not '
  }
  if (content.arithmetic_expressions) {
    // arithmetic expression can be a string or an object with a name property
    const name = (expression) => {
      if (typeof expression === 'string') {
        return expression
      }
      return expression.name
    }

    moOutput += util.format('%s', name(content.arithmetic_expressions[0]))
    if (content.relation_operator) {
      moOutput += ' '
      moOutput += util.format('%s', content.relation_operator)
      moOutput += ' '
      moOutput += util.format('%s', name(content.arithmetic_expressions[1]))
    }
  }
  return moOutput
}

module.exports = { parse }
