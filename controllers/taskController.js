const mongoose = require("mongoose");
const multer = require("multer");
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

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Store files in uploads/ directory
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`); // Unique filenames
  },
});
const upload = multer({ storage });

// Task creation handler
const createTaskHandler = async (req, res) => {
  try {
    const {
      title,
      requirements,
      description,
      compensation,
      deadline,
      link1,
      taskType,
      location,
      link2,
      additionalInfo, // Fetch additionalInfo directly
    } = req.body;

    // Validate required fields
    if (!title || !description || !requirements || !taskType || !location || !deadline) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!compensation || typeof compensation !== "object" || !compensation.currency || !compensation.amount) {
      return res.status(400).json({ error: "Invalid compensation format. It should be an object with currency and amount." });
    }

    const parsedCompensation = {
      currency: compensation.currency.toUpperCase(),
      amount: Number(compensation.amount),
    };

    let additionalInfoArray = [];

    // If a file was uploaded, store it in additionalInfo
    if (req.file) {
      additionalInfoArray.push({
        type: "file",
        value: `/uploads/${req.file.filename}`,
      });
    }

    // Handle additionalInfo correctly
    if (additionalInfo) {
      try {
        let parsedAdditionalInfo = additionalInfo;

        // If additionalInfo is a string, parse it
        if (typeof additionalInfo === "string") {
          parsedAdditionalInfo = JSON.parse(additionalInfo);
        }

        // Ensure additionalInfo is an array of objects
        if (Array.isArray(parsedAdditionalInfo) && parsedAdditionalInfo.every(item => item.type && item.value)) {
          additionalInfoArray = [...additionalInfoArray, ...parsedAdditionalInfo];
        } else {
          return res.status(400).json({ error: "Invalid additionalInfo format. Must be an array of objects with 'type' and 'value' fields." });
        }
      } catch (error) {
        return res.status(400).json({ error: "Invalid additionalInfo format. Must be valid JSON." });
      }
    }

    // Create the task
    const task = await Task.create({
      title,
      description,
      link1,
      taskType,
      deadline,
      compensation: parsedCompensation,
      link2,
      additionalInfo: additionalInfoArray,
      location,
      requirements,
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
    });
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

// Fetch all tasks handler
const getAllTasksHandler = async (req, res) => {
  try {
    const tasks = await Task.find({});
    res.status(200).json({
      success: true,
      message: "Tasks fetched successfully!",
      tasks,
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
    upload,
    getAllTasksHandler,
}