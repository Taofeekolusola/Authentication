const express = require('express');
const route = express.Router();
const { validation } = require('../middleware/auth');
const {
    SignupHandlerTaskEarner,
    loginHandler,
    SignupHandlerTaskCreator,
    requestPasswordReset,
    resetPassword,
    verifyResetCode
} = require('../controllers/userController');


route.post('/earn', SignupHandlerTaskEarner);
route.post('/create', SignupHandlerTaskCreator);
route.post('/login', loginHandler);
route.post('/request', requestPasswordReset);
route.post('/reset',  resetPassword);
route.post('/verify', verifyResetCode);
route.get('/auth', validation, (req, res) => {
    res.json(req.user)
})


module.exports = route;