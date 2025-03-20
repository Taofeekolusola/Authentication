const { mongoose } = require("mongoose");
const { Task } = require("../models/Tasks");

const taskOwner = async (req, res, next) => {
  try {
    const creatorId = req.user._id;
    const { taskId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
        res.status(400).json({ status: false, message: "Invalid Task ID" });
    }

    const task = await Task.findOne(
      { _id: taskId }
    );
    if (!task) {
        return res.status(404).json({ status: false, message: "Task not found" });
    }

    if (task.userId.toString() !== creatorId.toString()) {
        return res.status(403).json({ status: false, message: 'Not owner of Task' });
    }
    next();
  }
  catch (error){
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = taskOwner;