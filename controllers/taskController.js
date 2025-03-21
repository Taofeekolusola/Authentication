const mongoose = require('mongoose');
const { Task } = require("../models/Tasks");
const paginate = require("../utils/paginate");
const fs = require("fs");
const PDFDocument = require("pdfkit");
const path = require("path");



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
    searchTasksHandler,
    getTaskCreatorDashboard,
};