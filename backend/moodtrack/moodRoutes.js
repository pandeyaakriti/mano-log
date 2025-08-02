// backend/moodtrack/moodRoutes.js
const express = require('express');
const router = express.Router();
const {
  createMoodEntry,
  getMoodEntries,
  getMoodEntryById,
  deleteMoodEntry,
  getMoodStats
} = require('./moodController');
const {
  getUserMoodTrends,
  getMoodInsights,
  hasMoodToday
} = require('./moodHelpers');

// POST /api/moodtrack - Create a new mood entry
router.post('/', createMoodEntry);

// GET /api/moodtrack - Get all mood entries
router.get('/', getMoodEntries);

// GET /api/moodtrack/stats - Get mood statistics
router.get('/stats', getMoodStats);

// GET /api/moodtrack/trends/:userId - Get user mood trends
router.get('/trends/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;
    
    const trends = await getUserMoodTrends(userId, parseInt(days));
    
    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    console.error('Error fetching mood trends:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/moodtrack/insights/:userId - Get user mood insights
router.get('/insights/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;
    
    const insights = await getMoodInsights(userId, parseInt(days));
    
    res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    console.error('Error fetching mood insights:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/moodtrack/today/:userId - Check if user logged mood today
router.get('/today/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const hasLogged = await hasMoodToday(userId);
    
    res.json({
      success: true,
      data: { hasLoggedToday: hasLogged }
    });
  } catch (error) {
    console.error('Error checking daily mood:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/moodtrack/:id - Get mood entry by ID
router.get('/:id', getMoodEntryById);

// DELETE /api/moodtrack/:id - Delete mood entry
router.delete('/:id', deleteMoodEntry);

module.exports = router;