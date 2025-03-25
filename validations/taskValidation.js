const Joi = require("joi");

taskType = [
  "Web Development", "Design", "Review", "Writing",
  "Product", "Marketing", "Management", "Sales", 
  "Operations", "Engineering", "Other", "Development"
]
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

const createTaskValidationSchema = Joi.object({
  title: Joi.string().trim().required(),
  taskType: Joi.string().valid(...taskType).required(),
  description: Joi.string().trim().required(),
  location: Joi.string().valid("Remote", "Onsite").required(),
  deadline: Joi.date().iso().required(),
  noOfRespondents: Joi.number().integer().positive().required(),
  requirements: Joi.string().trim().required(),
  link1: Joi.string().uri().allow(null, ""),
  link2: Joi.string().uri().allow(null, ""),
  compensation: compensationSchema.optional(),
});

const updateTaskValidationSchema = Joi.object({
  title: Joi.string().trim().optional(),
  taskType: Joi.string()
    .valid(...taskType)
    .optional(),
  description: Joi.string().trim().optional(),
  location: Joi.string().valid("Remote", "Onsite").optional(),
  deadline: Joi.date().iso().optional(),
  noOfRespondents: Joi.number().integer().positive().optional(),
  requirements: Joi.string().trim().optional(),
  link1: Joi.string().uri().allow(null, "").optional(),
  link2: Joi.string().uri().allow(null, "").optional(),
  compensation: compensationSchema.optional(),
});

const searchTasksSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).default(10),
  datePosted: Joi.date().iso(), 
  search: Joi.string().trim().allow(""),
  minApplications: Joi.number().integer().min(0),
  maxApplications: Joi.number().integer().min(0),
  minPay: Joi.number().min(0),
  maxPay: Joi.number().min(0),
  taskType: Joi.string().valid(...taskType),
});

module.exports = {
  createTaskValidationSchema,
  updateTaskValidationSchema,
  searchTasksSchema,
  taskType
}