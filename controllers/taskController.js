const mongoose = require("mongoose");
const { Task } = require("../models/Tasks");
const paginate = require("../utils/paginate");
const fs = require("fs");
const {
  createTaskValidationSchema,
  updateTaskValidationSchema
} = require("../validations/taskValidation");

const createTaskHandler = async (req, res) => {
  try {
    const taskCreatorId = req.user._id;
    const { error, value } = createTaskValidationSchema.validate(req.body, {
      abortEarly: false,
      allowUnknown: true,
    });
    if (error) {
      return res.status(400).json({ error: error.details.map((d) => d.message) });
    }

    let additionalInfo = req.file ? req.file.path : "";

    const task = await Task.create({
      userId: taskCreatorId,
      ...value,
      additionalInfo,
    });

    res.status(201).json({ status: true, message: "Task created successfully!", task });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// Update Task Handler
const updateTaskHandler = async (req, res) => {
  try {
    const { taskId } = req.params;
    const updateData = { ...req.body };

    const { error, value } = updateTaskValidationSchema.validate(updateData, { abortEarly: false });
    if (error) {
      return res.status(400).json({ status: false, errors: error.details.map((d) => d.message) });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ status: false, message: "Task not found" });
    }

    if (req.file) {
      if (task.additionalInfo) {
        try {
          fs.unlinkSync(task.additionalInfo);
        } catch (err) {
          console.error("File deletion error:", err.message);
        }
      }
      value.additionalInfo = req.file.path;
    }

    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      value,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Task updated successfully!",
      task: updatedTask,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" })
  }
};

const deleteTaskHandler = async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.taskId);
    if (!task) {
      return res.status(404).json({ status: false, message: "Task not found" });
    }

    res.status(200).json({
      success: true,
      message: "Task deleted successfully!",
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// Fetch all tasks handler
const getAllTasksHandler = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);
    const skip = (pageNumber - 1) * pageSize;

    const tasks = await Task.find({})
      .skip(skip)
      .limit(pageSize)
      .sort({ createdAt: -1 });
    const total = await Task.countDocuments({});
    
    return res.status(200).json({
      success: true,
      message: "Tasks fetched successfully!",
      data: tasks,
      pagination: paginate(total, page, limit),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    })
  }
};

// Fetch all tasks for logged in task creator handler
const getTaskCreatorTasksHandler = async (req, res) => {
  try {
    const userId = req.user._id;

    const tasks = await Task.find({ userId })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Tasks fetched successfully!",
      data: tasks,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    })
  }
};

module.exports = {
    createTaskHandler,
    updateTaskHandler,
    deleteTaskHandler,
    getAllTasksHandler,
    getTaskCreatorTasksHandler
}