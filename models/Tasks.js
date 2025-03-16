const mongoose = require("mongoose");

const AdditionalInfoSchema = new mongoose.Schema(
  {
    type: { type: String, required: true }, // e.g., "file", "url", "image"
    value: { type: String, required: true }, // Stores file path, URL, or image link
  },
  { _id: false } // Prevents Mongoose from automatically creating an _id for each object
);

const TaskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    taskType: {
      type: String,
      required: true,
    },
    link1: {
      type: String,
      default: null,
      required: false,
    },
    link2: {
      type: String,
      default: null,
      required: false,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      enum: ["Remote", "Onsite"],
      default: null,
    },
    compensation: {
      currency: {
        type: String,
        enum: ["USD", "EUR"],
        required: true,
      },
      amount: {
        type: Number,
        required: true,
      },
    },
    noOfRespondents: {
      type: String,
      required: true,
    },
    deadline: {
      type: Date,
      required: true,
    },
    requirements: {
      type: String,
      required: true,
    },
    additionalInfo: {
      type: [AdditionalInfoSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const TaskApplicationSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    earnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    earnerStatus: {
      type: String,
      enum: ["Cancelled", "In Progress", "Pending", "Completed"],
      default: "In Progress",
    },
    reviewStatus: {
      type: String,
      enum: ["Approved", "Pending", "Rejected"],
      default: "Pending",
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const Task = mongoose.model("Task", TaskSchema);
const TaskApplication = mongoose.model("TaskApplication", TaskApplicationSchema);
module.exports = { Task, TaskApplication };