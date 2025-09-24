import { Request, Response } from 'express';
import Anniversary from '../models/Anniversary';
import User from '../models/User';
import { sendAnniversaryReminderToAllUsers } from '../utils/email';
import { triggerManualReminderCheck } from '../utils/scheduler';

// @desc    Get all anniversaries
// @route   GET /api/anniversaries
// @access  Private
const getAnniversaries = async (req: Request, res: Response): Promise<void> => {
  console.log(`📖 [CONTROLLER] GET /api/anniversaries - User requesting all anniversaries`);
  console.log(`📖 [CONTROLLER] - Request from user: ${(req as any).user?.name || 'Unknown'} (${(req as any).user?.email || 'Unknown'})`);
  
  try {
    console.log(`📖 [CONTROLLER] - Querying database for all anniversaries...`);
    const anniversaries = await Anniversary.find().sort({ date: -1 });
    console.log(`📖 [CONTROLLER] - Found ${anniversaries.length} anniversaries in database`);
    
    anniversaries.forEach((anniversary, index) => {
      console.log(`📖 [CONTROLLER] - Anniversary ${index + 1}: "${anniversary.title}" (${anniversary.date.toISOString().split('T')[0]})`);
    });
    
    console.log(`✅ [CONTROLLER] - Successfully returning ${anniversaries.length} anniversaries`);
    res.json(anniversaries);
  } catch (error: any) {
    console.error(`❌ [CONTROLLER] - Error fetching anniversaries:`, error);
    console.error(`❌ [CONTROLLER] - Error message: ${error.message}`);
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
    const anniversary = await Anniversary.findById(req.params.id);

    if (!anniversary) {
      res.status(404).json({ message: 'Anniversary not found' });
      return;
    }

    const updatedAnniversary = await Anniversary.findByIdAndUpdate(
      req.params.id,
      { title, date, reminderDays },
      { new: true, runValidators: true }
    );

    res.json(updatedAnniversary);
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

    await anniversary.deleteOne();

    res.json({ message: 'Anniversary removed' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send anniversary reminder to all users
// @route   POST /api/anniversaries/:id/remind
// @access  Private
const sendReminder = async (req: Request, res: Response): Promise<void> => {
  const anniversaryId = req.params.id;
  console.log(`📤 [CONTROLLER] POST /api/anniversaries/${anniversaryId}/remind - Single anniversary reminder request`);
  console.log(`📤 [CONTROLLER] - Request from user: ${(req as any).user?.name || 'Unknown'} (${(req as any).user?.email || 'Unknown'})`);
  
  try {
    console.log(`📤 [CONTROLLER] - Looking up anniversary by ID: ${anniversaryId}`);
    const anniversary = await Anniversary.findById(anniversaryId);

    if (!anniversary) {
      console.log(`❌ [CONTROLLER] - Anniversary not found: ${anniversaryId}`);
      res.status(404).json({ message: 'Anniversary not found' });
      return;
    }

    console.log(`📤 [CONTROLLER] - Found anniversary: "${anniversary.title}"`);
    console.log(`📤 [CONTROLLER] - Anniversary date: ${anniversary.date.toISOString().split('T')[0]}`);
    console.log(`📤 [CONTROLLER] - Reminder days: ${anniversary.reminderDays}`);

    console.log(`📤 [CONTROLLER] - Fetching all users from database...`);
    // Get all users
    const users = await User.find({}, 'name email');
    console.log(`📤 [CONTROLLER] - Found ${users.length} users in database`);
    
    if (users.length === 0) {
      console.log(`❌ [CONTROLLER] - No users found in the system`);
      res.status(404).json({ message: 'No users found in the system' });
      return;
    }

    users.forEach((user, index) => {
      console.log(`📤 [CONTROLLER] - User ${index + 1}: ${user.name} <${user.email}>`);
    });

    const userList = users.map(user => ({
      email: user.email,
      name: user.name
    }));

    console.log(`📤 [CONTROLLER] - Starting email sending process for "${anniversary.title}"...`);
    // Send email reminder to all users
    const result = await sendAnniversaryReminderToAllUsers(
      userList,
      anniversary.title,
      anniversary.date
    );

    console.log(`✅ [CONTROLLER] - Email sending completed for "${anniversary.title}"`);
    console.log(`✅ [CONTROLLER] - Results: ${result.successful} successful, ${result.failed} failed`);

    res.json({ 
      message: 'Anniversary reminders sent',
      details: {
        successful: result.successful,
        failed: result.failed,
        totalUsers: users.length,
        errors: result.errors
      }
    });
  } catch (error: any) {
    console.error(`❌ [CONTROLLER] - Error in sendReminder:`, error);
    console.error(`❌ [CONTROLLER] - Error message: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Test send all anniversary reminders (for testing purposes)
// @route   POST /api/anniversaries/test-reminders
// @access  Private
const testSendAllReminders = async (req: Request, res: Response): Promise<void> => {
  console.log(`🧪 [CONTROLLER] POST /api/anniversaries/test-reminders - Test all reminders request`);
  console.log(`🧪 [CONTROLLER] - Request from user: ${(req as any).user?.name || 'Unknown'} (${(req as any).user?.email || 'Unknown'})`);
  console.log(`🧪 [CONTROLLER] - This will test send reminders for anniversaries within next 7 days`);
  
  try {
    console.log(`🧪 [CONTROLLER] - Triggering manual reminder check...`);
    const result = await triggerManualReminderCheck();
    
    if (result.success) {
      console.log(`✅ [CONTROLLER] - Test completed successfully`);
      console.log(`✅ [CONTROLLER] - Results: ${result.details?.sent || 0} sent, ${result.details?.failed || 0} failed`);
      res.json({
        message: result.message,
        details: result.details
      });
    } else {
      console.log(`❌ [CONTROLLER] - Test failed: ${result.message}`);
      res.status(400).json({
        message: result.message
      });
    }
  } catch (error: any) {
    console.error(`❌ [CONTROLLER] - Error in testSendAllReminders:`, error);
    console.error(`❌ [CONTROLLER] - Error message: ${error.message}`);
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
  testSendAllReminders,
};