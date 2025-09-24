import express from 'express';
import {
  getAnniversaries,
  getAnniversary,
  createAnniversary,
  updateAnniversary,
  deleteAnniversary,
  sendReminder,
  testSendAllReminders,
} from '../controllers/anniversaryController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// All routes are protected
router.route('/')
  .get(protect, getAnniversaries)
  .post(protect, createAnniversary);

router.route('/:id')
  .get(protect, getAnniversary)
  .put(protect, updateAnniversary)
  .delete(protect, deleteAnniversary);

router.route('/:id/remind')
  .post(protect, sendReminder);

router.route('/test-reminders')
  .post(protect, testSendAllReminders);

export default router;