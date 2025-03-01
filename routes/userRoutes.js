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
    changeUserPassword
} = require('../controllers/userController');
const upload = require("../middleware/multer");

route.post('/create', SignupHandlerTaskCreator);
route.post('/earn', SignupHandlerTaskEarner);
route.post('/login', loginHandler);
route.post('/verify', verifyResetCode)
route.post('/reset', resetPassword)
route.post('/request', requestPasswordReset)
route.get('/user-profile', validation, getUserProfile);
route.put('/profile', upload.single('avatar'), validation, updateUserProfile);
route.put('/change-password', validation, changeUserPassword);
route.post('/user', validation, (req, res) => {
    res.json(req.user)
})

module.exports = route;