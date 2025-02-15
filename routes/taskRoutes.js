const express = require('express');
const route = express.Router();
const {
    createTaskHandler,
    updateTaskHandler,
    deleteTaskHandler,
    getAllTasksHandler
} = require('../controllers/taskController');


route.post('/create', createTaskHandler);
route.put('/update/:taskId', updateTaskHandler);
route.delete('/delete/:taskId', deleteTaskHandler);
route.get('/all', getAllTasksHandler);

module.exports = route;