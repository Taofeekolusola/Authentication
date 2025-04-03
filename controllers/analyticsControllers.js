const { default: mongoose } = require("mongoose");
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

    const completedApplicationsCount = await TaskApplication.aggregate([
      {
        $lookup: {
          from: "tasks",
          localField: "taskId",
          foreignField: "_id",
          as: "taskDetails",
        },
      },
      {
        $unwind: {
          path: "$taskDetails",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $match: {
          "taskDetails.userId": taskCreatorId,
          "earnerStatus": "Completed",
        },
      },
      {
        $count: "completedApplications",
      },
    ]);

    const taskApplicationsCount = await TaskApplication.aggregate([
      {
        $lookup: {
          from: "tasks",
          localField: "taskId",
          foreignField: "_id",
          as: "taskDetails",
        },
      },
      {
        $unwind: {
          path: "$taskDetails",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $match: {
          "taskDetails.userId": taskCreatorId,
          "taskDetails.visibility": "Published"
        },
      },
      {
        $group: {
          _id: null,
          totalApplications: { $sum: 1 },
        },
      },
    ]);    
    const taskSuccessRate = totalTasksPosted > 0 ? (
      completedApplicationsCount[0].completedApplications / taskApplicationsCount[0].totalApplications
    ) * 100 : 0;

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
    let matchStage = {
      "taskApplications.earnerStatus": "Completed", userId: creatorId,
      visibility: "Published"
    };
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

    const totalRespondentsResult = await Task.aggregate([
      {
        $match: {
          userId: taskCreatorId,
          visibility: "Published",
        },
      },
      {
        $group: {
          _id: "$taskType",
          totalRespondents: { $sum: "$noOfRespondents" },
        },
      },
    ]);

    const result = await Task.aggregate([
      {
        $match: {
          userId: taskCreatorId,
          visibility: "Published",
        },
      },
      {
        $lookup: {
          from: "taskapplications",
          localField: "_id",
          foreignField: "taskId",
          as: "applications",
        },
      },
      {
        $unwind: {
          path: "$applications",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$taskType",
          taskType: { $first: "$taskType" },
          posted: { $sum: 1 },
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
          engagement: {
            $sum: { $cond: [{ $ifNull: ["$applications", false] }, 1, 0] },
          },
          averageDuration: {
            $avg: {
              $cond: {
                if: { $gt: ["$applications.submittedAt", null] },
                then: { $subtract: ["$applications.submittedAt", "$applications.createdAt"] },
                else: null,
              },
            },
          },
        },
      },
      {
        $sort: { posted: -1 },
      },
    ]);

    const respondentsMap = totalRespondentsResult.reduce((acc, { _id, totalRespondents }) => {
      acc[_id] = totalRespondents;
      return acc;
    }, {});
    
    // Format result with the correct totalRespondents value
    const formattedResult = result.map(({ taskType, engagement, ...task }) => {
      const totalRespondents = respondentsMap[taskType] || 0; // Get totalRespondents for this task type
    
      return {
        ...task,
        averageDuration: formatDuration(task.averageDuration),
        engagementPercentage: totalRespondents 
          ? Math.round((engagement / totalRespondents) * 100)
          : 0,
      };
    });

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

const getWorkerEngagement = async (req, res) => {
  try {
    const { timeframe } = req.query;
    const taskCreatorId = req.user._id;

    // Determine the start date based on the timeframe
    let startDate = new Date();
    switch (timeframe) {
      case "1year":
        startDate.setFullYear(startDate.getFullYear() - 1);
        groupByFormat = "%Y-%m"; // Group by Year-Month
        break;
      case "30days":
        startDate.setDate(startDate.getDate() - 30);
        groupByFormat = "%Y-%m-%d"; // Group by Day
        break;
      case "7days":
        startDate.setDate(startDate.getDate() - 7);
        groupByFormat = "%Y-%m-%d"; // Group by Day
        break;
      case "today":
        startDate.setHours(0, 0, 0, 0);
        groupByFormat = "%Y-%m-%d"; // Group by Day
        break;
      default:
        return res.status(400).json({ success: false, message: "Invalid timeframe" });
    }

    const result = await Task.aggregate([
      {
        $match: {
          userId: taskCreatorId,
          visibility: "Published",
          createdAt: { $gte: startDate }
        }
      },
      {
        $lookup: {
          from: "taskapplications",
          localField: "_id",
          foreignField: "taskId",
          as: "applications"
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: groupByFormat, date: "$createdAt" } },
          count: { $sum: { $size: "$applications" } } // Total workers engaged per date
        }
      },
      { $sort: { _id: 1 } } // Sort by date
    ]);

    // Format response
    const formattedResult = result.map(entry => ({
      date: entry._id,
      count: entry.count
    }));

    res.status(200).json({
      success: true,
      message: "Worker engagement over time fetched successfully",
      data: formattedResult
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const getAverageTaskDuration = async (req, res) => {
  try {
    const { timeframe } = req.query;
    const taskCreatorId = req.user._id;
    let matchStage = { userId: taskCreatorId, visibility: "Published" };
    let groupByFormat;
    let dateFormat;
    const today = new Date();

    // Determine timeframe
    if (timeframe === "1year") {
      matchStage["applications.createdAt"] = { $gte: new Date(today.setFullYear(today.getFullYear() - 1)) };
      groupByFormat = { year: { $year: "$applications.submittedAt" } };
      dateFormat = (doc) => `${doc._id.year}`;
    } else if (timeframe === "30days") {
      matchStage["applications.createdAt"] = { $gte: new Date(today.setDate(today.getDate() - 30)) };
      groupByFormat = {
        year: { $year: "$applications.submittedAt" },
        month: { $month: "$applications.submittedAt" },
        day: { $dayOfMonth: "$applications.submittedAt" }
      };
      dateFormat = (doc) => `${doc._id.year}-${String(doc._id.month).padStart(2, "0")}-${String(doc._id.day).padStart(2, "0")}`;
    } else if (timeframe === "7days") {
      matchStage["applications.createdAt"] = { $gte: new Date(today.setDate(today.getDate() - 7)) };
      groupByFormat = {
        year: { $year: "$applications.submittedAt" },
        month: { $month: "$applications.submittedAt" },
        day: { $dayOfMonth: "$applications.submittedAt" }
      };
      dateFormat = (doc) => `${doc._id.year}-${String(doc._id.month).padStart(2, "0")}-${String(doc._id.day).padStart(2, "0")}`;
    } else if (timeframe === "today") {
      matchStage["applications.createdAt"] = {
        $gte: new Date(today.setHours(0, 0, 0, 0)),
        $lt: new Date(today.setHours(23, 59, 59, 999))
      };
      groupByFormat = { hour: { $hour: "$applications.submittedAt" } };
      dateFormat = (doc) => `${String(doc._id.hour).padStart(2, "0")}:00`;
    } else {
      return res.status(400).json({ success: false, message: "Invalid timeframe" });
    }

    // MongoDB aggregation
    const result = await Task.aggregate([
      {
        $lookup: {
          from: "taskapplications",
          localField: "_id",
          foreignField: "taskId",
          as: "applications"
        }
      },
      { $unwind: "$applications" },
      {
        $match: {
          ...matchStage,
          "applications.createdAt": { $exists: true, $ne: null },
          "applications.submittedAt": { $exists: true, $ne: null },
          "applications.earnerStatus": "Completed"
        }
      },
      {
        $project: {
          createdAt: "$applications.createdAt",
          submittedAt: "$applications.submittedAt"
        }
      },
      {
        $addFields: {
          duration: {
            $divide: [
              { $subtract: ["$submittedAt", "$createdAt"] },
              1000
            ]
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$applications.submittedAt" }
          },
          totalDuration: { $sum: "$duration" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1 } }
    ]);

    console.log(result);
    // Format result
    const formattedResult = result.map((entry) => {
      const avgSeconds = entry.totalDuration / entry.count;
      const avgDays = Math.floor(avgSeconds / 86400);
      const avgHours = Math.floor((avgSeconds % 86400) / 3600);
      const avgMinutes = Math.floor((avgSeconds % 3600) / 60);

      return {
        date: dateFormat(entry),
        averageCompletionTime: `${avgDays}d ${avgHours}h ${avgMinutes}m`
      };
    });

    return res.status(200).json({
      success: true,
      message: "Task completion time fetched successfully",
      data: formattedResult
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = {
  getAnalyticsOverview,
  getCompletedTasksOverTime,
  getPopularTasksAnalysis,
  getWorkerEngagement,
  getAverageTaskDuration
}