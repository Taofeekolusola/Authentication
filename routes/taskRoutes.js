const express = require("express");
const route = express.Router();
const {
  createTaskHandler,
  updateTaskHandler,
  deleteTaskHandler,
  getAllTasksHandler,
  getTaskCreatorTasksHandler,
} = require("../controllers/taskController");
const upload = require("../middleware/multer");
const isTaskCreator = require("../middleware/isTaskCreator");
const { validation } = require("../middleware/auth");
const isTaskEarner = require("../middleware/isTaskEarner");
const { createTaskApplication, updateReviewStatus, updateEarnerStatus } = require("../controllers/taskApplicationController");
const isApplicationOwner = require("../middleware/isApplicationOwner");
const isTaskOwner = require("../middleware/isTaskOwner");

route.post("/create", validation, upload.array("files", 5), createTaskHandler);
route.put("/update/:taskId", validation, updateTaskHandler);
route.delete("/delete/:taskId", validation, deleteTaskHandler);
route.get("/all", validation, getAllTasksHandler);
route.get("/", validation, isTaskCreator, getTaskCreatorTasksHandler);

// Task Applications
route.post("/:taskId/applications", validation, isTaskEarner, createTaskApplication);
route.patch("/:taskId/applications/:appId/status", validation, isTaskEarner, isApplicationOwner, updateEarnerStatus);
route.patch("/:taskId/applications/:appId/review", validation, isTaskCreator, isTaskOwner, updateReviewStatus);


module.exports = route;
