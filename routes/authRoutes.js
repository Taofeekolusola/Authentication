const express = require('express');
const { googleOauthHandler } = require('../controllers/authControllers');
const route = express.Router();

route.get('/google', googleOauthHandler);

module.exports = route;