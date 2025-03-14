import Task from "../models/task.model.js";
import User from "../models/users.model.js"


//Create Task
export const createTask = async (req, res) => {
  try {
    const { title, description, budget, createdBy } = req.body;


    // Validate required fields
    if (!title || !description || !budget || !createdBy) {
      return res.status(400).json({ error: "All fields are required." });
    }


    // Check if User exists
    const user = await User.findById(createdBy);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }


    // Create Task
    const task = new Task({ title, description, budget, createdBy });
    await task.save();


    res.status(201).json({ message: "Task created successfully", task });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Fetch all tasks
export const getAllTasks = async (req, res) => {
  try {
    const tasks = await Task.find().populate("createdBy", "name email");
    res.json({ status: "SUCCESS", tasks });
  } catch (error) {
    res.status(500).json({ status: "FAILED", message: error.message });
  }
};


// Search tasks
export const searchTasks = async (req, res) => {
  try {
    const { query } = req.query; // Get the search query

    if (!query) {
      return res.status(400).json({ status: "FAILED", message: "Search query is required" });
    }

    // Perform search (case insensitive)
    const tasks = await Task.find({
      $or: [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } }
      ]
    });

    if (tasks.length === 0) {
      return res.status(404).json({ status: "FAILED", message: "No tasks found" });
    }

    res.status(200).json({ status: "SUCCESS", data: tasks });

  } catch (error) {
    res.status(500).json({ status: "FAILED", message: "Error searching tasks", error: error.message });
  }
};



// Update task status
export const updateTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;


    if (!["pending", "in_progress", "completed"].includes(status)) {
      return res.status(400).json({ status: "FAILED", message: "Invalid status" });
    }


    const task = await Task.findByIdAndUpdate(taskId, { status }, { new: true });
    if (!task) return res.status(404).json({ status: "FAILED", message: "Task not found" });


    res.json({ status: "SUCCESS", task });
  } catch (error) {
    res.status(500).json({ status: "FAILED", message: error.message });
  }
};
