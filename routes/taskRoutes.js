const express = require("express");
const route = express.Router();
const {
  createTaskHandler,
  updateTaskHandler,
  deleteTaskHandler,
  getAllTasksHandler,
  getTaskCreatorTasksHandler,
  searchAllTasksHandler,
  postTaskHandler,
  getTaskCreatorDashboard,
  generateTaskReportPDF
} = require("../controllers/taskController");
const upload = require("../middleware/multer");
const isTaskCreator = require("../middleware/isTaskCreator");
const { validation } = require("../middleware/auth");
const isTaskEarner = require("../middleware/isTaskEarner");
const {
  createTaskApplication,
  updateReviewStatus,
  updateEarnerStatus,
  fetchAllApplicationsEarner,
  fetchAllApplicationsCreator
} = require("../controllers/taskApplicationController");
const isApplicationOwner = require("../middleware/isApplicationOwner");
const isTaskOwner = require("../middleware/isTaskOwner");
const taskOwner = require("../middleware/taskOwner");



// Tasks Routes
route.post("/", validation, isTaskCreator, upload.single('addInfo'), createTaskHandler);
route.patch("/:taskId", validation, isTaskCreator, taskOwner, upload.single('addInfo'), updateTaskHandler);
route.delete("/:taskId", validation, isTaskCreator, taskOwner, deleteTaskHandler);
route.get("/all", validation, isTaskEarner, getAllTasksHandler);
route.get("/", validation, isTaskCreator, getTaskCreatorTasksHandler);
route.get('/task-creator/dashboard', validation, getTaskCreatorDashboard);

// Search for available tasks (earner)
route.post("/search", validation, isTaskEarner, searchAllTasksHandler);

// Post an already created task (creator)
route.patch("/:taskId/post", validation, isTaskCreator, taskOwner, postTaskHandler);

route.get("/generateTaskReportPDF", validation, generateTaskReportPDF);

// Task Applications Routes

// Apply for a task (earner)
route.post("/:taskId/applications", validation, isTaskEarner, createTaskApplication);

// Update the status of a task (earner)
route.patch("/:taskId/applications/:appId/status", validation, isTaskEarner, isApplicationOwner, updateEarnerStatus);

// Update the review status of a task (creator)
// Note: This only works when task has been set to completed by earner
route.patch("/:taskId/applications/:appId/review", validation, isTaskCreator, isTaskOwner, updateReviewStatus);

// Get all task applications for a earner
route.post("/applications/earner", validation, isTaskEarner, fetchAllApplicationsEarner);

//Get all task applications for a creator
route.post("/applications/creator", validation, isTaskCreator, fetchAllApplicationsCreator);


module.exports = route;
