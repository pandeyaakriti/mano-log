// backend/moodtrack/moodController.js
const { PrismaClient } = require('@prisma/client');
const { updateUserStreak } = require('../trends/trendsHelper');
const prisma = new PrismaClient();

// Create a new mood entry
const createMoodEntry = async (req, res) => {
  try {
    console.log('Received mood entry request:', req.body); // Debug log

    const { moodType, intensity, note, userId } = req.body;

    // Validate required fields
    if (!moodType || !userId) {
      console.log('Validation failed: Missing required fields', { moodType, userId }); // Debug log
      return res.status(400).json({
        success: false,
        error: 'MoodType and userId are required',
        details: { moodType: !!moodType, userId: !!userId }
      });
    }

    // Validate MongoDB ObjectId format
    if (!isValidObjectId(userId)) {
      console.log('Invalid ObjectId format:', userId); // Debug log
      return res.status(400).json({
        success: false,
        error: 'Invalid userId format. Must be a valid MongoDB ObjectId',
        receivedUserId: userId
      });
    }

    // Validate mood type enum (matching your Prisma schema)
    const validMoodTypes = ['HAPPY', 'CALM', 'SAD', 'ANXIOUS', 'ANGRY', 'TIRED', 'EXCITED', 'NEUTRAL'];
    if (!validMoodTypes.includes(moodType)) {
      console.log('Invalid mood type:', moodType, 'Valid types:', validMoodTypes); // Debug log
      return res.status(400).json({
        success: false,
        error: `Invalid mood type. Valid types are: ${validMoodTypes.join(', ')}`,
        receivedMoodType: moodType
      });
    }

    // Validate intensity (1-10 scale)
    const moodIntensity = intensity || 5;
    if (moodIntensity < 1 || moodIntensity > 10) {
      console.log('Invalid intensity:', moodIntensity); // Debug log
      return res.status(400).json({
        success: false,
        error: 'Intensity must be between 1 and 10',
        receivedIntensity: moodIntensity
      });
    }

    // Check if user exists
    console.log('Checking if user exists:', userId); // Debug log
    let userExists;
    try {
      userExists = await prisma.user.findUnique({
        where: { id: userId }
      });
      console.log('User lookup result:', userExists ? 'Found' : 'Not found'); // Debug log
    } catch (userLookupError) {
      console.error('Error looking up user:', userLookupError);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify user',
        details: userLookupError.message
      });
    }

    if (!userExists) {
      console.log('User not found:', userId); // Debug log
      
      // Try to find user by firebaseUid if the provided userId might be a firebaseUid
      try {
        const userByFirebaseUid = await prisma.user.findUnique({
          where: { firebaseUid: userId }
        });
        
        if (userByFirebaseUid) {
          console.log('Found user by firebaseUid, using correct userId:', userByFirebaseUid.id);
          // Update the userId to the correct MongoDB ObjectId
          const correctedUserId = userByFirebaseUid.id;
          
          const moodEntry = await prisma.moodEntry.create({
            data: {
              moodType,
              intensity: moodIntensity,
              note: note || null,
              userId: correctedUserId
            },
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  email: true
                }
              }
            }
          });

          console.log('Mood entry created successfully:', moodEntry.id);

          // Update user streak (new functionality)
          try {
            const streakInfo = await updateUserStreak(correctedUserId);
            console.log('Streak updated:', streakInfo);
          } catch (streakError) {
            console.error('Error updating streak:', streakError);
            // Don't fail the whole request if streak update fails
          }

          return res.status(201).json({
            success: true,
            data: moodEntry,
            message: 'Mood entry created successfully'
          });
        }
      } catch (firebaseUidError) {
        console.error('Error looking up user by firebaseUid:', firebaseUidError);
      }

      return res.status(404).json({
        success: false,
        error: 'User not found. Please ensure the user is registered.',
        userId: userId,
        suggestion: 'Try logging in again or contact support'
      });
    }

    console.log('Creating mood entry with data:', { moodType, intensity: moodIntensity, note, userId }); // Debug log

    const moodEntry = await prisma.moodEntry.create({
      data: {
        moodType,
        intensity: moodIntensity,
        note: note || null,
        userId
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true
          }
        }
      }
    });

    console.log('Mood entry created successfully:', moodEntry.id); // Debug log

    // Update user streak (new functionality)
    try {
      const streakInfo = await updateUserStreak(userId);
      console.log('Streak updated:', streakInfo);
    } catch (streakError) {
      console.error('Error updating streak:', streakError);
      // Don't fail the whole request if streak update fails
    }

    res.status(201).json({
      success: true,
      data: moodEntry,
      message: 'Mood entry created successfully'
    });

  } catch (error) {
    console.error('Detailed error creating mood entry:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    });

    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Duplicate entry constraint violation',
        details: error.meta
      });
    }

    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        error: 'Foreign key constraint failed - invalid userId',
        details: error.meta
      });
    }

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Record not found',
        details: error.meta
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.message
      });
    }

    // Generic error response
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred while creating the mood entry',
      ...(process.env.NODE_ENV === 'development' && { 
        details: error.message,
        errorCode: error.code 
      })
    });
  }
};

