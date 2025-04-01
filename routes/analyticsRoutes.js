const express = require('express');
const { validation } = require('../middleware/auth');
const isTaskCreator = require('../middleware/isTaskCreator');
const { getAnalyticsOverview, getCompletedTasksOverTime, getPopularTasksAnalysis, getWorkerEngagement, getAverageTaskDuration } = require('../controllers/analyticsControllers');

const route = express.Router();

route.get("/overview", validation, isTaskCreator, getAnalyticsOverview);
route.get("/tasks-over-time", validation, isTaskCreator, getCompletedTasksOverTime);
route.get("/popular-tasks", validation, isTaskCreator, getPopularTasksAnalysis);
route.get("/worker-engagement", validation, isTaskCreator, getWorkerEngagement);
route.get("/task-duration", validation, isTaskCreator, getAverageTaskDuration);



module.exports = route;