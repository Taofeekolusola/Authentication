const express = require('express');
const route = express.Router();
const {
    createTaskHandler,
    updateTaskHandler,
    deleteTaskHandler,
} = require('../controllers/taskController');


route.post('/create', createTaskHandler);
route.put('/update/:taskId', updateTaskHandler);
route.delete('/delete/:taskId', deleteTaskHandler);

module.exports = route;