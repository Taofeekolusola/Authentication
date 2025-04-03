const { TaskApplication } = require("../models/Tasks");
const User = require("../models/Users");

const earnerDashboardHandler = async (req, res) => {
  try {
    const earnerId = req.user._id;
    const profileCompletion = await getProfileCompletion(earnerId);    

    const result = await TaskApplication.aggregate([
      { $match: { earnerId } },
      {
        $lookup: {
          from: "tasks",
          localField: "taskId",
          foreignField: "_id",
          as: "taskDetails",
        },
      },
      { $unwind: "$taskDetails" },
      {
        $group: {
          _id: earnerId,
          totalEarnings: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$earnerStatus", "Completed"] }, { $eq: ["$reviewStatus", "Approved"] }] },
                "$taskDetails.compensation.amount",
                0,
              ],
            },
          },
          inProgressTasks: {
            $sum: { $cond: [{ $eq: ["$earnerStatus", "In Progress"] }, 1, 0] },
          },
          completedTasks: {
            $sum: { $cond: [{ $eq: ["$earnerStatus", "Completed"] }, 1, 0] },
          },
          cancelledTasks: {
            $sum: { $cond: [{ $eq: ["$earnerStatus", "Cancelled"] }, 1, 0] },
          },
          pendingTasks: {
            $sum: { $cond: [{ $eq: ["$earnerStatus", "Pending"] }, 1, 0] },
          }
        },
      },
    ]);

    const {
      totalEarnings = 0,
      inProgressTasks = 0,
      completedTasks = 0,
      pendingTasks = 0,
      cancelledTasks = 0,
    } = result[0] || {};

    const pendingTasksTotal = pendingTasks + inProgressTasks;

    res.status(200).json({
      success: true,
      message: "Earner dashboard overview fetched successfully",
      data: {
        totalEarnings,
        inProgressTasks,
        completedTasks,
        cancelledTasks,
        pendingTasks: pendingTasksTotal,
        profileCompletion: profileCompletion.toFixed(1) + "%"
    },
    });
  }
  catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

const getProfileCompletion = async (userId) => {
  try{
    const earner = await User.findById(userId, "userImageUrl firstName lastName bio languages expertise location");
    const profileFields = ["userImageUrl", "firstName", "lastName", "bio", "languages", "expertise", "location"];
    const filledFields = profileFields.filter((field) => earner[field]);
    const profileCompletion = (filledFields.length / profileFields.length) * 100;
    return profileCompletion;
  }
  catch (error) {
    console.error(error);
  }
}

const getEarningsOverTime = async (req, res) => {
  try {
    const earnerId = req.user._id;
    const { range } = req.query;
    let matchStage = {
      earnerId,
      earnerStatus: "Completed",
      reviewStatus: "Approved",
    };
    let groupByFormat;
    let dateFormat;

    const today = new Date();
    if (range === "30d") {
      matchStage["submittedAt"] = { $gte: new Date(today.setDate(today.getDate() - 30)) };
      groupByFormat = {
        year: { $year: "$submittedAt" },
        month: { $month: "$submittedAt" },
        day: { $dayOfMonth: "$submittedAt" },
      };
      dateFormat = (doc) =>
        `${doc._id.year}-${String(doc._id.month).padStart(2, "0")}-${String(doc._id.day).padStart(2, "0")}`;
    } else if (range === "7d") {
      matchStage["submittedAt"] = { $gte: new Date(today.setDate(today.getDate() - 7)) };
      groupByFormat = {
        year: { $year: "$submittedAt" },
        month: { $month: "$submittedAt" },
        day: { $dayOfMonth: "$submittedAt" },
      };
      dateFormat = (doc) =>
        `${doc._id.year}-${String(doc._id.month).padStart(2, "0")}-${String(doc._id.day).padStart(2, "0")}`;
    } else if (range === "today") {
      matchStage["submittedAt"] = {
        $gte: new Date(today.setHours(0, 0, 0, 0)),
        $lt: new Date(today.setHours(23, 59, 59, 999)),
      };
      groupByFormat = { hour: { $hour: "$submittedAt" } };
      dateFormat = (doc) => `${String(doc._id.hour).padStart(2, "0")}:00`;
    } else if (range === "1y"){
      groupByFormat = { year: { $year: "$submittedAt" }, month: { $month: "$submittedAt" } };
      dateFormat = (doc) => `${doc._id.year}-${String(doc._id.month).padStart(2, "0")}`;
    }
    else {
      return res.status(400).json({ success: false, message: "Invalid range" });
    }

    const earnings = await TaskApplication.aggregate([
      {
        $lookup: {
          from: "tasks",
          localField: "taskId",
          foreignField: "_id",
          as: "taskDetails",
        },
      },
      { $unwind: "$taskDetails" },
      { $match: matchStage },
      {
        $group: {
          _id: groupByFormat,
          totalEarnings: { $sum: "$taskDetails.compensation.amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1 } },
    ]);

    const formattedData = earnings.map((doc) => ({
      date: dateFormat(doc),
      totalEarnings: doc.totalEarnings,
    }));

    res.status(200).json({
      success: true,
      message: "Earnings over time fetched successfully",
      data: formattedData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = {
  earnerDashboardHandler,
  getEarningsOverTime
}