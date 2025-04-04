const InAppNotification = require('../models/inAppNotificationModel');
const paginate = require('../utils/paginate');
const inAppNotificationSchema = require('../validations/inAppNotificationValidation');

const getNotifications = async (req, res) => {
  try {
    const { error, value } = inAppNotificationSchema.validate(req.query);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }
    let { page, limit } = value;
    const skip = (page - 1) * limit;

    const notifications = await InAppNotification.find({ userId: req.user._id })
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const totalNotifications = await InAppNotification.countDocuments({ userId: req.user._id });

    res.status(200).json({
      success: true,
      message: "Notifications fetched successfully!",
      data: notifications,
      pagination: paginate(totalNotifications, page, limit)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = {
  getNotifications
};