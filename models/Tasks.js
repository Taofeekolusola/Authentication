const mongoose = require("mongoose");

// Define the Task schema
const TaskSchema = new mongoose.Schema(
    {
      title: {
        type: String,
        required: true,
        trim: true,  // Remove leading/trailing spaces
      },
      description: {
        type: String,
        required: true,
        trim: true,  // Remove leading/trailing spaces
      },
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,  // Optional field for task assignments
      },
      status: {
        type: String,
        enum: ['pending', 'completed', 'cancelled', 'under review', 'approved'],
        default: 'pending',  // Default task status
      },
      type: {
        type: String,
        required: true,  // Ensure task type is provided
      },
      platform: {
        type: String,
        required: true,  // Ensure platform is provided
      },
      amount: {
        type: Number,
        required: true,
        min: 0,  // Ensure amount is non-negative
      },
      performedAt: {
        type: Date,
        default: null,  // Set when task is completed
      },
    },
    {
      timestamps: true,  // Automatically handles `createdAt` and `updatedAt`
    }
);
  
// Export the Task model
module.exports = mongoose.model("Task", TaskSchema);