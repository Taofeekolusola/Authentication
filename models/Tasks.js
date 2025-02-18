const mongoose = require("mongoose");

// Define the schema for additionalInfo
const AdditionalInfoSchema = new mongoose.Schema(
  {
    type: { type: String, required: true }, // e.g., "file", "url", "image"
    value: { type: String, required: true }, // Stores file path, URL, or image link
  },
  { _id: false } // Prevents Mongoose from automatically creating an _id for each object
);

// Define the Task schema
const TaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true, // Remove leading/trailing spaces
    },
    taskType: {
      type: String,
      required: true, // Ensure task type is provided
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
      trim: true, // Remove leading/trailing spaces
    },
    location: {
      type: String,
      enum: ["Remote", "Onsite"],
      default: null, // Optional field for location
    },
    compensation: {
      currency: {
        type: String,
        enum: ["USD", "EUR"], // Only allow USD or EUR
        required: true,
      },
      amount: {
        type: Number, // Store the numeric value separately
        required: true,
      },
    },
    noOfRespondents: {
      type: String,
      required: true,
    },
    deadline: {
      type: Date,
      required: true, // Ensure deadline is provided
    },
    requirements: {
      type: String,
      required: true, // Ensure requirements are provided
    },
    additionalInfo: {
      type: [AdditionalInfoSchema], // Use the defined schema for validation
      default: [],
    },
  },
  {
    timestamps: true, // Automatically handles `createdAt` and `updatedAt`
  }
);

// Export the Task model
module.exports = mongoose.model("Task", TaskSchema);