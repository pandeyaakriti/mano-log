const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();


const PORT = process.env.PORT_WELLNESS || 3001;




// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage for chat messages (replace with database later)
const chatHistory = {};

// Simple Ollama service
class SimpleChatService {
  constructor() {
    this.baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'mistral';
  }

  async generateResponse(userMessage) {
    try {
      const systemPrompt = `You are a compassionate wellness assistant. Your role is to:
- Provide empathetic, supportive responses
- Ask follow-up questions to understand better
- Offer gentle wellness tips and coping strategies
- Maintain a warm, non-judgmental tone
- Keep responses concise (2-3 sentences)
- Never provide medical advice, suggest seeing professionals when needed

Remember: You're here to listen and support, not to diagnose or treat.`;

      const fullPrompt = `${systemPrompt}\n\nUser: ${userMessage}\n\nAssistant:`;

      const response = await axios.post(`${this.baseURL}/api/generate`, {
        model: this.model,
        prompt: fullPrompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 200,
        }
      });

      return {
        success: true,
        response: response.data.response.trim()
      };
    } catch (error) {
      console.error('Ollama generation error:', error);
      return {
        success: false,
        fallbackResponse: this.getFallbackResponse(userMessage)
      };
    }
  }

  getFallbackResponse(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('stress') || lowerMessage.includes('anxious')) {
      return "I understand you're feeling stressed. Try taking a few deep breaths with me. Would you like to share what's causing this stress?";
    }
    
    if (lowerMessage.includes('sad') || lowerMessage.includes('down')) {
      return "I'm here for you during this difficult time. It's okay to feel sad sometimes. Would you like to talk about what's on your mind?";
    }
    
    if (lowerMessage.includes('happy') || lowerMessage.includes('good')) {
      return "It's wonderful to hear you're feeling good! What's bringing you joy today?";
    }
    
    return "I'm here to listen and support you. Can you tell me a bit more about how you're feeling right now?";
  }

  async checkHealth() {
    try {
      const response = await axios.get(`${this.baseURL}/api/tags`);
      return {
        isRunning: true,
        modelAvailable: true
      };
    } catch (error) {
      return {
        isRunning: false,
        modelAvailable: false,
        error: error.message
      };
    }
  }
}

const chatService = new SimpleChatService();

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Chat server is running!', port: PORT });
});

// Send message
app.post('/api/chat/message', async (req, res) => {
  try {
    const { userId, message } = req.body;

    if (!userId || !message) {
      return res.status(400).json({ 
        error: 'userId and message are required' 
      });
    }

    // Initialize chat history for user if not exists
    if (!chatHistory[userId]) {
      chatHistory[userId] = [];
    }

    // Create user message
    const userMessage = {
      id: Date.now().toString(),
      text: message,
      sender: 'user',
      time: new Date().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };

    // Generate AI response
    const aiResponse = await chatService.generateResponse(message);
    
    const responseText = aiResponse.success ? aiResponse.response : aiResponse.fallbackResponse;

    // Create bot message
    const botMessage = {
      id: (Date.now() + 1).toString(),
      text: responseText,
      sender: 'bot',
      time: new Date().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };

    // Store messages in history
    chatHistory[userId].push(userMessage);
    chatHistory[userId].push(botMessage);

    // Keep only last 50 messages
    if (chatHistory[userId].length > 50) {
      chatHistory[userId] = chatHistory[userId].slice(-50);
    }

    res.json({
      success: true,
      userMessage,
      botMessage
    });

  } catch (error) {
    console.error('Chat message error:', error);
    res.status(500).json({ 
      error: 'Failed to process message',
      details: error.message 
    });
  }
});

// Get chat history
app.get('/api/chat/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const messages = chatHistory[userId] || [];
    
    res.json({
      success: true,
      messages: messages
    });

  } catch (error) {
    console.error('Chat history error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve chat history',
      details: error.message 
    });
  }
});

// Clear chat history
app.delete('/api/chat/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    chatHistory[userId] = [];
    
    res.json({
      success: true,
      message: 'Chat history cleared'
    });

  } catch (error) {
    console.error('Clear chat history error:', error);
    res.status(500).json({ 
      error: 'Failed to clear chat history',
      details: error.message 
    });
  }
});

// Check AI health
app.get('/api/chat/health', async (req, res) => {
  try {
    const health = await chatService.checkHealth();
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

// Start server with better error handling
const server = app.listen(PORT, () => {
  console.log(`🚀 Chat server running on port ${PORT}`);
  console.log(`📱 Health check: http://localhost:${PORT}/health`);
  console.log(`💬 Chat endpoint: http://localhost:${PORT}/api/chat/message`);
});

// Handle port already in use
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use!`);
    console.log('\n📝 Try these solutions:');
    console.log('1. Kill the process using the port:');
    console.log('   Windows: netstat -ano | findstr :3001');
    console.log('   Mac/Linux: lsof -ti:3001 | xargs kill -9');
    console.log('2. Use a different port: set PORT=3002 && node server.js');
    console.log('3. Update your .env file with PORT=3002');
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down gracefully...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  server.close(() => {
    process.exit(0);
  });
});