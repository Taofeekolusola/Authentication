const mongoose = require("mongoose");
const { Task } = require("../models/Tasks");
const  User = require('../models/Users');
//const taskService = require("../services/taskServices")
const paginate = require("../utils/paginate");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const { generateEarningsPDF } = require('../services/pdfService');

const {
  createTaskValidationSchema,
  updateTaskValidationSchema,
  searchTasksSchema
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
    const tasks = await Task.find({ visibility: "Published" })
      .skip(skip)
      .limit(pageSize)
      .sort({ createdAt: -1 });
    const total = await Task.countDocuments({ visibility: "Published" });
    
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

const searchAllTasksHandler = async (req, res) => {
  try {
    const { error, value } = searchTasksSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        error: error.details.map((detail) => detail.message),
      });
    }

    const {
      page,
      limit,
      datePosted,
      taskType,
      search,
      minApplications,
      maxApplications,
      minPay,
      maxPay,
    } = value;

    const skip = (page - 1) * limit;

    let filters = { visibility: "Published" };

    if (datePosted) {
      filters.postedAt = { $gte: new Date(datePosted) };
    }

    if (taskType) {
      filters.taskType = taskType;
    }

    if (search) {
      filters.title = { $regex: search, $options: "i" };
    }

    if (minApplications || maxApplications) {
      filters.noOfRespondents = {};
      if (minApplications) filters.noOfRespondents.$gte = minApplications;
      if (maxApplications) filters.noOfRespondents.$lte = maxApplications;
    }

    if (minPay || maxPay) {
      filters["compensation.amount"] = {}
      if (minPay) filters["compensation.amount"].$gte = minPay;
      if (maxPay) filters["compensation.amount"].$lte = maxPay;
    }

    const tasks = await Task.find(filters)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Task.countDocuments(filters);

    return res.status(200).json({
      success: true,
      message: "Tasks fetched successfully!",
      data: tasks,
      pagination: paginate(total, page, limit),
    });

  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Fetch all tasks handler
