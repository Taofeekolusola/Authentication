const express = require("express");
const { validation } = require("../middleware/auth");
const isTaskEarner = require("../middleware/isTaskEarner");
const { earnerDashboardHandler, getEarningsOverTime } = require("../controllers/dashboardController");
const route = express.Router();

// Dashboard Routes
route.get('/overview/earner', validation, isTaskEarner, earnerDashboardHandler);
route.get('/earnings', validation, isTaskEarner, getEarningsOverTime);

module.exports = route;