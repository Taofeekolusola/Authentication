const { TaskApplication } = require("../models/Tasks");

const isApplicationOwner = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { appId, taskId } = req.params;
    const taskApplication = await TaskApplication.findOne(
      { _id :appId, taskId }
    );
    if (!taskApplication) {
      return res.status(404).json({ message: 'Task application not found' });
    }
    if (taskApplication.earnerId !== userId) {
        return res.status(401).json({ message: 'Not owner of Task Application' });
    }
    next();
  }
  catch (error){
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = isApplicationOwner;