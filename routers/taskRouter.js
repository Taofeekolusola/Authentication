import express from "express";
import * as taskController from "../controllers/taskController.js"

const router = express.Router();

router.post("/tasks", taskController.createTask);  // Register a new task
router.get("/tasks", taskController.getAllTasks);  // Fetch all tasks
router.get("/tasks/search", taskController.searchTasks);  // Search tasks
router.patch("/tasks/:taskId", taskController.updateTaskStatus);  // Update task status


export default router;
