const Joi = require("joi");
const { Task, TaskApplication } = require("../models/Tasks");
const { findById } = require("../models/Users");
const paginate = require("../utils/paginate");

const {Wallet, ReserveWallet} = require("../models/walletModel");
const Transaction = require("../models/transactionModel");
const mongoose = require("mongoose");

const createTaskApplication = async (req, res) => {
  try{
    const { taskId } = req.params;
    const earnerId = req.user._id;
    const earnerEmail = req.user.email;
    
    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    // Check that task respondents hasn't been exceeded
    const numberOfApplications = await TaskApplication.countDocuments({ taskId });
    if (numberOfApplications >= parseInt(task.noOfRespondents, 10)) {
      return res.status(400).json({ message: "Application limit exceeded" });
    }

    // Check if task application exists already
    const exists = await TaskApplication.findOne({ taskId, earnerId })
    if (exists) return res.status(400).json({ message: "Task has been applied for already" });

    const taskApplication = await TaskApplication.create({
      earnerId,
      taskId,
      email: earnerEmail,
    })
    res.status(201).json({
      success: true,
      message: "Task application created successfully!",
      data: taskApplication
    })
  }
  catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

const updateEarnerStatusSchema = Joi.object({
  earnerStatus: Joi.string()
    .valid("Cancelled", "In Progress", "Pending", "Completed")
    .required(),
});

const updateEarnerStatus = async (req, res) => {
  try{
    const { appId } = req.params;
    const earnerId = req.user._id;
    const { earnerStatus } = req.body;

    const { error } = updateEarnerStatusSchema.validate({ earnerStatus });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    let taskApplication = await TaskApplication.findOne({ _id: appId, earnerId }).lean();

    // Restrict update if task creator has reviewed
    if (taskApplication.reviewStatus !== "Pending") {
      return res.status(400).json({
        success: false, message: "Task has already been reviewed"
      });
    }

    const updateFields = { earnerStatus };
    if (earnerStatus === "Completed") {
      updateFields.submittedAt = new Date();
      updateFields.cancelledAt = null;
    } else if (earnerStatus === "Cancelled") {
      updateFields.cancelledAt = new Date();
      updateFields.submittedAt = null;
    } else if (earnerStatus === "Pending" || earnerStatus === "In Progress") {
      updateFields.submittedAt = null;
      updateFields.cancelledAt = null;
    }

    taskApplication = await TaskApplication.findByIdAndUpdate(
      appId, updateFields, { new: true }
    );
 
    res.status(200).json({
      success: true,
      message: "Task application status updated successfully!",
      data: taskApplication,
    });
  }
  catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

const updateReviewStatusSchema = Joi.object({
  reviewStatus: Joi.string()
    .valid("Approved", "Pending", "Rejected")
    .required(),
});
// const updateReviewStatus = async (req, res) => {
//   try{
//     const { taskId, appId } = req.params;
//     const { reviewStatus } = req.body;

//     const { error } = updateReviewStatusSchema.validate({ reviewStatus });
//     if (error) {
//       return res.status(400).json({ success: false, message: error.details[0].message });
//     }

//     let taskApplication = await TaskApplication.findOne({ _id: appId, taskId }).lean();

//     // Restrict update if task earner has not set task to completed
//     if (taskApplication.earnerStatus !== "Completed") {
//       return res.status(400).json({
//         success: false, message: "Task is not yet completed"
//       });
//     }

//     const updateFields = { reviewStatus };
//     if (reviewStatus === "Pending") {
//       updateFields.reviewedAt = null;
//     } else {
//       updateFields.reviewedAt = new Date();
//     }

//     taskApplication = await TaskApplication.findByIdAndUpdate(
//       appId,
//       { $set: updateFields },
//       { new: true, runValidators: true }
//     );

//     res.status(200).json({
//       success: true,
//       message: "Task application review status updated successfully!",
//       data: taskApplication,
//     });
//   }
//   catch (error) {
//     console.error(error);
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// }


const updateReviewStatus = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { taskId, appId } = req.params;
    const { reviewStatus } = req.body;
    const taskCreatorId = req.user._id;

    // Validate request body
    const { error } = updateReviewStatusSchema.validate({ reviewStatus });
    if (error) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    // Find Task Application
    let taskApplication = await TaskApplication.findOne({ _id: appId, taskId }).session(session);
    if (!taskApplication) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: "Task application not found" });
    }

    // Restrict update if task earner has not set task to completed
    if (taskApplication.earnerStatus !== "Completed") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "Task is not yet completed" });
    }

    // Update Task Application Review Status
    const updateFields = {
      reviewStatus,
      reviewedAt: reviewStatus === "Pending" ? null : new Date(),
    };

    taskApplication = await TaskApplication.findByIdAndUpdate(
      appId,
      { $set: updateFields },
      { new: true, runValidators: true, session }
    );

    // **Only process fund transfer if the reviewStatus is "Approved"**
    if (reviewStatus === "Approved") {
      // Find Reserved Funds
      const reservedFunds = await ReserveWallet.findOne({ taskId, taskCreatorId }).session(session);
      if (!reservedFunds) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ success: false, message: "No reserved funds found for this task" });
      }

      // Find Task Earner's Wallet
      const taskEarnerWallet = await Wallet.findOne({ userId: taskApplication.earnerId }).session(session);
      if (!taskEarnerWallet) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ success: false, message: "TaskEarner's wallet not found" });
      }

      // Transfer Funds to Task Earner's Wallet
      taskEarnerWallet.balance += reservedFunds.amount;

      // Create Transaction Record
      const [transaction] = await Transaction.create(
        [
          {
            userId: taskApplication.earnerId,
            email: taskEarnerWallet.email,
            amount: reservedFunds.amount,
            currency: reservedFunds.currency,
            method: "in-app",
            paymentType: "credit",
            status: "successful",
            reference: `REF_${Date.now()}-altB`,
          },
        ],
        { session }
      );

      taskEarnerWallet.transactions.push(transaction._id);
      await taskEarnerWallet.save({ session });

      // Remove Reserved Funds
      await ReserveWallet.deleteOne({ _id: reservedFunds._id }, { session });
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: `Task application review status updated to '${reviewStatus}' successfully!`,
      data: taskApplication,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Update Review Status Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};



