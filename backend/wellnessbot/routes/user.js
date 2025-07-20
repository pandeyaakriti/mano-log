const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Create or update user
router.post('/create', async (req, res) => {
  try {
    const { 
      firebaseUid, 
      email, 
      username, 
      displayName, 
      photoURL,
      phone,
      timezone = 'UTC'
    } = req.body;

    // Validate required fields
    if (!firebaseUid || !email) {
      return res.status(400).json({ 
        error: 'firebaseUid and email are required' 
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { firebaseUid: firebaseUid }
    });

    let user;
    if (existingUser) {
      // Update existing user
      user = await prisma.user.update({
        where: { firebaseUid: firebaseUid },
        data: {
          email,
          username,
          displayName,
          photoURL,
          phone,
          timezone,
          lastLogin: new Date(),
          updatedAt: new Date()
        }
      });
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          firebaseUid,
          email,
          username,
          displayName,
          photoURL,
          phone,
          timezone,
          lastLogin: new Date(),
          emailVerified: false
        }
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        photoURL: user.photoURL,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('User creation error:', error);
    res.status(500).json({ 
      error: 'Failed to create/update user',
      details: error.message 
    });
  }
});

// Get user profile
router.get('/profile/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;

    const user = await prisma.user.findUnique({
      where: { firebaseUid: firebaseUid },
      include: {
        _count: {
          select: {
            journalEntries: true,
            moodEntries: true,
            chatMessages: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        photoURL: user.photoURL,
        phone: user.phone,
        timezone: user.timezone,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        stats: {
          journalEntries: user._count.journalEntries,
          moodEntries: user._count.moodEntries,
          chatMessages: user._count.chatMessages
        }
      }
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ 
      error: 'Failed to get user profile',
      details: error.message 
    });
  }
});

// Update user profile
router.put('/profile/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    const { 
      username, 
      displayName, 
      phone, 
      timezone,
      photoURL 
    } = req.body;

    const user = await prisma.user.update({
      where: { firebaseUid: firebaseUid },
      data: {
        username,
        displayName,
        phone,
        timezone,
        photoURL,
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        photoURL: user.photoURL,
        phone: user.phone,
        timezone: user.timezone,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({ 
      error: 'Failed to update user profile',
      details: error.message 
    });
  }
});

// Record user login
router.post('/login/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;

    const user = await prisma.user.update({
      where: { firebaseUid: firebaseUid },
      data: {
        lastLogin: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Login recorded',
      lastLogin: user.lastLogin
    });

  } catch (error) {
    console.error('Record login error:', error);
    res.status(500).json({ 
      error: 'Failed to record login',
      details: error.message 
    });
  }
});

// Delete user account
router.delete('/account/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;

    // This will cascade delete all related data due to Prisma schema
    const deletedUser = await prisma.user.delete({
      where: { firebaseUid: firebaseUid }
    });

    res.json({
      success: true,
      message: 'User account deleted successfully',
      deletedUser: {
        id: deletedUser.id,
        email: deletedUser.email
      }
    });

  } catch (error) {
    console.error('Delete user account error:', error);
    res.status(500).json({ 
      error: 'Failed to delete user account',
      details: error.message 
    });
  }
});

module.exports = router;