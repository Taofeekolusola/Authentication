/*import express from "express";
import * as taskController from "../controllers/taskController.js"

const router = express.Router();

router.post("/tasks", taskController.createTask);  // Register a new task
router.get("/tasks", taskController.getAllTasks);  // Fetch all tasks
router.get("/tasks/search", taskController.searchTasks);  // Search tasks
router.patch("/tasks/:taskId", taskController.updateTaskStatus);  // Update task status


export default router;
*/

const express = require("express");
const route = express.Router();
const {
  createTaskHandler,
  updateTaskHandler,
  deleteTaskHandler,
  getAllTasksHandler,
  getTaskCreatorTasksHandler,
  searchTasksHandler,
} = require("../controllers/taskController");
const upload = require("../middleware/multer");
const isTaskCreator = require("../middleware/isTaskCreator");
const { validation } = require("../middleware/auth");

route.post("/create", validation, upload.array("files", 5), createTaskHandler);
route.put("/update/:taskId", validation, updateTaskHandler);
route.delete("/delete/:taskId", validation, deleteTaskHandler);
route.get("/all", validation, getAllTasksHandler);
route.get("/", validation, isTaskCreator, getTaskCreatorTasksHandler);
route.get('/search', validation,  searchTasksHandler)


module.exports = route;