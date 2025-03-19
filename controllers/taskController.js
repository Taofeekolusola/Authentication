const mongoose = require("mongoose");
const  Task  = require("../models/Tasks");
const paginate = require("../utils/paginate");
const fs = require("fs");
const PDFDocument = require("pdfkit");
const path = require("path");


const createTaskHandler = async (req, res) => {
  try {
    console.log("Raw request body:", req.body);


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
      additionalInfo, // Could be undefined
    } = req.body;


    if (!title || !description || !requirements || !deadline || !compensation || !taskType || !location) {
      return res.status(400).json({ error: "Missing required field." });
    }


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


    // Handle uploaded files
    if (req.files && req.files.length > 0) {
      additionalInfoArray.push(...req.files.map(file => ({ type: "file", value: `/uploads/${file.filename}` })));
    }


    // Debugging: Log received `additionalInfo`
    console.log("Raw additionalInfo:", additionalInfo);


    // Parse `additionalInfo` safely
    if (additionalInfo) {
      try {
        // Ensure additionalInfo is an array
        const parsedAdditionalInfo = typeof additionalInfo === "string" ? JSON.parse(additionalInfo) : additionalInfo;
        if (Array.isArray(parsedAdditionalInfo)) {
          additionalInfoArray.push(...parsedAdditionalInfo);
        } else {
          return res.status(400).json({ error: "additionalInfo must be an array." });
        }
      } catch (error) {
        return res.status(400).json({ error: "Invalid JSON format in additionalInfo." });
      }
    }


    if (!additionalInfoArray.length) {
      additionalInfoArray = [{ type: "note", value: "No additional info provided" }];
    }


    const task = await Task.create({
      userId: req.user._id,
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
    console.error("Error creating task:", error.message);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

const updateTaskHandler = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status, ...otherUpdates } = req.body; // Extract status separately


    // Check if taskId is valid
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ success: false, message: "Invalid Task ID" });
    }


    // Allow only valid status values
    const validStatuses = ["pending", "in_progress", "completed"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value" });
    }


    // Find task and update
    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      { $set: { status, ...otherUpdates } }, // Update status and other fields
      { new: true, runValidators: true } // Return updated task, enforce validation
    );


    if (!updatedTask) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }


    res.status(200).json({ success: true, message: "Task updated successfully", updatedTask });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
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

// Search Tasks Route
const searchTasksHandler = async (req, res) => {
 try { 
     const page = parseInt(req.query.page) - 1 || 0;
     const limit = parseInt(req.query.limit) || 5;
     const search = req.query.search || "";
     let sort = req.query.sort || "createdAt";
     let title = req.query.title || "All";
     
     const taskOptions = [
         "userId",
         "title",
         "taskType",
        "description",
        "location",
        "compensation",
        "noOfRespondents",
        "deadline",
        "requirements",
        "status",
        "additionalInfo",
      ];

      title === "All"
         ?(title = [...taskOptions])
         :(title = req.query.title.split(","));
      req.query.sort?(sort = req.query.sort.split(",")) : (sort = [sort]);

      let sortBy = {};
      if (sort[1]) {
        sortBy[sort[0]] = sort[1];
      } else {
        sortBy[sort[0]] = 'asc';
      }

      const searchTasks = await Task.find({title: {$regex: search, $options: "i" }})
         .where("title")
         .in([...title])
         .sort(sortBy)
         .skip(page * limit)
         .limit(limit);

      const total = await Task.countDocuments({
        title: { $in: [...title]},
        name: { $regex: search, $options: "i" },
      });

      const response = {
        error: false,
        total,
        page: page + 1,
        limit,
        title: taskOptions,
        searchTasks,
      }

      res.status(200).json(response);
 } catch (err) {
  console.log(err);
  res.status(500).json({error:true, message:"Internal Server Error"})
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
     /* stream.on("finish", () => {
        res.download(pdfPath, `spending_over_time_${userId}.pdf`, (err) => {
          if (err) {
            console.error("Error sending PDF:", err);
            return res.status(500).json({ success: false, message: "Failed to generate PDF" });
          }
        });
      });


      return;
    }*/
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
  getTaskCreatorTasksHandler,
  searchTasksHandler,
  getTaskCreatorDashboard, 
};

