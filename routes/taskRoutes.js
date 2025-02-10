const express = require('express');
const route = express.Router();
const { validation } = require('../middleware/auth');
const {
    createTaskHandler,
    updateTaskHandler,
    deleteTaskHandler,
} = require('../controllers/taskController');


route.post('/create', validation, createTaskHandler);
route.put('/update/:taskId', validation, updateTaskHandler);
route.post('/login', validation, deleteTaskHandler);

module.exports = route;