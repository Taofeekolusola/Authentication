/*import mongoose  from "mongoose";


const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    budget: { type: Number, required: true },
    status: { type: String, enum: ["pending", "in_progress", "completed"], default: "pending" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);


export default mongoose.model('Task', taskSchema);
*/

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
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

// Export the Task model
module.exports = mongoose.model('Task', TaskSchema);