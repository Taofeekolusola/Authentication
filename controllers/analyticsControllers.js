const { Task, TaskApplication } = require("../models/Tasks");

const getAnalyticsOverview = async (req, res) => {
  try {
    const taskCreatorId = req.user._id;

    const totalTasksPosted = await Task.countDocuments({
      userId: taskCreatorId ,visibility : "Published"
    });
    
    const totalBudgetAgg = await Task.aggregate([
      {
        $match: {
          userId: taskCreatorId,
          visibility: "Published",
        },
      },
      {
        $group: {
          _id: null,
          totalBudget: { $sum: "$compensation.amount" },
        },
      },
    ]);

    const totalBudget = totalBudgetAgg.length > 0 ? totalBudgetAgg[0].totalBudget : 0;

    const successfulTasksAgg = await TaskApplication.aggregate([
      {
        $match: {
          earnerStatus: "Completed",
        },
      },
      {
        $group: {
          _id: "$taskId",
        },
      },
      {
        $count: "successfulTasks",
      },
    ]);
    const successfulTasks = successfulTasksAgg.length > 0 ? successfulTasksAgg[0].successfulTasks : 0;
    const taskSuccessRate = totalTasksPosted > 0 ? (successfulTasks / totalTasksPosted) * 100 : 0;

    res.status(200).json({
      success: true,
      message: "Task overview fetched successfully",
      data: {
        totalTasksPosted,
        totalBudget,
        taskSuccessRate: Math.round(taskSuccessRate),
      },
    });
  }
  catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

const getCompletedTasksOverTime = async (req, res) => {
  try {
    const creatorId = req.user._id;
    const { range } = req.query;
    let matchStage = { "taskApplications.earnerStatus": "Completed", userId: creatorId };
    let groupByFormat;
    let dateFormat;

    const today = new Date();
    if (range === "30d") {
      matchStage["taskApplications.submittedAt"] = { $gte: new Date(today.setDate(today.getDate() - 30)) };
      groupByFormat = {
        year: { $year: "$taskApplications.submittedAt" },
        month: { $month: "$taskApplications.submittedAt" },
        day: { $dayOfMonth: "$taskApplications.submittedAt" }
      };
      dateFormat = (doc) => `${doc._id.year}-${String(doc._id.month).padStart(2, "0")}-${String(doc._id.day).padStart(2, "0")}`;
    } else if (range === "7d") {
      matchStage["taskApplications.submittedAt"] = { $gte: new Date(today.setDate(today.getDate() - 7)) };
      groupByFormat = {
        year: { $year: "$taskApplications.submittedAt" },
        month: { $month: "$taskApplications.submittedAt" },
        day: { $dayOfMonth: "$taskApplications.submittedAt" }
      };
      dateFormat = (doc) => `${doc._id.year}-${String(doc._id.month).padStart(2, "0")}-${String(doc._id.day).padStart(2, "0")}`;
    } else if (range === "today") {
      matchStage["taskApplications.submittedAt"] = {
        $gte: new Date(today.setHours(0, 0, 0, 0)),
        $lt: new Date(today.setHours(23, 59, 59, 999))
      };
      groupByFormat = { hour: { $hour: "$taskApplications.submittedAt" } };
      dateFormat = (doc) => `${String(doc._id.hour).padStart(2, "0")}:00`;
    } else {
      groupByFormat = { year: { $year: "$taskApplications.submittedAt" }, month: { $month: "$taskApplications.submittedAt" } };
      dateFormat = (doc) => `${doc._id.year}-${String(doc._id.month).padStart(2, "0")}`;
    }

    const completedTasks = await Task.aggregate([
      {
        $lookup: {
          from: "taskapplications",
          localField: "_id",
          foreignField: "taskId",
          as: "taskApplications"
        }
      },
      { $unwind: "$taskApplications" },
      { $match: matchStage },
      {
        $group: {
          _id: groupByFormat,
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1 } }
    ]);

    const formattedData = completedTasks.map((doc) => ({
      date: dateFormat(doc),
      count: doc.count
    }));

    res.status(200).json({
      success: true,
      message: "Completed tasks over time fetched successfully",
      data: formattedData
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const getPopularTasksAnalysis = async (req, res) => {
  try {
    const taskCreatorId = req.user._id;

    const result = await Task.aggregate([
      // Filter tasks by the logged-in user
      { $match: { userId: taskCreatorId, visibility: "Published" } },

      // Join with TaskApplication collection
      {
        $lookup: {
          from: "taskapplications",
          localField: "_id",
          foreignField: "taskId",
          as: "applications",
        },
      },

      // Unwind applications array to process each application separately
      { $unwind: { path: "$applications", preserveNullAndEmptyArrays: true } },

      // Group by Task Type
      {
        $group: {
          _id: "$taskType", // Group by task type
          taskType: { $first: "$taskType" }, // Store task type
          posted: { $sum: 1 }, // Count the number of tasks of this type
          completed: {
            $sum: {
              $cond: [{ $eq: ["$applications.earnerStatus", "Completed"] }, 1, 0],
            },
          },
          accepted: {
            $sum: {
              $cond: [{ $eq: ["$applications.reviewStatus", "Approved"] }, 1, 0],
            },
          },
          engagement: { $sum: { $cond: [{ $ifNull: ["$applications", false] }, 1, 0] } },

          // Calculate average duration
          averageDuration: {
            $avg: {
              $cond: {
                if: { $gt: ["$applications.submittedAt", null] }, // Ensure submittedAt is not null
                then: { $subtract: ["$applications.submittedAt", "$applications.createdAt"] },
                else: null,
              },
            },
          },
        },
      },

      // Sort by most posted tasks
      { $sort: { posted: -1 } },
    ]);

    // Format averageDuration into days, hours, and minutes
    const formattedResult = result.map((task) => ({
      ...task,
      averageDuration: formatDuration(task.averageDuration),
    }));

    res.status(200).json({
      success: true,
      message: "Popular tasks analysis fetched successfully",
      data: formattedResult,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const formatDuration = (milliseconds) => {
  if (!milliseconds) return "0d 0h 0m";
  const totalMinutes = Math.floor(milliseconds / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return `${days}d ${hours}h ${minutes}m`;
};

module.exports = {
  getAnalyticsOverview,
  getCompletedTasksOverTime,
  getPopularTasksAnalysis
}