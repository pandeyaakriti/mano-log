//backend/journal/journal.controller.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create a new journal entry
exports.createJournalEntry = async (req, res) => {
  try {
    console.log(' Received journal entry request');
    const { firebaseUid, textContent, tags = [] } = req.body;
    console.log('Received data:', { firebaseUid, textContent });
    if (!firebaseUid || !textContent) {
      return res.status(400).json({ error: 'firebaseUid and textContent are required.' });
    }

    // Find user by firebaseUid
    const user = await prisma.user.findUnique({
      where: { firebaseUid },
      select: {
        id: true,
        email: true,
        displayName: true,
        firebaseUid: true
      }

    });

    if (!user) return res.status(404).json({ error: 'User not found' });
    console.log(' User found:', { 
      userId: user.id, 
      email: user.email,
      displayName: user.displayName 
    });

    const wordCount = textContent.trim().split(/\s+/).filter(word => word.length > 0).length;

   // Create journal entry
    const journalData = {
      textContent: textContent.trim(),
      userId: user.id,
      entryDate: new Date(),
      wordCount,
      tags: Array.isArray(tags) ? tags : [],
    };

    console.log(' Creating journal entry with data:', {
      ...journalData,
      textContent: `${journalData.textContent.substring(0, 50)}...`
    });

    const journal = await prisma.journalEntry.create({
      data: journalData,
      include: {
        user: {
          select: {
            email: true,
            displayName: true
          }
        }
      }
    });

    console.log(' Journal entry created successfully:', {
      id: journal.id,
      userId: journal.userId,
      wordCount: journal.wordCount,
      entryDate: journal.entryDate
    });

    res.status(201).json({ 
      message: 'Reflection saved successfully!', 
      success: true,
      journal: {
        id: journal.id,
        textContent: journal.textContent,
        entryDate: journal.entryDate,
        wordCount: journal.wordCount,
        tags: journal.tags,
        user: {
          email: journal.user.email,
          displayName: journal.user.displayName
        }
      }
    });

  } catch (error) {
    console.error(' Error in createJournalEntry:', error);
    console.error(' Error stack:', error.stack);
    
    // Check if it's a Prisma error
    if (error.code) {
      console.error(' Prisma error code:', error.code);
      console.error(' Prisma error meta:', error.meta);
    }

    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Get journal entries for a user
exports.getJournalEntries = async (req, res) => {
  try {
    const { firebaseUid } = req.params;

    if (!firebaseUid) return res.status(400).json({ error: 'firebaseUid is required.' });

    const user = await prisma.user.findUnique({
      where: { firebaseUid },
      select: {
        id: true,
        email: true,
        displayName: true
      }
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const entries = await prisma.journalEntry.findMany({
      where: { userId: user.id },
      orderBy: { entryDate: 'desc' },
    });
    console.log(` Found ${entries.length} journal entries for user`);
    
    res.status(200).json({
      success: true,
      count: entries.length,
      entries
    });
  } catch (error) {
    console.error('Error fetching journal entries:', error);
    res.status(500).json({ error: 'Internal server error', details: error
      .message});
  }
};
