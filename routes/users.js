const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { isAuthenticated } = require('../middleware/authMiddleware');

// User dashboard route
router.get('/dashboard', isAuthenticated, userController.dashboard);

// 👇 **เพิ่ม Route นี้เข้าไป**
// Create meeting route
router.post('/dashboard/create', isAuthenticated, express.urlencoded({ extended: true }), userController.createMeeting);

// Delete meeting route
router.post('/dashboard/delete', isAuthenticated, express.json(), userController.deleteMeeting);

// Cancel meeting route
router.post('/dashboard/cancel', isAuthenticated, express.json(), userController.cancelMeeting);

// Edit meeting routes
router.get('/edit-meeting/:id', isAuthenticated, userController.editMeetingPage);
router.post('/edit-meeting/:id', isAuthenticated, express.urlencoded({ extended: true }), userController.updateMeeting);


module.exports = router;