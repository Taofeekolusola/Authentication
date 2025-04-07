const mongoose = require("mongoose");
const { Task } = require("../models/Tasks");
const  User = require('../models/Users');
const paginate = require("../utils/paginate");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const { generateEarningsPDF } = require('../services/pdfService');
const {TaskApplication}= require("../models/Tasks")
const { convertUsdToNgn, convertEurToNgn } = require("../helpers/helpers");

const {Wallet, ReserveWallet} = require("../models/walletModel");
const Transaction = require("../models/transactionModel");


const {
  createTaskValidationSchema,
  updateTaskValidationSchema,
  searchTasksSchema
} = require("../validations/taskValidation");
const { paginationQuerySchema } = require("../validations/paginationValidation");

// const createTaskHandler = async (req, res) => {
//   try {
//     const taskCreatorId = req.user._id;
//     const { error, value } = createTaskValidationSchema.validate(req.body, {
//       abortEarly: false,
//       allowUnknown: true,
//     });
//     if (error) {
//       return res.status(400).json({ error: error.details.map((d) => d.message) });
//     }

//     let additionalInfo = req.file ? req.file.path : "";

//     const task = await Task.create({
//       userId: taskCreatorId,
//       ...value,
//       additionalInfo,
//     });

//     res.status(201).json({ status: true, message: "Task created successfully!", task });
//   } catch (error) {
//     res.status(500).json({ message: "Internal Server Error", error: error.message });
//   }
// };


// Create Task Handler
const createTaskHandler = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction(); // Start atomic transaction

  try {
    const taskCreatorId = req.user._id;
    const { error, value } = createTaskValidationSchema.validate(req.body, {
      abortEarly: false,
      allowUnknown: true,
    });

    if (error) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: error.details.map((d) => d.message) });
    }

    const { compensation } = value;

    // Validate TaskCreator Wallet Balance
    const creatorWallet = await Wallet.findOne({ userId: taskCreatorId }).session(session);
    if (!creatorWallet) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: "Wallet not found for TaskCreator" });
    }

    let convertedAmount;

    if (compensation.currency === "USD") {
      convertedAmount = await convertUsdToNgn(compensation.amount);
    } else if (compensation.currency === "EUR") {
      convertedAmount = await convertEurToNgn(compensation.amount);
    } else {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: "Invalid currency. Only USD & EUR are accepted." });
    }

    if (creatorWallet.balance < convertedAmount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: "Insufficient balance to create task" });
    }

    // Deduct TaskCreator's balance & move funds to ReserveWallet
    creatorWallet.balance -= convertedAmount;

    // Save Transaction
    const [transaction] = await Transaction.create(
      [
        {
          userId: taskCreatorId,
          email: creatorWallet.email,
          amount: convertedAmount,
          currency: "NGN",
          method: "in-app",
          paymentType: "debit",
          status: "successful",
          reference: `REF_${Date.now()}-altB`,
        },
      ],
      { session }
    );

    creatorWallet.transactions.push(transaction._id);
    await creatorWallet.save({ session });

    let additionalInfo = req.file ? req.file.path : "";

    // Create Task
    const [task] = await Task.create(
      [
        {
          userId: taskCreatorId,
          ...value,
          additionalInfo,
        },
      ],
      { session }
    );

    // Create ReserveWallet Entry
    await ReserveWallet.create(
      [
        {
          taskId: task._id,
          taskCreatorId,
          amount: convertedAmount,
        },
      ],
      { session }
    );

    await session.commitTransaction(); // Commit the transaction
    session.endSession();

    return res.status(201).json({
      status: true,
      message: "Task created successfully!",
      task,
    });
  } catch (error) {
    await session.abortTransaction(); // Rollback transaction on error
    session.endSession();
    console.error("Create Task Error:", error);
    
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
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
    const { error, value } = paginationQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { page = 1, limit = 10 } = value;    
    const skip = (page - 1) * limit;

    const tasks = await Task.find({ visibility: "Published" })
      .skip(skip)
      .limit(limit)
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
    })
  }
};

