const express = require("express");
const route = express.Router();

const {
  createTaskHandler,
  updateTaskHandler,
  deleteTaskHandler,
  getAllTasksHandler,
} = require("../controllers/taskController");
const upload = require("../middleware/multer");

// ✅ Use the Correct Middleware
route.post("/create", upload.array("files", 5), createTaskHandler);
route.put("/update/:taskId", updateTaskHandler);
route.delete("/delete/:taskId", deleteTaskHandler);
route.get("/all", getAllTasksHandler);

module.exports = route;
