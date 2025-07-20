const express = require('express');
const { PrismaClient } = require('@prisma/client');
const ollamaService = require('../services/ollama');

const router = express.Router();
const prisma = new PrismaClient();

// Send a message to the AI
router.post('/message', async (req, res) => {
  try {
    const { userId, message, source = 'general' } = req.body;

    // Validate input
    if (!userId || !message) {
      return res.status(400).json({ 
        error: 'userId and message are required' 
      });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { firebaseUid: userId }
    });

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    // Get user's recent mood entries for context
    const recentMoods = await prisma.moodEntry.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    // Save user message
    const userMessage = await prisma.chatMessage.create({
      data: {
        userId: user.id,
        messageText: message,
        sender: 'USER',
        source: source,
        timestamp: new Date()
      }
    });

    // Generate AI response
    const aiResponse = await ollamaService.generateResponse(message, {
      recentMoods: recentMoods,
      source: source
    });

    let responseText;
    let tokensUsed = 0;

    if (aiResponse.success) {
      responseText = aiResponse.response;
      tokensUsed = aiResponse.tokensUsed;
    } else {
      responseText = aiResponse.fallbackResponse;
      console.error('AI generation failed:', aiResponse.error);
    }

    // Save AI response
    const botMessage = await prisma.chatMessage.create({
      data: {
        userId: user.id,
        messageText: responseText,
        sender: 'ASSISTANT',
        source: source,
        tokensUsed: tokensUsed,
        timestamp: new Date()
      }
    });

    res.json({
      success: true,
      userMessage: {
        id: userMessage.id,
        text: userMessage.messageText,
        sender: 'user',
        time: userMessage.timestamp.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      },
      botMessage: {
        id: botMessage.id,
        text: botMessage.messageText,
        sender: 'bot',
        time: botMessage.timestamp.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      }
    });

  } catch (error) {
    console.error('Chat message error:', error);
    res.status(500).json({ 
      error: 'Failed to process message',
      details: error.message 
    });
  }
});

// Get chat history for a user
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Find user
    const user = await prisma.user.findUnique({
      where: { firebaseUid: userId }
    });

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    // Get chat messages
    const messages = await prisma.chatMessage.findMany({
      where: { userId: user.id },
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    // Format messages for frontend
    const formattedMessages = messages.reverse().map(msg => ({
      id: msg.id,
      text: msg.messageText,
      sender: msg.sender.toLowerCase(),
      time: msg.timestamp.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      source: msg.source
    }));

    res.json({
      success: true,
      messages: formattedMessages,
      total: messages.length
    });

  } catch (error) {
    console.error('Chat history error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve chat history',
      details: error.message 
    });
  }
});

// Clear chat history for a user
router.delete('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Find user
    const user = await prisma.user.findUnique({
      where: { firebaseUid: userId }
    });

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    // Delete all chat messages for user
    const deletedCount = await prisma.chatMessage.deleteMany({
      where: { userId: user.id }
    });

    res.json({
      success: true,
      message: `Deleted ${deletedCount.count} messages`
    });

  } catch (error) {
    console.error('Clear chat history error:', error);
    res.status(500).json({ 
      error: 'Failed to clear chat history',
      details: error.message 
    });
  }
});

// Check AI service health
router.get('/health', async (req, res) => {
  try {
    const health = await ollamaService.checkHealth();
    res.json({
      success: true,
      ollama: health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;