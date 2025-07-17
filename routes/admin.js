const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateJWT, requireAdmin } = require('../middleware/authMiddleware');

// Dashboard page - show pending rooms
router.get('/admindashboard', authenticateJWT, requireAdmin, adminController.dashboard);

// Approve a meeting (update approval to 'อนุมัติ')
router.post('/admindashboard/approve', authenticateJWT, requireAdmin, express.json(), adminController.approveRoom);

// Reject a meeting (delete from DB)
router.post('/admindashboard/reject', authenticateJWT, requireAdmin, express.json(), adminController.rejectRoom);

// Show dashboard with query params (approvedDate, approvedPage)
router.get('/admindashboard', authenticateJWT, requireAdmin, adminController.dashboard);



module.exports = router;
