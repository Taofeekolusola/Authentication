const express = require('express');
const route = express.Router();
const { validation } = require('../middleware/auth');
const {
    SignupHandlerTaskCreator,
    SignupHandlerTaskEarner,
    loginHandler,
    requestPasswordReset,
    resetPassword,
    verifyResetCode,
    getUserProfile,
    updateUserProfile,
    changeAccountSettings,
    updateUserSettings,
    deleteUser,
    amountEarned,
    fetchUserProfileStats
} = require('../controllers/userController');
const upload = require("../middleware/multer");

route.post('/create', SignupHandlerTaskCreator);
route.post('/earn', SignupHandlerTaskEarner);
route.post('/login', loginHandler);
route.post('/verify', verifyResetCode)
route.post('/reset', resetPassword)
route.post('/request', requestPasswordReset)
route.get('/user-profile', validation, getUserProfile);
route.get('/stats', validation, fetchUserProfileStats);
route.put('/profile', upload.single('avatar'), validation, updateUserProfile);
route.put('/account-settings', validation, changeAccountSettings);
route.patch('/settings', validation, updateUserSettings);
route.get('/amount-earned', validation, amountEarned)
route.post('/user', validation, (req, res) => {
    res.json(req.user)
})
route.delete('/delete-user', deleteUser);

module.exports = route;