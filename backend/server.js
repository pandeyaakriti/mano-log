// backend/server.js - Using Prisma instead of MongoDB driver
require('dotenv').config({ path: '../.env' });

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Prisma
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());

// Test database connection
async function testConnection() {
  try {
    await prisma.$connect();
    console.log('Connected to database via Prisma');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
}

testConnection();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Create or update user
app.post('/api/users', async (req, res) => {
  try {
    const userData = req.body;
    
    // Validate required fields
    if (!userData.firebaseUid || !userData.email) {
      return res.status(400).json({ error: 'firebaseUid and email are required' });
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { firebaseUid: userData.firebaseUid }
    });

    if (existingUser) {
      // Update existing user
      const updatedUser = await prisma.user.update({
        where: { firebaseUid: userData.firebaseUid },
        data: {
          lastLogin: new Date(),
          email: userData.email,
          displayName: userData.displayName,
          photoURL: userData.photoURL,
          emailVerified: userData.emailVerified,
          phone: userData.phone,
        }
      });
      
      res.json({ 
        message: 'User login updated', 
        user: updatedUser,
        modified: true
      });
    } else {
      // Create new user
      const newUser = await prisma.user.create({
        data: {
          firebaseUid: userData.firebaseUid,
          email: userData.email,
          displayName: userData.displayName,
          photoURL: userData.photoURL,
          emailVerified: userData.emailVerified,
          phone: userData.phone,
          createdAt: new Date(),
          lastLogin: new Date()
        }
      });
      
      res.status(201).json({ 
        message: 'User created', 
        user: newUser
      });
    }
  } catch (error) {
    console.error('Error handling user:', error);
    
    if (error.code === 'P2002') {
      // Prisma unique constraint error
      res.status(409).json({ error: 'User already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Get user by Firebase UID
app.get('/api/users/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    
    if (!firebaseUid) {
      return res.status(400).json({ error: 'firebaseUid is required' });
    }

    const user = await prisma.user.findUnique({
      where: { firebaseUid }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
app.patch('/api/users/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    const updateData = req.body;
    
    if (!firebaseUid) {
      return res.status(400).json({ error: 'firebaseUid is required' });
    }

    // Remove fields that shouldn't be updated
    delete updateData.firebaseUid;
    delete updateData.id;
    delete updateData.createdAt;
    
    // Add lastUpdated timestamp
    updateData.lastUpdated = new Date();

    const updatedUser = await prisma.user.update({
      where: { firebaseUid },
      data: updateData
    });
    
    res.json({ 
      message: 'User updated successfully', 
      user: updatedUser,
      modified: true
    });
  } catch (error) {
    console.error('Error updating user:', error);
    
    if (error.code === 'P2025') {
      // Prisma record not found
      res.status(404).json({ error: 'User not found' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Delete user (soft delete)
app.delete('/api/users/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    
    if (!firebaseUid) {
      return res.status(400).json({ error: 'firebaseUid is required' });
    }

    const deletedUser = await prisma.user.update({
      where: { firebaseUid },
      data: { deletedAt: new Date() }
    });

    res.json({ 
      message: 'User deleted successfully',
      user: deletedUser 
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'User not found' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Get all users (with pagination)
app.get('/api/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build where clause
    const where = { deletedAt: null };
    
    if (req.query.email) {
      where.email = { contains: req.query.email, mode: 'insensitive' };
    }
    
    if (req.query.verified !== undefined) {
      where.emailVerified = req.query.verified === 'true';
    }

    // Get total count and users
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      })
    ]);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sync status endpoint
app.get('/api/sync/status', async (req, res) => {
  try {
    const userCount = await prisma.user.count({
      where: { deletedAt: null }
    });
    
    const recentUsers = await prisma.user.count({
      where: {
        lastLogin: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        deletedAt: null
      }
    });

    res.json({
      status: 'healthy',
      totalUsers: userCount,
      activeUsersLast24h: recentUsers,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting sync status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});