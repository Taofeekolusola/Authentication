const Joi = require('joi');

const earningsRangeQuerySchema = Joi.object({
  range: Joi.string()
    .valid('7d', '30d', 'today', '1y')
    .required()
    .messages({
      'any.only': 'Range must be one of: 7d, 30d, today, 1y',
      'string.base': 'Range must be a string',
      'any.required': 'Range is required',
    }),
});

module.exports = { earningsRangeQuerySchema }