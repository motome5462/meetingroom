const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateJWT, requireAdmin } = require('../middleware/authMiddleware');

router.get('/admindashboard', authenticateJWT, requireAdmin, adminController.dashboard);
router.post('/admindashboard/approve', authenticateJWT, requireAdmin, express.json(), adminController.approveRoom);
router.post('/admindashboard/reject', authenticateJWT, requireAdmin, express.json(), adminController.rejectRoom);

module.exports = router;
