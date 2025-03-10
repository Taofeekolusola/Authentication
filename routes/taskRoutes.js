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

route.post("/create", validation, upload.array("files", 5), createTaskHandler);
route.put("/update/:taskId", validation, updateTaskHandler);
route.delete("/delete/:taskId", validation, deleteTaskHandler);
route.get("/all", validation, getAllTasksHandler);
route.get("/", validation, isTaskCreator, getTaskCreatorTasksHandler);


module.exports = route;