// Fetch all tasks for logged in task creator handler
const getTaskCreatorTasksHandler = async (req, res) => {
  try {
    const { error, value } = paginationQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { page, limit } = value;
    const userId = req.user._id;
    const skip = (page - 1) * limit;
  
    const tasks = await Task.find({ userId, visibility: "Published" })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    const total = await Task.countDocuments({ userId, visibility: "Published" });

    return res.status(200).json({
      success: true,
      message: "Tasks fetched successfully!",
      data: tasks,
      pagination: paginate(total, page, limit),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
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

const getTaskCreatorDashboard = async (req, res) => {
  try {
    const { userId, wipPage = 1, wipLimit = 5, chartRange = 'weekly' } = req.query;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID", details: "Must provide a valid MongoDB ObjectId" });
    }


    const creatorObjectId = new mongoose.Types.ObjectId(userId);


    const result = await Task.aggregate([
      { $match: { userId: creatorObjectId } },
      {
        $lookup: {
          from: "taskapplications",
          localField: "_id",
          foreignField: "taskId",
          as: "applications"
        }
      },
      {
        $addFields: {
          approvedCompletions: {
            $filter: {
              input: "$applications",
              as: "app",
              cond: {
                $and: [
                  { $eq: ["$$app.earnerStatus", "Completed"] },
                  { $eq: ["$$app.reviewStatus", "Approved"] }
                ]
              }
            }
          },
          inProgressApps: {
            $filter: {
              input: "$applications",
              as: "app",
              cond: { $eq: ["$$app.earnerStatus", "In Progress"] }
            }
          },
          cancelledApps: {
            $filter: {
              input: "$applications",
              as: "app",
              cond: { $eq: ["$$app.earnerStatus", "Cancelled"] }
            }
          }
        }
      },
      {
        $group: {
          _id: "$userId",
          totalSpent: {
            $sum: {
              $multiply: [
                { $size: "$approvedCompletions" },
                { $ifNull: ["$compensation.amount", 0] }
              ]
            }
          },
          totalTasks: { $sum: 1 },
          inProgressTasks: { $sum: { $cond: [{ $gt: [{ $size: "$inProgressApps" }, 0] }, 1, 0] } },
          completedTasks: { $sum: { $cond: [{ $gt: [{ $size: "$approvedCompletions" }, 0] }, 1, 0] } },
          cancelledTasks: { $sum: { $cond: [{ $gt: [{ $size: "$cancelledApps" }, 0] }, 1, 0] } }
        }
      }
    ]);


    const {
      totalSpent = 0,
      totalTasks = 0,
      inProgressTasks = 0,
      completedTasks = 0,
      cancelledTasks = 0
    } = result[0] || {};


    // Paginate WIP tasks
    const skip = (parseInt(wipPage) - 1) * parseInt(wipLimit);
    const wipTasksQuery = await Task.find({ userId, status: 'In Progress' })
      .skip(skip)
      .limit(parseInt(wipLimit))
      .select('-__v');


    const wipTotalCount = await Task.countDocuments({ userId, status: 'In Progress' });


    // Profile completion
    const profileCompletion = await getProfileCompletion(userId);


    // Report
    const report = await getTaskReport(userId, 'all');


    // Chart
    const chartData = await getTaskChartData(userId, chartRange);


    res.json({
      userId,
      totalSpent,
      currency: "USD",
      numberOfTasks: totalTasks,
      inProgressTasks,
      completedTasks,
      cancelledTasks,
      profileCompletion: profileCompletion.toFixed(1) + "%",
      report,
      chartData,
      wipTasks: {
        currentPage: parseInt(wipPage),
        totalPages: Math.ceil(wipTotalCount / parseInt(wipLimit)),
        count: wipTasksQuery.length,
        total: wipTotalCount,
        tasks: wipTasksQuery
      },
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

const getProfileCompletion = async (userId) => {
  try{
    const creator = await User.findById(userId, "userImageUrl firstName lastName bio languages expertise location");
    const profileFields = ["userImageUrl", "firstName", "lastName", "bio", "languages", "expertise", "location"];
    const filledFields = profileFields.filter((field) => creator[field]);
    const profileCompletion = (filledFields.length / profileFields.length) * 100;
    return profileCompletion;
  }
  catch (error) {
    console.error(error);
  }
}

const getTaskReport = async (userId, range = 'all', options = {}) => {
  const { includeTasks = false, status = 'Completed' } = options;
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
    case 'custom':
      if (options.start && options.end) {
        dateFilter = { completedAt: { $gte: new Date(options.start), $lte: new Date(options.end) } };
      }
      break;
    case 'all':
    default:
      break;
  }

  const query = {
    userId,
    ...(status && { status }),
    ...dateFilter
  };

  const tasks = await Task.find(query);
  const totalEarnings = tasks.reduce((sum, task) => sum + (task.compensation || 0), 0);

  return {
    timeRange: range,
    totalTasks: tasks.length,
    totalEarnings,
    currency: "USD",
    ...(includeTasks && { tasks })
  };
};

const getTaskChartData = async (userId, timeframe = 'weekly', options = {}) => {
  let groupFormat, dateSubtract;
  const { status = 'Completed' } = options;


  switch (timeframe) {
    case 'weekly':
      groupFormat = "%Y-%U"; // Year-Week
      dateSubtract = 12 * 7 * 24 * 60 * 60 * 1000;
      break;
    case 'monthly':
      groupFormat = "%Y-%m";
      dateSubtract = 12 * 30 * 24 * 60 * 60 * 1000;
      break;
    case 'daily':
    default:
      groupFormat = "%Y-%m-%d";
      dateSubtract = 30 * 24 * 60 * 60 * 1000;
  }


  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid userId format");
  }


  const chartData = await Task.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        ...(status && { status }),
        completedAt: { $gte: new Date(Date.now() - dateSubtract) }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: groupFormat, date: "$completedAt" } }
        },
        earnings: { $sum: "$compensation" },
        taskCount: { $sum: 1 }
      }
    },
    { $sort: { "_id.date": 1 } }
  ]);


  return chartData.map(item => ({
    date: item._id.date,
    earnings: item.earnings,
    taskCount: item.taskCount
  }));
};

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


