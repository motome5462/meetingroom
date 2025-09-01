const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateJWT, requireAdmin } = require('../middleware/authMiddleware');

router.get('/admindashboard', authenticateJWT, requireAdmin, adminController.dashboard);

// Use controller for delete
router.post('/admindashboard/delete', authenticateJWT, requireAdmin, express.json(), adminController.deleteMeeting);

// Edit meeting routes
router.get('/edit-meeting/:id', authenticateJWT, requireAdmin, adminController.getEditMeeting);
router.post('/edit-meeting/:id', authenticateJWT, requireAdmin, express.urlencoded({ extended: true }), adminController.postEditMeeting);

module.exports = router;