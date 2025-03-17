const Users = require("../models/Users");

const isTaskEarner = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await Users.findById(userId);
    if (!user.isTaskEarner) return res.status(401).json({ message: 'Unauthorized' });
    next()
  }
  catch (error){
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = isTaskEarner;