function parse (content, rawJson = false) {
  const util = require('util')

  let moOutput = ''
  if (content.not != null) {
    moOutput += 'not '
  }
  if (content.arithmetic_expressions) {

    // content comes in two shapes: 
    // either a bare string when none of the terms are structured
    // or an object carrying a name property
    // depending on the shape and the type of file that the expression is in
 
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
