const Joi = require("joi");

const compensationSchema = Joi.alternatives().try(
  Joi.object({
    currency: Joi.string().trim().uppercase().required(),
    amount: Joi.number().positive().required(),
  }),
  Joi.string().custom((value, helpers) => {
    try {
      const parsed = JSON.parse(value);
      if (!parsed.currency || !parsed.amount) {
        return helpers.error("any.invalid");
      }
      return {
        currency: String(parsed.currency).toUpperCase(),
        amount: Number(parsed.amount),
      };
    } catch (error) {
      return helpers.error("any.invalid");
    }
  }, "JSON parsing for compensation")
);

const taskValidationSchema = Joi.object({
  title: Joi.string().trim().required(),
  taskType: Joi.string().valid("Web Development", "Design", "Review", "Writing").required(),
  description: Joi.string().trim().required(),
  location: Joi.string().valid("Remote", "Onsite").required(),
  deadline: Joi.date().iso().required(),
  noOfRespondents: Joi.number().integer().positive().required(),
  requirements: Joi.string().trim().required(),
  link1: Joi.string().uri().allow(null, ""),
  link2: Joi.string().uri().allow(null, ""),
  compensation: compensationSchema.optional(),
  additionalInfo: Joi.string().optional(),
});

module.exports = taskValidationSchema;