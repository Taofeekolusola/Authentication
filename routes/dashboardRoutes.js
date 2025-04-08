const express = require("express");
const { validation } = require("../middleware/auth");
const isTaskEarner = require("../middleware/isTaskEarner");
const { earnerDashboardHandler, getEarningsOverTimeJSON, generateEarningsPDF } = require("../controllers/dashboardController");
const route = express.Router();

// Dashboard Routes
route.get('/overview/earner', validation, isTaskEarner, earnerDashboardHandler);
route.get('/earnings', validation, isTaskEarner, getEarningsOverTimeJSON);
route.get('/earnings/pdf', validation, isTaskEarner, generateEarningsPDF);

module.exports = route;