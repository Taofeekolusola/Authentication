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
    getUserProfile
} = require('../controllers/userController');


route.post('/create', SignupHandlerTaskCreator);
route.post('/earn', SignupHandlerTaskEarner);
route.post('/login', loginHandler);
route.post('/verify', verifyResetCode)
route.post('/reset', resetPassword)
route.post('/request', requestPasswordReset)
route.get('/user-profile', validation, getUserProfile);
route.post('/user', validation, (req, res) => {
    res.json(req.user)
})
module.exports = route;