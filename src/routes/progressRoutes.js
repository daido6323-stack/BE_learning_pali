const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware, progressController.getProgressForCurrentUser);
router.post('/', authMiddleware, progressController.upsertProgress);

module.exports = router;
