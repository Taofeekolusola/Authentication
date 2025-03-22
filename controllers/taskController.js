const mongoose = require("mongoose");
const { Task } = require("../models/Tasks");
const paginate = require("../utils/paginate");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

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


// Search tasks
 const searchTasksHandler = async (req, res) => {
  try {
    const { query } = req.query; // Get the search query

    if (!query) {
      return res.status(400).json({ status: "FAILED", message: "Search query is required" });
    }

    // Perform search (case insensitive)
    const tasks = await Task.find({
      $or: [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } }
      ]
    });

    if (tasks.length === 0) {
      return res.status(404).json({ status: "FAILED", message: "No tasks found" });
    }

    res.status(200).json({ status: "SUCCESS", data: tasks });

  } catch (error) {
    res.status(500).json({ status: "FAILED", message: "Error searching tasks", error: error.message });
  }
};

const getTaskCreatorDashboard = async (req, res) => {
  try {
    const { userId, exportPdf } = req.query;
    
    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }


    // Fetch all tasks created by the user
    const tasks = await Task.find({ userId });


    // Calculate Amount Spent
    const totalAmountSpent = tasks.reduce((sum, task) => sum + (task.compensation.amount || 0), 0);


    // Work In Progress (WIP) & Completed Tasks Count
    const workInProgressTasks = tasks.filter(task => task.status === "in-progress").length;
    const completedTasks = tasks.filter(task => task.status === "completed").length;


    // Spending Over Time (Graph Data & Task Earning Report)
    const spendingOverTime = {
      graphData: tasks.map(task => ({
        date: task.createdAt,
        amount: task.compensation.amount || 0,
      })),
      taskEarningReport: {
        allTime: totalAmountSpent,
        last30Days: tasks
          .filter(task => new Date(task.createdAt) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
          .reduce((sum, task) => sum + (task.compensation.amount || 0), 0),
        last7Days: tasks
          .filter(task => new Date(task.createdAt) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
          .reduce((sum, task) => sum + (task.compensation.amount || 0), 0),
        today: tasks
          .filter(task => new Date(task.createdAt).toDateString() === new Date().toDateString())
          .reduce((sum, task) => sum + (task.compensation.amount || 0), 0),
      },
    };


    // If exportPdf is requested, generate and return a PDF
    if (exportPdf === "true") {
      const exportsDir = path.join(__dirname, "../exports");


      // Ensure the "exports" directory exists
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
      }

      const pdfFileName = `spending_over_time_${userId}.pdf`;
      const pdfPath = path.join(exportsDir, pdfFileName);
      const doc = new PDFDocument();
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);


      // PDF Content
      doc.fontSize(18).text("Spending Over Time Report", { align: "center" }).moveDown();
      doc.fontSize(14).text(`Total Amount Spent: $${totalAmountSpent}`);
      doc.text(`Work In Progress Tasks: ${workInProgressTasks}`);
      doc.text(`Completed Tasks: ${completedTasks}`).moveDown();
      doc.text("Task Earning Report:");
      doc.text(`All Time: $${spendingOverTime.taskEarningReport.allTime}`);
      doc.text(`Last 30 Days: $${spendingOverTime.taskEarningReport.last30Days}`);
      doc.text(`Last 7 Days: $${spendingOverTime.taskEarningReport.last7Days}`);
      doc.text(`Today: $${spendingOverTime.taskEarningReport.today}`).moveDown();
      doc.text("Spending Over Time Graph Data:");
      spendingOverTime.graphData.forEach(entry => {
        doc.text(`Date: ${entry.date.toISOString().split("T")[0]}, Amount: $${entry.amount}`);
      });


      doc.end();


      // Wait for PDF to be created before sending response
      stream.on("finish", () => {
        const pdfUrl = `http://yourserver.com/exports/${pdfFileName}`;
        return res.status(200).json({
          success: true,
          message: "PDF generated successfully",
          pdfUrl, // Send the URL instead of the file
        });
      });
    
    
      return;
    }
  
    // Return JSON response
    res.status(200).json({
      success: true,
      dashboardData: {
        totalAmountSpent,
        workInProgressTasks,
        completedTasks,
        spendingOverTime,
      },
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};


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
    searchTasksHandler,
    getTaskCreatorDashboard,
  
};