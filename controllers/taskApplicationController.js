const Joi = require("joi");
const { Task, TaskApplication } = require("../models/Tasks");
const { findById } = require("../models/Users");

const createTaskApplication = async (req, res) => {
  try{
    const { taskId } = req.params;
    const earnerId = req.user._id;
    
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
const updateReviewStatus = async (req, res) => {
  try{
    const { taskId, appId } = req.params;
    const { reviewStatus } = req.body;

    const { error } = updateReviewStatusSchema.validate({ reviewStatus });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    let taskApplication = await TaskApplication.findOne({ _id: appId, taskId }).lean();

    // Restrict update if task earner has not set task to completed
    if (taskApplication.earnerStatus !== "Completed") {
      return res.status(400).json({
        success: false, message: "Task is not yet completed"
      });
    }

    const updateFields = { reviewStatus };
    if (reviewStatus === "Pending") {
      updateFields.reviewedAt = null;
    } else {
      updateFields.reviewedAt = new Date();
    }

    taskApplication = await TaskApplication.findByIdAndUpdate(
      appId,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Task application review status updated successfully!",
      data: taskApplication,
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
}