import mongoose  from "mongoose";


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