const postTaskHandler = async (req, res) => {
  try { 
    const { taskId } = req.params;    
    const task = await Task.findOneAndUpdate(
      { _id: taskId },
      { visibility: "Published", postedAt: new Date() },
      { new: true }
    );
    
    return res.status(200).json({
      success: true,
      message: "Task posted successfully!",
      data: task,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// //Get all tasks where status is completed
// const getCompletedTasksHandler = async (req, res) => {
//   try {
//     const tasks = await Task.find({ status: "completed" });
//     res.status(200).json({
//       success: true,
//       message: "Completed tasks fetched successfully!",
//       tasks,
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: "Internal Server Error",
//       error: error.message,
//     })
//   }
// };

//Get the amount spent by the task creator
const getTaskCreatorAmountSpentHandler = async (req, res) => {
  const { taskId } = req.params;
  try {
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json("Invalid Task ID");
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json("Task not found");
    }

    const amountSpent = task.compensation.amount;
    res.status(200).json({
      success: true,
      message: "Amount spent by the task creator successfully!",
      amountSpent,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// Get all available tasks
const getAvailableTasksHandler = async (req, res) => {
  try {
    const tasks = await Task.find({ status: "available" });
    res.status(200).json({
      success: true,
      message: "Available tasks fetched successfully!",
      tasks,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// Get all tasks in progress
const getInProgressTasksHandler = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Count tasks where earnerStatus is "In Progress"
    const inProgressCount = await TaskApplication.countDocuments({
      earnerId: userId,
      earnerStatus: "In Progress",
    });

    res.json({ inProgressCount });
  } catch (error) {
    console.error("Error fetching in-progress tasks:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

//Completed Tasks
const getCompletedTasksHandler = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Count tasks where earnerStatus is "Completed"
    const completedCount = await TaskApplication.countDocuments({
      earnerId: userId,
      earnerStatus: "Completed",
    });

    res.json({ completedCount });
  } catch (error) {
    console.error("Error fetching completed tasks:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


const getTaskCreatorDashboard = async (req, res) => { try { const { userId } = req.query;
if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
  return res.status(400).json({ error: "Invalid user ID", details: "Must provide a valid MongoDB ObjectId" });
}

const tasks = await Task.find({ userId });
const totalSpent = tasks.reduce((sum, task) => sum + (task.compensation || task.amount || 0), 0);

const wipTasks = await Task.find({ userId, status: 'In Progress' }).select('-__v');

const taskCompleted = await Task.countDocuments({
  userId: new mongoose.Types.ObjectId(userId),
  completedAt: { $exists: true }
});


res.json({
  userId,
  totalSpent,
  currency: "USD",
  numberOfTasks: tasks.length,
  wipTasks: {
    count: wipTasks.length,
    tasks: wipTasks
  },
  taskCompleted,
  metric: "tasks",
  timestamp: new Date().toISOString()
});


} catch (error) {
   console.error(`[GET /tasks/dashboard] Error: ${error.message}`);
    res.status(500).json({ 
      error: "Failed to fetch task creator dashboard.", 
      systemMessage: process.env.NODE_ENV === 'development' ? error.message : undefined, 
      timestamp: new Date().toISOString() 
    }); 
  } 
};

const getTaskReport = async (userId, range) => {
  let dateFilter = {};

  switch (range) {
    case 'today':
      dateFilter = { completedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } };
      break;
    case '7days':
      dateFilter = { completedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } };
      break;
    case '30days':
      dateFilter = { completedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } };
      break;
    case 'all':
    default:
      break;
  }


  const tasks = await Task.find({ userId, status: 'Completed', ...dateFilter });
  const totalEarnings = tasks.reduce((sum, task) => sum + (task.compensation || 0), 0);


  return {
    timeRange: range,
    totalTasks: tasks.length,
    totalEarnings,
    currency: "USD",
    tasks, // Optional: Include task details if needed
  };
};


const getTaskChartData = async (userId, timeframe) => {
  let groupFormat, dateSubtract;


  switch (timeframe) {
    case 'weekly':
      groupFormat = "%Y-%U"; // Year-Week
      dateSubtract = 12 * 7 * 24 * 60 * 60 * 1000; // 12 weeks
      break;
    case 'monthly':
      groupFormat = "%Y-%m"; // Year-Month
      dateSubtract = 12 * 30 * 24 * 60 * 60 * 1000; // 12 months
      break;
    default: // Daily
      groupFormat = "%Y-%m-%d";
      dateSubtract = 30 * 24 * 60 * 60 * 1000; // 30 days
  }

  if (!mongoose.Types.ObjectId.isValid(userId))
  {
    throw new Error("Invalid userId fromat");
  }


  const chartData = await Task.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        status: 'Completed',
        completedAt: { $gte: new Date(Date.now() - dateSubtract) },
      },
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: groupFormat, date: "$completedAt" } },
        },
        earnings: { $sum: "$compensation" },
        taskCount: { $sum: 1 },
      },
    },
    { $sort: { "_id.date": 1 } },
  ]);


  return chartData.map(item => ({
    date: item._id.date,
    earnings: item.earnings,
    taskCount: item.taskCount,
  }));
};


const fetchUser = async (userId) => {
  try {
    return await User.findById(userId);
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
}

const generateTaskReportPDF = async (req, res) => {
  try {
    const { userId, range = 'all' } = req.query;


    // Validate user existence
    const user = await fetchUser(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }


    // Get report and chart data
    const report = await getTaskReport(userId, range);
    const chartData = await getTaskChartData(userId, range === '30days' ? 'daily' : 'weekly');


    // Generate PDF
    const pdfData = { ...report, chartData };
    const { filePath, filename } = await generateEarningsPDF(pdfData, user);


    // Set response headers and stream PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    fs.createReadStream(filePath).pipe(res);


  } catch (error) {
    console.error("PDF generation error:", error);
    res.status(500).json({ error: "PDF generation failed" });
  }
};


// Export Handlers
module.exports = {
  createTaskHandler,
  updateTaskHandler,
  deleteTaskHandler,
  getAllTasksHandler,
  getCompletedTasksHandler,
  getTaskCreatorAmountSpentHandler,
  getTaskCreatorTasksHandler,
  getAvailableTasksHandler,
  getInProgressTasksHandler,
  searchAllTasksHandler,
  postTaskHandler,
  getTaskCreatorDashboard,
  generateTaskReportPDF,
};


