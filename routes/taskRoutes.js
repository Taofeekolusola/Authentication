const express = require("express");
const route = express.Router();
const {
  getTaskCreatorDashboard,
  searchTasksHandler,
} = require("../controllers/taskController");
const upload = require("../middleware/multer");
const { validation } = require("../middleware/auth");



route.get('/search', validation,  searchTasksHandler)
route.get('/task-creator/dashboard', validation, getTaskCreatorDashboard)


module.exports = route;
