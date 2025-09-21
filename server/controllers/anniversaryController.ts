import { Request, Response } from 'express';
import Anniversary, { IAnniversary } from '../models/Anniversary';
import User from '../models/User';
import { sendAnniversaryReminder } from '../utils/email';

// @desc    Get all anniversaries for a user
// @route   GET /api/anniversaries
// @access  Private
const getAnniversaries = async (req: Request, res: Response): Promise<void> => {
  try {
    const anniversaries = await Anniversary.find({ user: (req as any).user._id }).sort({ date: -1 });
    res.json(anniversaries);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single anniversary
// @route   GET /api/anniversaries/:id
// @access  Private
const getAnniversary = async (req: Request, res: Response): Promise<void> => {
  try {
    const anniversary = await Anniversary.findById(req.params.id);

    if (!anniversary) {
      res.status(404).json({ message: 'Anniversary not found' });
      return;
    }

    // Check if user owns anniversary
    if (anniversary.user.toString() !== (req as any).user._id.toString()) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    res.json(anniversary);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new anniversary
// @route   POST /api/anniversaries
// @access  Private
const createAnniversary = async (req: Request, res: Response): Promise<void> => {
  const { title, date, reminderDays } = req.body;

  try {
    const anniversary = await Anniversary.create({
      title,
      date,
      reminderDays,
      user: (req as any).user._id,
    });

    res.status(201).json(anniversary);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update anniversary
// @route   PUT /api/anniversaries/:id
// @access  Private
const updateAnniversary = async (req: Request, res: Response): Promise<void> => {
  const { title, date, reminderDays } = req.body;

  try {
    let anniversary = await Anniversary.findById(req.params.id);

    if (!anniversary) {
      res.status(404).json({ message: 'Anniversary not found' });
      return;
    }

    // Check if user owns anniversary
    if (anniversary.user.toString() !== (req as any).user._id.toString()) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    anniversary = await Anniversary.findByIdAndUpdate(
      req.params.id,
      { title, date, reminderDays },
      { new: true, runValidators: true }
    );

    res.json(anniversary);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete anniversary
// @route   DELETE /api/anniversaries/:id
// @access  Private
const deleteAnniversary = async (req: Request, res: Response): Promise<void> => {
  try {
    const anniversary = await Anniversary.findById(req.params.id);

    if (!anniversary) {
      res.status(404).json({ message: 'Anniversary not found' });
      return;
    }

    // Check if user owns anniversary
    if (anniversary.user.toString() !== (req as any).user._id.toString()) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    await anniversary.deleteOne();

    res.json({ message: 'Anniversary removed' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send anniversary reminder
// @route   POST /api/anniversaries/:id/remind
// @access  Private
const sendReminder = async (req: Request, res: Response): Promise<void> => {
  try {
    const anniversary = await Anniversary.findById(req.params.id).populate('user');

    if (!anniversary) {
      res.status(404).json({ message: 'Anniversary not found' });
      return;
    }

    // Check if user owns anniversary
    if (anniversary.user.toString() !== (req as any).user._id.toString()) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    // Send email reminder
    await sendAnniversaryReminder(
      (anniversary.user as any).email,
      (anniversary.user as any).name,
      anniversary.title,
      anniversary.date
    );

    res.json({ message: 'Reminder sent successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export {
  getAnniversaries,
  getAnniversary,
  createAnniversary,
  updateAnniversary,
  deleteAnniversary,
  sendReminder,
};