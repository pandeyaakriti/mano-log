// backend/server.js
// Load environment variables from parent directory
require('dotenv').config({ path: '../.env' });

const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection - using environment variable
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

let db;

MongoClient.connect(MONGODB_URI)
  .then(client => {
    console.log('Connected to MongoDB');
    db = client.db(); // Will use the database specified in the connection string
  })
  .catch(error => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

// Routes
app.post('/api/users', async (req, res) => {
  try {
    const userData = req.body;
    
    // Check if user already exists
    const existingUser = await db.collection('users').findOne({
      firebaseUid: userData.firebaseUid
    });

    if (existingUser) {
      // Update last login
      await db.collection('users').updateOne(
        { firebaseUid: userData.firebaseUid },
        { $set: { lastLogin: new Date() } }
      );
      res.json({ message: 'User login updated', user: existingUser });
    } else {
      // Create new user
      const result = await db.collection('users').insertOne(userData);
      res.status(201).json({ message: 'User created', userId: result.insertedId });
    }
  } catch (error) {
    console.error('Error handling user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/users/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});