// Helper function to validate MongoDB ObjectId
const isValidObjectId = (id) => {
  // MongoDB ObjectId is 24 characters long and contains only hexadecimal characters
  return /^[0-9a-fA-F]{24}$/.test(id);
};

// Get all mood entries (with user filtering)
const getMoodEntries = async (req, res) => {
  try {
    const { userId, limit = 50, page = 1, moodType } = req.query;
    
    console.log('Fetching mood entries with params:', { userId, limit, page, moodType }); // Debug log
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let where = {};
    
    if (userId) {
      if (!isValidObjectId(userId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid userId format'
        });
      }
      where.userId = userId;
    }
    
    if (moodType) {
      const validMoodTypes = ['HAPPY', 'CALM', 'SAD', 'ANXIOUS', 'ANGRY', 'TIRED', 'EXCITED', 'NEUTRAL'];
      if (!validMoodTypes.includes(moodType)) {
        return res.status(400).json({
          success: false,
          error: `Invalid mood type. Valid types are: ${validMoodTypes.join(', ')}`
        });
      }
      where.moodType = moodType;
    }
    
    const moodEntries = await prisma.moodEntry.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip
    });

    const total = await prisma.moodEntry.count({ where });

    console.log(`Found ${moodEntries.length} mood entries out of ${total} total`); // Debug log

    res.json({
      success: true,
      data: moodEntries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching mood entries:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch mood entries',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
};

// Get mood entry by ID
const getMoodEntryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid mood entry ID format'
      });
    }

    console.log('Fetching mood entry by ID:', id); // Debug log

    const moodEntry = await prisma.moodEntry.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true
          }
        }
      }
    });

    if (!moodEntry) {
      console.log('Mood entry not found:', id); // Debug log
      return res.status(404).json({
        success: false,
        error: 'Mood entry not found',
        entryId: id
      });
    }

    console.log('Mood entry found:', moodEntry.id); // Debug log

    res.json({
      success: true,
      data: moodEntry
    });

  } catch (error) {
    console.error('Error fetching mood entry:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch mood entry',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
};

// Delete mood entry
const deleteMoodEntry = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid mood entry ID format'
      });
    }

    console.log('Deleting mood entry:', id); // Debug log

    const moodEntry = await prisma.moodEntry.findUnique({
      where: { id }
    });

    if (!moodEntry) {
      console.log('Mood entry not found for deletion:', id); // Debug log
      return res.status(404).json({
        success: false,
        error: 'Mood entry not found',
        entryId: id
      });
    }

    await prisma.moodEntry.delete({
      where: { id }
    });

    console.log('Mood entry deleted successfully:', id); // Debug log

    res.json({
      success: true,
      message: 'Mood entry deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting mood entry:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to delete mood entry',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
};

// Get mood statistics
const getMoodStats = async (req, res) => {
  try {
    const { userId, days = 30 } = req.query;
    
    console.log('Fetching mood stats for:', { userId, days }); // Debug log
    
    if (userId && !isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid userId format'
      });
    }
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const where = {
      createdAt: { gte: startDate },
      ...(userId && { userId })
    };

    // Mood type distribution
    const moodTypeStats = await prisma.moodEntry.groupBy({
      by: ['moodType'],
      where,
      _count: {
        moodType: true
      },
      _avg: {
        intensity: true
      }
    });

    // Average intensity over time
    const intensityStats = await prisma.moodEntry.aggregate({
      where,
      _avg: {
        intensity: true
      },
      _min: {
        intensity: true
      },
      _max: {
        intensity: true
      }
    });

    const totalEntries = await prisma.moodEntry.count({ where });

    console.log(`Mood stats calculated: ${totalEntries} entries, ${moodTypeStats.length} mood types`); // Debug log

    const moodDistribution = moodTypeStats.map(stat => ({
      moodType: stat.moodType,
      count: stat._count.moodType,
      percentage: totalEntries > 0 ? ((stat._count.moodType / totalEntries) * 100).toFixed(2) : '0.00',
      avgIntensity: stat._avg.intensity ? parseFloat(stat._avg.intensity.toFixed(2)) : 0
    }));

    res.json({
      success: true,
      data: {
        moodDistribution,
        intensityStats,
        totalEntries,
        period: `${days} days`
      }
    });

  } catch (error) {
    console.error('Error fetching mood stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch mood statistics',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
};

// Health check for mood service
const healthCheck = async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      success: true,
      service: 'mood-tracker',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      success: false,
      service: 'mood-tracker',
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
};

// Create a test user (for development/testing)
const createTestUser = async (req, res) => {
  try {
    const testUser = await prisma.user.create({
      data: {
        firebaseUid: 'test-firebase-uid-' + Date.now(),
        email: `test${Date.now()}@example.com`,
        displayName: 'Test User',
        username: 'testuser',
        emailVerified: true,
        lastLogin: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Test user created successfully',
      data: testUser
    });
  } catch (error) {
    console.error('Error creating test user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create test user',
      details: error.message
    });
  }
};

module.exports = {
  createMoodEntry,
  getMoodEntries,
  getMoodEntryById,
  deleteMoodEntry,
  getMoodStats,
  healthCheck,
  createTestUser,
  isValidObjectId
};