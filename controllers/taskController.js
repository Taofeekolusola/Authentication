const mongoose = require("mongoose");
const Task = require("../models/Tasks");

// Create Task Handler
// const createTaskHandler = async (req, res) => {
//   const {
//     title,
//     requirements,
//     description,
//     compensation,
//     deadline,
//     additionalInfo,
//     createdBy,
//     type,
//     numberOfRespondents,
//     location,
//     assignedTo
//   } = req.body;

//   try {
//     // Validate required fields
//     if (!title || !description || !numberOfRespondents || !requirements || !type || !location || !additionalInfo || !deadline || !compensation || assignedTo === undefined) {
//       res.status(400).json("Missing required fields");
//     }

//     // Validate the `createdBy` field as a valid ObjectId
//     if (!mongoose.Types.ObjectId.isValid(createdBy)) {
//       res.status(400).json("Invalid user ID");
//     }

//     const match = compensation.match(/^([\$#])(\d+)$/); // Matches "$500" or "#500"
//     if (!match) {
//       return res.status(400).json("Invalid compensation format. Use '$500' or '#500'");
//     }

//     const [, currency, amount] = match;
//     const parsedCompensation = { currency, amount: Number(amount) };

//     const task = await Task.create({
//       title,
//       description,
//       createdBy: new mongoose.Types.ObjectId(createdBy),
//       type,
//       deadline,
//       compensation: parsedCompensation,
//       assignedTo,
//       additionalInfo,
//       numberOfRespondents,
//       location,
//       requirements
//     });

//     res.status(201).json({
//       success: true,
//       message: "Task created successfully!",
//       task,
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: "Internal Server Error",
//       error: error.message,
//     })
//   }
// };

const createTaskHandler = async (req, res) => {
  const {
    title,
    requirements,
    description,
    compensation,
    deadline,
    additionalInfo,
    link1,
    taskType,
    location,
    link2
  } = req.body;

  try {
    // Validate required fields
    if (!title || !description || !requirements || !taskType || !location || !additionalInfo || !deadline || !compensation || !link1 || !link2) {
      res.status(400).json("Missing required fields");
    }

    const match = compensation.match(/^(USD|EUR)(\d+)$/i); // Matches "USD500" or "EUR500"
if (!match) {
  return res.status(400).json("Invalid compensation format. Use 'USD500' or 'EUR500'");
}

const [, currency, amount] = match;
const parsedCompensation = { currency: currency.toUpperCase(), amount: Number(amount) };

    const task = await Task.create({
      title,
      description,
      link1,
      taskType,
      deadline,
      compensation: parsedCompensation,
      link2,
      additionalInfo,
      location,
      requirements
    });

    res.status(201).json({
      success: true,
      message: "Task created successfully!",
      task,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    })
  }
};

// Update Task Handler
const updateTaskHandler = async (req, res) => {
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
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    })
  }
};

// Delete Task Handler
const deleteTaskHandler = async (req, res) => {
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
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    })
  }
};

module.exports = {
    createTaskHandler,
    updateTaskHandler,
    deleteTaskHandler,
}