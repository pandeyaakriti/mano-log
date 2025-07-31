// backend/trends/trendsRoutes.js
const express = require('express');
const router = express.Router();
const { getWeeklyTrends, getMonthlyTrends, getMoodStats } = require('./trendsController');
const { getMoodInsights, getMoodDistribution, generateMoodSummary } = require('./trendsHelper');

// Enhanced middleware to extract userId with better error handling
const extractUserId = (req, res, next) => {
  try {
    let userId = null;

    // Method 1: From URL parameters (if route has :userId)
    if (req.params.userId) {
      userId = req.params.userId;
    }
    // Method 2: From query parameters (?userId=...)
    else if (req.query.userId) {
      userId = req.query.userId;
    }
    // Method 3: From request body
    else if (req.body && req.body.userId) {
      userId = req.body.userId;
    }
    // Method 4: From custom header (if you're sending it from frontend)
    else if (req.headers['x-user-id']) {
      userId = req.headers['x-user-id'];
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required. Provide it via URL parameter, query parameter, request body, or X-User-Id header.',
        examples: [
          'GET /api/trends/weekly/USER_ID',
          'GET /api/trends/weekly?userId=USER_ID',
          'Headers: X-User-Id: USER_ID'
        ]
      });
    }

    // Validate userId format (assuming MongoDB ObjectId)
    if (!/^[0-9a-fA-F]{24}$/.test(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format. Expected 24-character hexadecimal string.'
      });
    }

    // Add user object to match controller expectations
    req.user = { userId };
    next();

  } catch (error) {
    console.error('Error extracting user ID:', error);
    res.status(400).json({
      success: false,
      message: 'Invalid user ID format',
      error: error.message
    });
  }
};

// Middleware to validate algorithm parameter
const validateAlgorithm = (req, res, next) => {
  const algorithm = req.query.algorithm;
  const validAlgorithms = ['latest', 'mostFrequent', 'weightedAverage', 'dominantMood'];
  
  if (algorithm && !validAlgorithms.includes(algorithm)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid aggregation algorithm',
      validAlgorithms: validAlgorithms,
      provided: algorithm
    });
  }
  
  next();
};

// Main trend routes with algorithm support
// GET /api/trends/weekly?userId=...&algorithm=... - Get weekly trends for user
router.get('/weekly', extractUserId, validateAlgorithm, getWeeklyTrends);

// GET /api/trends/monthly?userId=...&algorithm=... - Get monthly trends for user  
router.get('/monthly', extractUserId, validateAlgorithm, getMonthlyTrends);

// GET /api/trends/stats?userId=...&algorithm=... - Get mood statistics for user
router.get('/stats', extractUserId, validateAlgorithm, getMoodStats);

// Alternative routes with userId in path (more RESTful)
// GET /api/trends/weekly/:userId?algorithm=... - Get weekly trends for specific user
router.get('/weekly/:userId', extractUserId, validateAlgorithm, getWeeklyTrends);

// GET /api/trends/monthly/:userId?algorithm=... - Get monthly trends for specific user
router.get('/monthly/:userId', extractUserId, validateAlgorithm, getMonthlyTrends);

// GET /api/trends/stats/:userId?algorithm=... - Get mood statistics for specific user
router.get('/stats/:userId', extractUserId, validateAlgorithm, getMoodStats);

// Enhanced summary endpoint that returns all trend data in one request
// GET /api/trends/summary/:userId?algorithm=... - Get comprehensive trends summary
router.get('/summary/:userId', extractUserId, validateAlgorithm, async (req, res) => {
  try {
    const userId = req.user.userId;
    const algorithm = req.query.algorithm || 'mostFrequent'; // Default to dominantMood if not specified

    console.log(`Getting comprehensive trends summary for user: ${userId} using algorithm: ${algorithm}`);

    // Fetch all data in parallel for better performance
    const [weeklyResponse, monthlyResponse, statsResponse, insights] = await Promise.allSettled([
      // Simulate the controller calls by creating mock request objects
      new Promise((resolve, reject) => {
        const mockReq = { user: { userId }, query: { algorithm } };
        const mockRes = {
          json: (data) => resolve(data),
          status: (code) => ({ json: (data) => reject({ status: code, ...data }) })
        };
        getWeeklyTrends(mockReq, mockRes);
      }),
      new Promise((resolve, reject) => {
        const mockReq = { user: { userId }, query: { algorithm } };
        const mockRes = {
          json: (data) => resolve(data),
          status: (code) => ({ json: (data) => reject({ status: code, ...data }) })
        };
        getMonthlyTrends(mockReq, mockRes);
      }),
      new Promise((resolve, reject) => {
        const mockReq = { user: { userId }, query: { algorithm } };
        const mockRes = {
          json: (data) => resolve(data),
          status: (code) => ({ json: (data) => reject({ status: code, ...data }) })
        };
        getMoodStats(mockReq, mockRes);
      }),
      getMoodInsights(userId, 30) // Last 30 days insights
    ]);

    const summary = {
      success: true,
      userId: userId,
      algorithm: algorithm,
      generatedAt: new Date().toISOString(),
      data: {}
    };

    // Add successful responses to summary
    if (weeklyResponse.status === 'fulfilled' && weeklyResponse.value.success) {
      summary.data.weekly = weeklyResponse.value.data;
    }

    if (monthlyResponse.status === 'fulfilled' && monthlyResponse.value.success) {
      summary.data.monthly = monthlyResponse.value.data;
    }

    if (statsResponse.status === 'fulfilled' && statsResponse.value.success) {
      summary.data.stats = statsResponse.value.data;
    }

    if (insights.status === 'fulfilled') {
      summary.data.insights = insights.value;
    }

    // Add any errors encountered
    const errors = [];
    if (weeklyResponse.status === 'rejected') errors.push({ type: 'weekly', error: weeklyResponse.reason });
    if (monthlyResponse.status === 'rejected') errors.push({ type: 'monthly', error: monthlyResponse.reason });
    if (statsResponse.status === 'rejected') errors.push({ type: 'stats', error: statsResponse.reason });
    if (insights.status === 'rejected') errors.push({ type: 'insights', error: insights.reason });

    if (errors.length > 0) {
      summary.partialSuccess = true;
      summary.errors = errors;
    }

    res.json(summary);

  } catch (error) {
    console.error('Error getting trends summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get trends summary',
      error: error.message
    });
  }
});

