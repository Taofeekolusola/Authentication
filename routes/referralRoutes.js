const express = require('express');
const { validation } = require('../middleware/auth');
const isTaskEarner = require('../middleware/isTaskEarner');
const { sendReferralInvite, getReferralList } = require('../controllers/referralController');

const route = express.Router();

route.post("/invite", validation, isTaskEarner, sendReferralInvite);
route.get("/link", validation, isTaskEarner,);
route.get("/", validation, isTaskEarner, getReferralList);

module.exports = route;