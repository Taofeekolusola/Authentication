const mongoose = require("mongoose");
const Task = require("../models/Tasks");


const createTaskHandler = async (req, res) => {
  try {
    const {
      title,
      requirements,
      description,
      compensation,
      noOfRespondents,
      deadline,
      link1,
      taskType,
      location,
      link2,
      additionalInfo, // Might be a JSON string or missing
    } = req.body;

    // Validate required fields
    if (!title || !description || !requirements || !deadline || !compensation || !taskType || !location) {
      return res.status(400).json({ error: "Missing required field." });
    }
  
    // Validate compensation format
    let parsedCompensation;
    try {
      parsedCompensation = typeof compensation === "string" ? JSON.parse(compensation) : compensation;
      if (!parsedCompensation.currency || !parsedCompensation.amount) {
        return res.status(400).json({ error: "Invalid compensation format." });
      }
      parsedCompensation = {
        currency: parsedCompensation.currency.toUpperCase(),
        amount: Number(parsedCompensation.amount),
      };
    } catch (error) {
      return res.status(400).json({ error: "Invalid JSON format in compensation." });
    }

    let additionalInfoArray = [];

    // ✅ Ensure `req.files` are properly stored
    if (req.files && req.files.length > 0) {
      additionalInfoArray.push(
        ...req.files.map((file) => ({ type: "file", value: `/uploads/${file.filename}` }))
      );
    }

    // ✅ Ensure `additionalInfo` is parsed properly
    if (additionalInfo) {
      try {
        const parsedAdditionalInfo = JSON.parse(additionalInfo);
        if (Array.isArray(parsedAdditionalInfo)) {
          additionalInfoArray.push(...parsedAdditionalInfo);
        } else {
          return res.status(400).json({ error: "additionalInfo must be an array." });
        }
      } catch (error) {
        return res.status(400).json({ error: "Invalid JSON format in additionalInfo." });
      }
    }

    const task = await Task.create({
      title,
      description,
      link1,
      taskType,
      deadline,
      noOfRespondents,
      compensation: parsedCompensation,
      link2,
      additionalInfo: additionalInfoArray,
      location,
      requirements,
    });

    res.status(201).json({ success: true, message: "Task created successfully!", task });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};


// const createTaskHandler = async (req, res) => {
//   try {
//     console.log("Received request:", req.body);
//     console.log("Uploaded files:", req.files);

//     const {
//       title,
//       requirements,
//       description,
//       compensation,
//       noOfRespondents,
//       deadline,
//       link1,
//       taskType,
//       location,
//       link2,
//       additionalInfo,
//     } = req.body;

//     // Validate required fields
//     if (!title || !description || !requirements || !deadline || !compensation || !taskType || !location) {
//       return res.status(400).json({ error: "Missing required field." });
//     }

//     // Parse and validate compensation JSON
//     let parsedCompensation;
//     try {
//       parsedCompensation = typeof compensation === "string" ? JSON.parse(compensation) : compensation;
//       if (!parsedCompensation.currency || !parsedCompensation.amount) {
//         return res.status(400).json({ error: "Invalid compensation format." });
//       }
//       parsedCompensation = {
//         currency: parsedCompensation.currency.toUpperCase(),
//         amount: Number(parsedCompensation.amount),
//       };
//     } catch (error) {
//       return res.status(400).json({ error: "Invalid JSON format in compensation." });
//     }

//     // Handle additionalInfo (both JSON data and file uploads)
//     let additionalInfoArray = [];

//     // Handle uploaded files
//     if (req.files && req.files.additionalInfoFile) {
//       req.files.additionalInfoFile.forEach((file) => {
//         additionalInfoArray.push({ type: "file", value: `/uploads/${file.filename}` });
//       });
//     }

//     // Handle additionalInfo JSON
//     if (additionalInfo) {
//       try {
//         const parsedAdditionalInfo = JSON.parse(additionalInfo);
//         if (Array.isArray(parsedAdditionalInfo)) {
//           additionalInfoArray = [...additionalInfoArray, ...parsedAdditionalInfo];
//         } else {
//           return res.status(400).json({ error: "Invalid additionalInfo format. Must be an array." });
//         }
//       } catch (error) {
//         return res.status(400).json({ error: "Invalid additionalInfo JSON format." });
//       }
//     }

//     // Create the task
//     const task = await Task.create({
//       title,
//       description,
//       link1,
//       taskType,
//       deadline,
//       noOfRespondents,
//       compensation: parsedCompensation,
//       link2,
//       additionalInfo: additionalInfoArray,
//       location,
//       requirements,
//     });

//     res.status(201).json({ success: true, message: "Task created successfully!", task });
//   } catch (error) {
//     console.error("Error:", error);
//     res.status(500).json({ message: "Internal Server Error", error: error.message });
//   }
// };

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
    getAllTasksHandler,
}