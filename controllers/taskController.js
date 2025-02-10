const mongoose = require("mongoose");
const Task = require("../models/Tasks");

// Create Task Handler
const createTaskHandler = async (req, res, next) => {
  const { title, description, createdBy, type, platform, amount, assignedTo } = req.body;

  try {
    // Validate required fields
    if (!title || !description || !createdBy || !type || !platform || !amount || assignedTo === undefined) {
      res.status(400).json("Missing required fields");
    }

    // Validate the `createdBy` field as a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(createdBy)) {
      res.status(400).json("Invalid user ID");
    }

    const task = await Task.create({
      title,
      description,
      createdBy: new mongoose.Types.ObjectId(createdBy),
      type,
      platform,
      amount,
      assignedTo,
    });

    res.status(201).json({
      success: true,
      message: "Task created successfully!",
      task,
    });
  } catch (error) {
    next(error);
  }
};

// Update Task Handler
const updateTaskHandler = async (req, res, next) => {
  const { taskId } = req.params;
  const updatedData = req.body;
  try {
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      res.status.json(400).json("Invalid Task ID");
    }

    const task = await Task.findById(taskId);
    if (!task) {
      res.status(404).json("Task not found");
    }

    await task.updateOne(updatedData);
    res.status(200).json({
      success: true,
      message: "Task updated successfully!",
      task: { ...task.toObject(), ...updatedData },
    });
  } catch (error) {
    next(error);
  }
};

// Delete Task Handler
const deleteTaskHandler = async (req, res, next) => {
  const { taskId } = req.params;
  try {
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      res.status(400).json("Invalid Task ID");
    }

    const task = await Task.findById(taskId);
    if (!task) {
      res.status(404).json("Task not found");
    }

    await task.deleteOne();
    res.status(200).json({
      success: true,
      message: "Task deleted successfully!",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
    createTaskHandler,
    updateTaskHandler,
    deleteTaskHandler,
}