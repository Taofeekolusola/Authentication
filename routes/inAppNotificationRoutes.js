const express = require('express');
const { validation } = require('../middleware/auth');
const isTaskEarner = require('../middleware/isTaskEarner');
const { getNotifications } = require('../controllers/inAppNotificationController');

const route = express.Router();

route.get("/", validation, getNotifications);

module.exports = route;