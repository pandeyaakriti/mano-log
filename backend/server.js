// backend/server.js
require('dotenv').config({ path: '../.env' });

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());

// Test database connection
async function connectDB() {
  try {
    await prisma.$connect();
    console.log('Connected to MongoDB via Prisma');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
}

connectDB();

// Routes
app.post('/api/users', async (req, res) => {
  try {
    const userData = req.body;
    console.log('Received user data:', userData);
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        firebaseUid: userData.firebaseUid
      }
    });

    if (existingUser) {
      // Update last login
      const updatedUser = await prisma.user.update({
        where: { firebaseUid: userData.firebaseUid },
        data: { 
          updatedAt: new Date()
        }
      });
      console.log('User login updated:', updatedUser.email);
      res.json({ message: 'User login updated', user: updatedUser });
    } else {
      // Generate unique username from email or displayName
      const baseUsername = userData.email.split('@')[0] || userData.displayName?.toLowerCase().replace(/\s+/g, '') || 'user';
      let username = baseUsername;
      let counter = 1;
      
      // Ensure username is unique
      while (await prisma.user.findUnique({ where: { username } })) {
        username = `${baseUsername}${counter}`;
        counter++;
      }

      // Create new user according to your Prisma schema
      const newUser = await prisma.user.create({
        data: {
          firebaseUid: userData.firebaseUid,
          email: userData.email,
          username: username,
          displayName: userData.displayName || userData.name || null,
          photoURL: userData.photoURL || null,
          timezone: "UTC", // default as per schema
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      console.log('New user created:', newUser.email);
      res.status(201).json({ message: 'User created', user: newUser });
    }
  } catch (error) {
    console.error('Error handling user:', error);
    
    // Handle Prisma-specific errors
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'User with this email or username already exists' });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/users/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    const user = await prisma.user.findUnique({
      where: { firebaseUid },
      include: {
        journalEntries: {
          orderBy: { createdAt: 'desc' },
          take: 10 // Get last 10 entries
        },
        moodEntries: {
          orderBy: { createdAt: 'desc' },
          take: 10 // Get last 10 mood entries
        }
      }
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

// Additional routes for your app functionality
app.post('/api/users/:firebaseUid/journal', async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    const { textContent, tags } = req.body;
    
    const user = await prisma.user.findUnique({
      where: { firebaseUid }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const journalEntry = await prisma.journalEntry.create({
      data: {
        userId: user.id,
        textContent,
        wordCount: textContent.split(' ').length,
        tags: tags || [],
        entryDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    res.status(201).json({ message: 'Journal entry created', entry: journalEntry });
  } catch (error) {
    console.error('Error creating journal entry:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/users/:firebaseUid/mood', async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    const { moodType, intensity, note } = req.body;
    
    const user = await prisma.user.findUnique({
      where: { firebaseUid }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const moodEntry = await prisma.moodEntry.create({
      data: {
        userId: user.id,
        moodType,
        intensity: intensity || 5,
        note: note || null,
        createdAt: new Date()
      }
    });

    res.status(201).json({ message: 'Mood entry created', entry: moodEntry });
  } catch (error) {
    console.error('Error creating mood entry:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});