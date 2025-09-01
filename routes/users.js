const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { isAuthenticated } = require('../middleware/authMiddleware');

// User dashboard route
router.get('/dashboard', isAuthenticated, userController.dashboard);

// Delete meeting route
router.post('/dashboard/delete', isAuthenticated, express.json(), userController.deleteMeeting);

module.exports = router;