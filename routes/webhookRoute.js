const express = require('express');
const { unifiedWebhookHandler } = require('../controllers/webhookController');

const router = express.Router();

router.post("/stripe", unifiedWebhookHandler);
// For others, JSON parser is fine
router.post("/flutterwave", express.json(), unifiedWebhookHandler);
router.post("/paypal", express.json(), unifiedWebhookHandler);
router.post("/wise", express.json(), unifiedWebhookHandler);


module.exports = router;
