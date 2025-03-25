const express = require('express');
const { handleWithdrawal } = require('../controllers/withdrawalController');
const { validation } = require("../middleware/auth");

const router = express.Router();

router.post("/withdraw", validation, handleWithdrawal);


module.exports = router;
