const axios = require('axios');

class OllamaService {
  constructor() {
    this.baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
;
    this.model = process.env.OLLAMA_MODEL || 'gemma:2b';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000, // 30 seconds timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // Check if Ollama is running and model is available
  async checkHealth() {
    try {
      const response = await this.client.get('/api/tags');
      const models = response.data.models || [];
      const modelExists = models.some(model => model.name.includes(this.model));
      
      return {
        isRunning: true,
        modelAvailable: modelExists,
        availableModels: models.map(m => m.name)
      };
    } catch (error) {
      return {
        isRunning: false,
        modelAvailable: false,
        error: error.message
      };
    }
  }

  // Generate wellness-focused response
  async generateResponse(userMessage, context = {}) {
    try {
      const systemPrompt = this.buildSystemPrompt(context);
      const fullPrompt = `${systemPrompt}\n\nUser: ${userMessage}\n\nAssistant:`;

      const response = await this.client.post('/api/generate', {
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
        response: response.data.response.trim(),
        tokensUsed: this.estimateTokens(fullPrompt + response.data.response)
      };
    } catch (error) {
      console.error('Ollama generation error:', error);
      return {
        success: false,
        error: error.message,
        fallbackResponse: this.getFallbackResponse(userMessage)
      };
    }
  }

  // Build system prompt for wellness context
  buildSystemPrompt(context) {
    const basePrompt = `You are a compassionate wellness assistant. Your role is to:
- Provide empathetic, supportive responses
- Ask follow-up questions to understand better
- Offer gentle wellness tips and coping strategies
- Maintain a warm, non-judgmental tone
- Keep responses concise (2-3 sentences)
- Never provide medical advice, suggest seeing professionals when needed

Remember: You're here to listen and support, not to diagnose or treat.`;

    if (context.recentMoods && context.recentMoods.length > 0) {
      const moodContext = context.recentMoods.map(mood => `${mood.moodType}(${mood.intensity}/10)`).join(', ');
      return `${basePrompt}\n\nUser's recent moods: ${moodContext}`;
    }

    return basePrompt;
  }

  // Estimate token count (rough approximation)
  estimateTokens(text) {
    return Math.ceil(text.split(/\s+/).length * 1.3);
  }

  // Fallback responses when Ollama is unavailable
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
    
    if (lowerMessage.includes('work') || lowerMessage.includes('job')) {
      return "Work can be challenging sometimes. Would you like to share what's happening at work that's on your mind?";
    }
    
    return "I'm here to listen and support you. Can you tell me a bit more about how you're feeling right now?";
  }

  // Generate journal insight
  async generateJournalInsight(journalText) {
    try {
      const prompt = `Analyze this journal entry and provide a brief, supportive insight and wellness tip:

Journal Entry: "${journalText}"

Please provide:
1. A brief, empathetic summary (1-2 sentences)
2. A practical wellness tip based on the content (1-2 sentences)

Keep the tone supportive and encouraging.`;

      const response = await this.client.post('/api/generate', {
        model: this.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.6,
          max_tokens: 150,
        }
      });

      return {
        success: true,
        insight: response.data.response.trim(),
        tokensUsed: this.estimateTokens(prompt + response.data.response)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        fallbackInsight: "Thank you for sharing your thoughts. Journaling is a great way to process your feelings and gain clarity."
      };
    }
  }
}

module.exports = new OllamaService();