const fetchAllApplicationsEarnerSchema = Joi.object({
  search: Joi.string().allow("").optional(),
  status: Joi.string().valid("Cancelled", "In Progress", "Pending", "Completed").optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

const fetchAllApplicationsEarner = async (req, res) => {
  try {
    const { error, value } = fetchAllApplicationsEarnerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }
    const earnerId = req.user._id;
    const { search, status, page, limit } = value;
    const skip = (page - 1) * limit;
  
    let applicationQuery = { earnerId };
    if (status) applicationQuery.earnerStatus = status;
  
    if (search && search.trim() !== "") {
      const taskQuery = {
        $or: [
          { title: new RegExp(search, "i") },
          { description: new RegExp(search, "i") },
        ],
      };
      const matchingTasks = await Task.find(taskQuery).select("_id");
      const matchingTaskIds = matchingTasks.map((task) => task._id);
  
      if (matchingTaskIds.length) {
        applicationQuery.taskId = { $in: matchingTaskIds };
      } else {
        return res.status(200).json({
          success: true,
          message: "Task applications fetched successfully",
          data: [],
          pagination: paginate(0, page, limit),
        });
      }
    }
  
    const total = await TaskApplication.countDocuments(applicationQuery);
    const taskApplications = await TaskApplication.find(applicationQuery)
      .populate("taskId")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
  
    res.status(200).json({
      success: true,
      message: "Task applications fetched successfully",
      data: taskApplications,
      pagination: paginate(total, page, limit),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  } 
}

const fetchFeaturedApplicationsEarner = async (req, res) => {
  try {
    const earnerId = req.user._id;
  
    let applicationQuery = {
      earnerId,
      earnerStatus: { $in: ["In Progress", "Pending", "Cancelled"] },
    };
  
    const taskApplications = await TaskApplication.find(applicationQuery)
      .populate("taskId")
      .limit(4)
      .sort({ createdAt: -1 });
  
    res.status(200).json({
      success: true,
      message: "Task applications fetched successfully",
      data: taskApplications,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  } 
}

const fetchFeaturedApplicationsCreator = async (req, res) => {
  try {
    const taskCreatorId = req.user._id;
  
    let taskApplicationsQuery = {
      earnerStatus: { $in: ["In Progress", "Pending", "Cancelled"] },
    };
  
    const taskQuery = {
      userId: taskCreatorId,
      visibility: "Published"
    };
    const matchingTasks = await Task.find(taskQuery).select("_id");
    const matchingTaskIds = matchingTasks.map((task) => task._id);

    if (matchingTaskIds.length) {
      taskApplicationsQuery.taskId = { $in: matchingTaskIds };
    } else {
      return res.status(200).json({
        success: true,
        message: "Task applications fetched successfully",
        data: [],
      });
    }
  
    const taskApplications = await TaskApplication.find(taskApplicationsQuery)
      .populate("taskId")
      .limit(4)
      .sort({ createdAt: -1 });
  
    res.status(200).json({
      success: true,
      message: "Task applications fetched successfully",
      data: taskApplications,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  } 
}

const fetchAllApplicationsCreatorSchema = Joi.object({
  search: Joi.string().allow("").optional(),
  status: Joi.string().valid("Cancelled", "In Progress", "Pending", "Completed").optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

const fetchAllApplicationsCreator = async (req, res) => {
  try{
    const { error, value } = fetchAllApplicationsCreatorSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }
    const taskCreatorId = req.user._id;
    const { search, status, page, limit } = value;
    const skip = (page - 1) * limit;
  
    let taskApplicationsQuery = {};
    if (status) taskApplicationsQuery.earnerStatus = status;
    const taskQuery = {
      userId: taskCreatorId,
      $or: [
        { title: new RegExp(search, "i") },
        { description: new RegExp(search, "i") },
      ],
    };
    const matchingTasks = await Task.find(taskQuery).select("_id");
    const matchingTaskIds = matchingTasks.map((task) => task._id);

    if (matchingTaskIds.length) {
      taskApplicationsQuery.taskId = { $in: matchingTaskIds };
    } else {
      return res.status(200).json({
        success: true,
        message: "Task applications fetched successfully",
        data: [],
        pagination: paginate(0, page, limit),
      });
    }
  
    const total = await TaskApplication.countDocuments(taskApplicationsQuery);
    const taskApplications = await TaskApplication.find(taskApplicationsQuery)
      .populate("taskId")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
  
    res.status(200).json({
      success: true,
      message: "Task applications fetched successfully",
      data: taskApplications,
      pagination: paginate(total, page, limit),
    });
  }
  catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

module.exports = {
  createTaskApplication,
  updateEarnerStatus,
  updateReviewStatus,
  fetchAllApplicationsCreator,
  fetchAllApplicationsEarner,
  fetchFeaturedApplicationsCreator,
  fetchFeaturedApplicationsEarner
}