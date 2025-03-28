const express = require('express');
const { validation } = require('../middleware/auth');
const isTaskCreator = require('../middleware/isTaskCreator');
const { getAnalyticsOverview, getCompletedTasksOverTime, getPopularTasksAnalysis } = require('../controllers/analyticsControllers');

const route = express.Router();

route.get("/overview", validation, isTaskCreator, getAnalyticsOverview);
route.get("/tasks-over-time", validation, isTaskCreator, getCompletedTasksOverTime);
route.get("/popular-tasks", validation, isTaskCreator, getPopularTasksAnalysis);
route.get("/worker-engagement", validation, isTaskCreator,);
route.get("/task-duration", validation, isTaskCreator,);



module.exports = route;