// New endpoint for mood distribution analysis
// GET /api/trends/distribution/:userId?days=30&strategy=latest
router.get('/distribution/:userId', extractUserId, async (req, res) => {
  try {
    const userId = req.user.userId;
    const days = parseInt(req.query.days) || 30;
    const strategy = req.query.strategy || 'mostFrequent'; // Default to mostFrequent if not specified

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const distribution = await getMoodDistribution(userId, startDate, endDate, strategy);

    res.json({
      success: true,
      data: distribution,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        days: days
      }
    });

  } catch (error) {
    console.error('Error getting mood distribution:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get mood distribution',
      error: error.message
    });
  }
});

// New endpoint for mood insights
// GET /api/trends/insights/:userId?days=30
router.get('/insights/:userId', extractUserId, async (req, res) => {
  try {
    const userId = req.user.userId;
    const days = parseInt(req.query.days) || 30;

    const insights = await getMoodInsights(userId, days);

    res.json({
      success: true,
      data: insights
    });

  } catch (error) {
    console.error('Error getting mood insights:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get mood insights',
      error: error.message
    });
  }
});

// New endpoint to generate mood summary for a custom period
// POST /api/trends/generate-summary/:userId
router.post('/generate-summary/:userId', extractUserId, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { periodType, startDate, endDate, strategy } = req.body;

    if (!periodType || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'periodType, startDate, and endDate are required',
        example: {
          periodType: 'WEEK', // or 'MONTH'
          startDate: '2024-01-01T00:00:00.000Z',
          endDate: '2024-01-07T23:59:59.999Z',
          strategy: 'mostFrequent' // optional
        }
      });
    }

    const summary = await generateMoodSummary(
      userId,
      periodType,
      new Date(startDate),
      new Date(endDate),
      strategy || 'mostFrequent' 
    );

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('Error generating mood summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate mood summary',
      error: error.message
    });
  }
});

// Documentation endpoint
// GET /api/trends/docs - Get API documentation
router.get('/docs', (req, res) => {
  res.json({
    success: true,
    documentation: {
      title: 'Mood Trends API',
      version: '2.0.0',
      description: 'Enhanced API for mood trend analysis with multiple aggregation algorithms',
      endpoints: {
        'GET /api/trends/weekly/:userId': {
          description: 'Get weekly mood trends',
          parameters: {
            userId: 'User ID (required)',
            algorithm: 'Aggregation algorithm (optional): latest, mostFrequent, weightedAverage, dominantMood'
          }
        },
        'GET /api/trends/monthly/:userId': {
          description: 'Get monthly mood trends',
          parameters: {
            userId: 'User ID (required)',
            algorithm: 'Aggregation algorithm (optional)'
          }
        },
        'GET /api/trends/stats/:userId': {
          description: 'Get mood statistics',
          parameters: {
            userId: 'User ID (required)',
            algorithm: 'Aggregation algorithm (optional)'
          }
        },
        'GET /api/trends/summary/:userId': {
          description: 'Get comprehensive trends summary',
          parameters: {
            userId: 'User ID (required)',
            algorithm: 'Aggregation algorithm (optional)'
          }
        },
        'GET /api/trends/distribution/:userId': {
          description: 'Get mood distribution analysis',
          parameters: {
            userId: 'User ID (required)',
            days: 'Number of days to analyze (default: 30)',
            strategy: 'Aggregation strategy (default: latest)'
          }
        },
        'GET /api/trends/insights/:userId': {
          description: 'Get mood insights and patterns',
          parameters: {
            userId: 'User ID (required)',
            days: 'Number of days to analyze (default: 30)'
          }
        }
      },
      algorithms: {
        latest: 'Uses the most recent mood entry for each day',
        mostFrequent: 'Uses the most frequently occurring mood for each day',
        weightedAverage: 'Calculates a weighted average based on intensity and recency',
        dominantMood: 'Uses the mood with the highest combined frequency and intensity score'
      }
    }
  });
});

module.exports = router;