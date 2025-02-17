const multer = require("multer");
const express = require("express");
const route = express.Router();

const {
  createTaskHandler,
  updateTaskHandler,
  deleteTaskHandler,
  getAllTasksHandler,
} = require("../controllers/taskController");

// ✅ Define Multer Storage Once
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// ✅ Use the Correct Middleware
route.post("/create", upload.array("files", 5), createTaskHandler);
route.put("/update/:taskId", updateTaskHandler);
route.delete("/delete/:taskId", deleteTaskHandler);
route.get("/all", getAllTasksHandler);

module.exports = route;
