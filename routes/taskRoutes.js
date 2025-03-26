const express = require("express");
const route = express.Router();
const {
  createTaskHandler,
  updateTaskHandler,
  deleteTaskHandler,
  getAllTasksHandler,
  getTaskCreatorTasksHandler,
  getCompletedTasksHandler,
  getTaskCreatorAmountSpentHandler,
  getAvailableTasksHandler,
  getInProgressTasksHandler,
  getTaskApplicationsHandler,
} = require("../controllers/taskController");
const upload = require("../middleware/multer");
const isTaskCreator = require("../middleware/isTaskCreator");
const { validation } = require("../middleware/auth");
const isTaskEarner = require("../middleware/isTaskEarner");
const { createTaskApplication, updateReviewStatus, updateEarnerStatus, fetchAllApplicationsEarner, fetchAllApplicationsCreator } = require("../controllers/taskApplicationController");
const isApplicationOwner = require("../middleware/isApplicationOwner");
const isTaskOwner = require("../middleware/isTaskOwner");

route.post("/create", validation, upload.array("files", 5), createTaskHandler);
route.put("/update/:taskId", validation, updateTaskHandler);
route.delete("/delete/:taskId", validation, deleteTaskHandler);
route.get("/all", validation, getAllTasksHandler);
route.get("/", validation, isTaskCreator, getTaskCreatorTasksHandler);
route.get("/completed", validation, isTaskEarner, getCompletedTasksHandler);
route.get("/inProgress", validation, isTaskEarner, getInProgressTasksHandler);

// Task Applications

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
