const express = require('express');
const route = express.Router();
const { validation } = require('../middleware/auth');
const {
    SignupHandlerTaskEarner,
    loginHandler,
    SignupHandlerTaskCreator,
    requestPasswordReset,
    resetPassword,
} = require('../controllers/userController');


route.post('/earn', SignupHandlerTaskEarner);
route.post('/create', SignupHandlerTaskCreator);
route.post('/login', loginHandler);
route.post('/request', validation, requestPasswordReset);
route.post('/reset', validation, resetPassword);
//route.put('/send', validation, sendEmail);
route.get('/auth', validation, (req, res) => {
    res.json(req.user)
})


module.exports = route;