// backend/server.js - Enhanced version with additional endpoints
require('dotenv').config({ path: '../.env' });

const express = require('express');
const { MongoClient} = require('mongodb');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

let db;

MongoClient.connect(MONGODB_URI)
  .then(async client => {
    console.log('Connected to MongoDB');
    db = client.db();
    
    // Create indexes for better performance (with error handling)
    try {
      // Check if firebaseUid index exists
      const indexes = await db.collection('users').listIndexes().toArray();
      const firebaseUidIndexExists = indexes.some(index => 
        index.key && index.key.firebaseUid
      );
      
      if (!firebaseUidIndexExists) {
        await db.collection('users').createIndex({ firebaseUid: 1 }, { unique: true });
        console.log('Created firebaseUid index');
      } else {
        console.log('firebaseUid index already exists');
      }
      
      // Check if email index exists
      const emailIndexExists = indexes.some(index => 
        index.key && index.key.email && !index.key.firebaseUid
      );
      
      if (!emailIndexExists) {
        await db.collection('users').createIndex({ email: 1 });
        console.log('Created email index');
      } else {
        console.log('email index already exists');
      }
    } catch (indexError) {
      console.warn('Index creation warning:', indexError.message);
      // Continue running even if index creation fails
    }
  })
  .catch(error => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

// Middleware to check database connection
const checkDbConnection = (req, res, next) => {
  if (!db) {
    return res.status(503).json({ error: 'Database not available' });
  }
  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Create or update user
app.post('/api/users', checkDbConnection, async (req, res) => {
  try {
    const userData = req.body;
    
    // Validate required fields
    if (!userData.firebaseUid || !userData.email) {
      return res.status(400).json({ error: 'firebaseUid and email are required' });
    }
    
    // Check if user already exists
    const existingUser = await db.collection('users').findOne({
      firebaseUid: userData.firebaseUid
    });

    if (existingUser) {
      // Update existing user
      const updateData = {
        lastLogin: new Date(),
        email: userData.email,
        displayName: userData.displayName,
        photoURL: userData.photoURL,
        emailVerified: userData.emailVerified,
        phone: userData.phone
      };
      
      // Remove undefined values
      Object.keys(updateData).forEach(key => 
        updateData[key] === undefined && delete updateData[key]
      );

      const result = await db.collection('users').updateOne(
        { firebaseUid: userData.firebaseUid },
        { $set: updateData }
      );
      
      // Get updated user
      const updatedUser = await db.collection('users').findOne({
        firebaseUid: userData.firebaseUid
      });
      
      res.json({ 
        message: 'User login updated', 
        user: updatedUser,
        modified: result.modifiedCount > 0
      });
    } else {
      // Create new user
      const newUserData = {
        ...userData,
        createdAt: new Date(),
        lastLogin: new Date()
      };
      
      const result = await db.collection('users').insertOne(newUserData);
      res.status(201).json({ 
        message: 'User created', 
        userId: result.insertedId,
        user: newUserData
      });
    }
  } catch (error) {
    console.error('Error handling user:', error);
    
    if (error.code === 11000) {
      // Duplicate key error
      res.status(409).json({ error: 'User already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Get user by Firebase UID
app.get('/api/users/:firebaseUid', checkDbConnection, async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    
    if (!firebaseUid) {
      return res.status(400).json({ error: 'firebaseUid is required' });
    }

    const user = await db.collection('users').findOne({ firebaseUid });
    
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
app.patch('/api/users/:firebaseUid', checkDbConnection, async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    const updateData = req.body;
    
    if (!firebaseUid) {
      return res.status(400).json({ error: 'firebaseUid is required' });
    }

    // Remove firebaseUid from update data to prevent modification
    delete updateData.firebaseUid;
    delete updateData._id;
    
    // Add lastUpdated timestamp
    updateData.lastUpdated = new Date();

    const result = await db.collection('users').updateOne(
      { firebaseUid },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get updated user
    const updatedUser = await db.collection('users').findOne({ firebaseUid });
    
    res.json({ 
      message: 'User updated successfully', 
      user: updatedUser,
      modified: result.modifiedCount > 0
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user (soft delete by adding deletedAt field)
app.delete('/api/users/:firebaseUid', checkDbConnection, async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    
    if (!firebaseUid) {
      return res.status(400).json({ error: 'firebaseUid is required' });
    }

    const result = await db.collection('users').updateOne(
      { firebaseUid },
      { $set: { deletedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users (with pagination and filtering)
app.get('/api/users', checkDbConnection, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build filter query
    const filter = { deletedAt: { $exists: false } }; // Exclude deleted users
    
    if (req.query.email) {
      filter.email = { $regex: req.query.email, $options: 'i' };
    }
    
    if (req.query.verified !== undefined) {
      filter.emailVerified = req.query.verified === 'true';
    }

    // Get total count
    const total = await db.collection('users').countDocuments(filter);
    
    // Get users with pagination
    const users = await db.collection('users')
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

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
app.get('/api/sync/status', checkDbConnection, async (req, res) => {
  try {
    const userCount = await db.collection('users').countDocuments({
      deletedAt: { $exists: false }
    });
    
    const recentUsers = await db.collection('users').countDocuments({
      lastLogin: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
      deletedAt: { $exists: false }
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