const express = require('express');
const router = express.Router();
const insightController = require('../controllers/insightController');
const { verifyToken } = require('../middleware/auth'); 

router.get('/', verifyToken, insightController.getDashboardInsights);

module.exports = router;