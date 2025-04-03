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
    const { range } = req.query;
    const taskCreatorId = req.user._id;

    // Determine the start date based on the timeframe
    let startDate = new Date();
    switch (range) {
      case "1y":
        startDate.setFullYear(startDate.getFullYear() - 1);
        groupByFormat = "%Y-%m"; // Group by Year-Month
        break;
      case "30d":
        startDate.setDate(startDate.getDate() - 30);
        groupByFormat = "%Y-%m-%d"; // Group by Day
        break;
      case "7d":
        startDate.setDate(startDate.getDate() - 7);
        groupByFormat = "%Y-%m-%d"; // Group by Day
        break;
      case "today":
        startDate.setHours(0, 0, 0, 0);
        groupByFormat = "%Y-%m-%d"; // Group by Day
        break;
      default:
        return res.status(400).json({ success: false, message: "Invalid range" });
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
          count: { $sum: { $size: "$applications" } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const formattedResult = result.map(entry => ({
      date: entry._id,
      count: entry.count
    }));

    const totalWorkers = result.reduce((sum, entry) => sum + entry.count, 0);
    const averageWorkerPerTask = totalWorkers > 0 ? totalWorkers/result.length : 0;

    res.status(200).json({
      success: true,
      message: "Worker engagement over time fetched successfully",
      data: {
        averageWorkerPerTask, 
        workerEngagements: formattedResult
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const getAverageTaskDuration = async (req, res) => {
  try {
    const creatorId = req.user._id;
    const { range } = req.query;
    let matchStage = { userId: creatorId, visibility: "Published" };
    let prevMatchStage = { userId: creatorId, visibility: "Published" };
    let groupByFormat;
    let dateFormat;
    
    const today = new Date();
    let previousStartDate;

    if (range === "1y") {
      const startDate = new Date(today.setFullYear(today.getFullYear() - 1));
      previousStartDate = new Date(today.setFullYear(today.getFullYear() - 2));
      matchStage["taskApplications.submittedAt"] = { $gte: startDate };
      prevMatchStage["taskApplications.submittedAt"] = { $gte: previousStartDate, $lt: startDate };
      groupByFormat = { year: { $year: "$taskApplications.submittedAt" }, month: { $month: "$taskApplications.submittedAt" } };
      dateFormat = (doc) => `${doc._id.year}-${String(doc._id.month).padStart(2, "0")}`;
    } else if (range === "30d") {
      const startDate = new Date(today.setDate(today.getDate() - 30));
      previousStartDate = new Date(today.setDate(today.getDate() - 60));
      matchStage["taskApplications.submittedAt"] = { $gte: startDate };
      prevMatchStage["taskApplications.submittedAt"] = { $gte: previousStartDate, $lt: startDate };
      groupByFormat = { year: { $year: "$taskApplications.submittedAt" }, month: { $month: "$taskApplications.submittedAt" }, day: { $dayOfMonth: "$taskApplications.submittedAt" } };
      dateFormat = (doc) => `${doc._id.year}-${String(doc._id.month).padStart(2, "0")}-${String(doc._id.day).padStart(2, "0")}`;
    } else if (range === "7d") {
      const startDate = new Date(today.setDate(today.getDate() - 7));
      previousStartDate = new Date(today.setDate(today.getDate() - 14));
      matchStage["taskApplications.submittedAt"] = { $gte: startDate };
      prevMatchStage["taskApplications.submittedAt"] = { $gte: previousStartDate, $lt: startDate };
      groupByFormat = { year: { $year: "$taskApplications.submittedAt" }, month: { $month: "$taskApplications.submittedAt" }, day: { $dayOfMonth: "$taskApplications.submittedAt" } };
      dateFormat = (doc) => `${doc._id.year}-${String(doc._id.month).padStart(2, "0")}-${String(doc._id.day).padStart(2, "0")}`;
    } else if (range === "today") {
      const startDate = new Date(today.setHours(0, 0, 0, 0));
      previousStartDate = new Date(today.setDate(today.getDate() - 1));
      matchStage["taskApplications.submittedAt"] = { $gte: startDate };
      prevMatchStage["taskApplications.submittedAt"] = { $gte: previousStartDate, $lt: startDate };
      groupByFormat = { hour: { $hour: "$taskApplications.submittedAt" } };
      dateFormat = (doc) => `${String(doc._id.hour).padStart(2, "0")}:00`;
    } else {
      return res.status(400).json({ success: false, message: "Invalid range provided" });
    }

    const getAverageDuration = async (match) => {
      const result = await Task.aggregate([
        {
          $lookup: {
            from: "taskapplications",
            localField: "_id",
            foreignField: "taskId",
            as: "taskApplications",
          },
        },
        { $unwind: "$taskApplications" },
        { $match: match },
        {
          $group: {
            _id: groupByFormat,
            averageDuration: {
              $avg: {
                $cond: {
                  if: { $gt: ["$taskApplications.submittedAt", null] },
                  then: { $subtract: ["$taskApplications.submittedAt", "$taskApplications.createdAt"] },
                  else: null,
                },
              },
            },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1 } },
      ]);

      return result;
    };

    // Fetch current period average duration
    const currentPeriodResult = await getAverageDuration(matchStage);
    const formattedCurrentPeriod = currentPeriodResult.map((doc) => ({
      date: dateFormat(doc),
      averageDuration: doc.averageDuration ? formatDuration(doc.averageDuration) : 0,
    }));

    // Fetch previous period average duration
    const previousPeriodResult = await getAverageDuration(prevMatchStage);
    const totalCurrentDuration = currentPeriodResult.reduce((acc, doc) => acc + (doc.averageDuration || 0), 0);
    const totalPreviousDuration = previousPeriodResult.reduce((acc, doc) => acc + (doc.averageDuration || 0), 0);

    // Calculate percentage change
    const percentageChange = totalPreviousDuration
      ? ((totalCurrentDuration - totalPreviousDuration) / totalPreviousDuration) * 100
      : totalCurrentDuration > 0
        ? 100
        : 0;

    res.status(200).json({
      success: true,
      message: "Average task duration fetched successfully",
      data: {
        averageDurations: formattedCurrentPeriod,
        totalAverageDuration: formatDuration(totalCurrentDuration/currentPeriodResult.length),
        percentageChange: `${percentageChange.toFixed(2)}%`,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = {
  getAnalyticsOverview,
  getCompletedTasksOverTime,
  getPopularTasksAnalysis,
  getWorkerEngagement,
  getAverageTaskDuration
}