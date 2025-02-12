const mongoose = require("mongoose");

// Define the Task schema
const TaskSchema = new mongoose.Schema(
    {
      title: {
        type: String,
        required: true,
        trim: true,  // Remove leading/trailing spaces
      },
      taskType: {
        type: String,
        required: true,  // Ensure task type is provided
      },
      link1: {
        type: String,
        default: null,
        required: false
      },
      link2: {
      type: String,
      default: null,
      required: false
      },
      description: {
        type: String,
        required: true,
        trim: true,  // Remove leading/trailing spaces
      },
      location: {
        type: String,
        enum: ['Remote', 'On-site'],
        default: null, // Optional field for location
      },
      compensation: {
        currency: {
          type: String,
          enum: ['USD', 'EUR'], // Only allow Dollar or Naira symbols
          required: true
        },
        amount: {
          type: Number, // Store the numeric value separately
          required: true
        }
      },
      deadline: {
        type: Date,
        required: true, // Ensure deadline is provided
      },
      requirements: {
        type: String,
        required: true, // Ensure requirements are provided
      },
      additionalInfo: [
        {
          type: String, // Can store file paths, URLs, or image links
          default: [],
        }
      ]
    },
    {
      timestamps: true,  // Automatically handles `createdAt` and `updatedAt`
    }
);
  
// Export the Task model
module.exports = mongoose.model("Task", TaskSchema);