const { TaskApplication } = require("../models/Tasks");

const isTaskOwner = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const taskApplicationId = req.params.appId;
    const taskApplication = await TaskApplication.findById(taskApplicationId).populate({
      path: "taskId",
      select: "userId",
    });
    if (taskApplication.taskId.userId !== userId) {
        return res.status(401).json({ message: 'Not owner of Task' });
    }
    next();
  }
  catch (error){
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = isTaskOwner;