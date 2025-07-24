//backend/server.js
require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const chatRouter = require('./wellnessbot/routes/chat');
const journalRoutes = require('./journal/journal.routes');

const app = express();
const PORT = process.env.PORT_ROOT || 5000;
const prisma = new PrismaClient();

app.use(cors({
   origin: '*', // Be more specific in production
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Accept']
}));
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', req.body);
  }
  next();
});

// Test DB connection
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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), service:'mano-log' });
});

app.use('/api/chat', chatRouter);
app.use ('/api/journal', journalRoutes);

//check if journal routes is working
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!', timestamp: new Date() });
});

// Get user by Firebase UID
app.get('/api/users/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    if (!firebaseUid) return res.status(400).json({ error: 'firebaseUid is required' });

    const user = await prisma.user.findUnique({ where: { firebaseUid } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create or update user (no username uniqueness check)
app.post('/api/users', async (req, res) => {
  try {
    const userData = req.body;

    if (!userData.firebaseUid || !userData.email) {
      return res.status(400).json({ error: 'firebaseUid and email are required' });
    }

    // Upsert user without username uniqueness check
    const user = await prisma.user.upsert({
      where: { firebaseUid: userData.firebaseUid },
      update: {
        lastLogin: new Date(),
        email: userData.email,
        displayName: userData.displayName,
        photoURL: userData.photoURL,
        emailVerified: userData.emailVerified,
        phone: userData.phone,
        username: userData.username,
      },
      create: {
        firebaseUid: userData.firebaseUid,
        email: userData.email,
        displayName: userData.displayName,
        photoURL: userData.photoURL,
        emailVerified: userData.emailVerified,
        phone: userData.phone,
        username: userData.username,
        createdAt: new Date(),
        lastLogin: new Date()
      }
    });

    res.status(200).json({
      message: 'User upserted successfully',
      user,
      modified: true
    });

  } catch (error) {
    console.error('Error upserting user:', error);
    // Handle Prisma unique constraint errors only for firebaseUid and email now
    if (error.code === 'P2002') {
      const target = error.meta?.target;
      if (target.includes('firebaseUid')) {
        return res.status(409).json({ error: 'User with this firebaseUid already exists' });
      }
      if (target.includes('email')) {
        return res.status(409).json({ error: 'Email already in use' });
      }
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user partially by firebaseUid (no username uniqueness check)
app.patch('/api/users/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    const updateData = req.body;

    if (!firebaseUid) return res.status(400).json({ error: 'firebaseUid is required' });

    // Clean fields not allowed to update
    delete updateData.firebaseUid;
    delete updateData.id;
    delete updateData.createdAt;

    updateData.updatedAt = new Date();

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
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Soft delete user by firebaseUid
app.delete('/api/users/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    if (!firebaseUid) return res.status(400).json({ error: 'firebaseUid is required' });

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
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sync status endpoint (example usage)
app.get('/api/sync/status', async (req, res) => {
  try {
    const userCount = await prisma.user.count({ where: { deletedAt: null } });
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(` Main server running on port ${PORT}`);
  console.log(` Health check: http://localhost:${PORT}/health`);
  console.log(` Journal API: http://localhost:${PORT}/api/journal`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});