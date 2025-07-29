//backend/journal/debug.routes.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const ollamaService = require('../wellnessbot/services/ollama');
const { generateInsightFromJournal } = require('./insights/insight.service');

const prisma = new PrismaClient();

// Test endpoint to check Ollama connection
router.get('/test/ollama', async (req, res) => {
  try {
    const health = await ollamaService.checkHealth();
    res.json({
      success: true,
      ollama: health,
      model: ollamaService.model,
      baseURL: ollamaService.baseURL
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test insight generation with sample text
router.post('/test/insight', async (req, res) => {
  try {
    const { text } = req.body;
    const testText = text || "I had a really stressful day at work today. Everything seemed to go wrong and I felt overwhelmed. I'm hoping tomorrow will be better.";
    
    // Create a temporary journal entry for testing
    const tempJournal = await prisma.journalEntry.create({
      data: {
        userId: "000000000000000000000000", // Placeholder user ID
        textContent: testText,
        wordCount: testText.split(' ').length,
        tags: ['test']
      }
    });
    
    // Generate insight
    const insight = await generateInsightFromJournal(tempJournal.id);
    
    // Clean up test entry
    await prisma.aIInsight.delete({ where: { id: insight.id } });
    await prisma.journalEntry.delete({ where: { id: tempJournal.id } });
    
    res.json({
      success: true,
      testText,
      insight: {
        summary: insight.summary,
        wellnessTip: insight.wellnessTip,
        modelUsed: insight.modelUsed
      }
    });
    
  } catch (error) {
    console.error('Test insight error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get journal entries for a user (for debugging)
router.get('/test/journals/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { firebaseUid },
      include: {
        journalEntries: {
          include: {
            aiInsight: true
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      user: {
        id: user.id,
        firebaseUid: user.firebaseUid,
        email: user.email
      },
      journals: user.journalEntries.map(entry => ({
        id: entry.id,
        textContent: entry.textContent.substring(0, 100) + '...',
        createdAt: entry.createdAt,
        hasInsight: !!entry.aiInsight,
        insight: entry.aiInsight ? {
          summary: entry.aiInsight.summary,
          wellnessTip: entry.aiInsight.wellnessTip
        } : null
      }))
    });
    
  } catch (error) {
    console.error('Debug journals error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;