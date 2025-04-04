const Joi = require("joi");

const inAppNotificationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).default(5)
});

module.exports = inAppNotificationSchema