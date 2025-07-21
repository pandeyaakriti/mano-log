const axios = require('axios');

class OllamaService {
  constructor() {
    this.baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'gemma:2b';
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Retry configuration
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second base delay
    
    // Response cache to avoid duplicate processing
    this.responseCache = new Map();
    this.cacheTimeout = 30000; // 30 seconds
    
    // Health check state
    this.lastHealthCheck = null;
    this.healthCheckInterval = 60000; // 1 minute
    
    // Emotion detection patterns
    this.emotionPatterns = {
      sad: ['sad', 'down', 'depressed', 'low', 'blue', 'upset', 'crying', 'tearful', 'heartbroken', 'miserable'],
      anxious: ['anxious', 'worried', 'nervous', 'stressed', 'overwhelmed', 'panic', 'fear', 'scared', 'tense'],
      angry: ['angry', 'mad', 'furious', 'irritated', 'frustrated', 'annoyed', 'rage', 'livid'],
      happy: ['happy', 'joy', 'excited', 'elated', 'thrilled', 'cheerful', 'delighted', 'ecstatic'],
      tired: ['tired', 'exhausted', 'drained', 'worn out', 'fatigued', 'weary', 'sleepy'],
      lonely: ['lonely', 'alone', 'isolated', 'abandoned', 'disconnected', 'left out'],
      confused: ['confused', 'lost', 'uncertain', 'unclear', 'puzzled', 'bewildered'],
      grateful: ['grateful', 'thankful', 'blessed', 'appreciative', 'lucky'],
      proud: ['proud', 'accomplished', 'successful', 'achieved', 'confident']
    };
  }

  // Enhanced health check with caching
  async checkHealth() {
    const now = Date.now();
    
    // Return cached result if recent
    if (this.lastHealthCheck && (now - this.lastHealthCheck.timestamp) < this.healthCheckInterval) {
      return this.lastHealthCheck.result;
    }

    try {
      const response = await this.client.get('/api/tags');
      const models = response.data.models || [];
      const modelExists = models.some(model => model.name.includes(this.model.split(':')[0]));
      
      const result = {
        isRunning: true,
        modelAvailable: modelExists,
        availableModels: models.map(m => m.name),
        checkedAt: new Date().toISOString()
      };

      // Cache the result
      this.lastHealthCheck = {
        timestamp: now,
        result: result
      };

      return result;
    } catch (error) {
      const result = {
        isRunning: false,
        modelAvailable: false,
        error: this.sanitizeError(error),
        checkedAt: new Date().toISOString()
      };

      // Cache error result too (but for shorter time)
      this.lastHealthCheck = {
        timestamp: now - (this.healthCheckInterval * 0.8), // Cache for shorter time on error
        result: result
      };

      return result;
    }
  }

  // Detect emotions in user message
  detectEmotions(message) {
    const lowerMessage = message.toLowerCase();
    const detectedEmotions = [];
    
    for (const [emotion, keywords] of Object.entries(this.emotionPatterns)) {
      const matchedKeywords = keywords.filter(keyword => 
        lowerMessage.includes(keyword) || 
        lowerMessage.includes(`i'm ${keyword}`) ||
        lowerMessage.includes(`i am ${keyword}`) ||
        lowerMessage.includes(`feeling ${keyword}`) ||
        lowerMessage.includes(`feel ${keyword}`)
      );
      
      if (matchedKeywords.length > 0) {
        detectedEmotions.push({
          emotion,
          keywords: matchedKeywords,
          intensity: this.calculateEmotionIntensity(lowerMessage, matchedKeywords)
        });
      }
    }
    
    return detectedEmotions.sort((a, b) => b.intensity - a.intensity);
  }

  // Calculate emotion intensity based on context clues
  calculateEmotionIntensity(message, keywords) {
    let intensity = keywords.length; // Base intensity on number of matching keywords
    
    // Amplifiers increase intensity
    const amplifiers = ['very', 'extremely', 'incredibly', 'so', 'really', 'quite', 'totally', 'completely'];
    const amplifierCount = amplifiers.filter(amp => message.includes(amp)).length;
    intensity += amplifierCount * 0.5;
    
    // Intensity words
    if (message.includes('overwhelm')) intensity += 1;
    if (message.includes('unbearable')) intensity += 1.5;
    if (message.includes('can\'t handle')) intensity += 1;
    
    return Math.min(intensity, 5); // Cap at 5
  }

  // Enhanced wellness response generation with emotion-aware follow-ups
  async generateResponse(userMessage, context = {}) {
    const cacheKey = this.generateCacheKey(userMessage, context);
    
    // Check cache first (for identical recent requests)
    if (this.responseCache.has(cacheKey)) {
      const cached = this.responseCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return {
          ...cached.response,
          fromCache: true
        };
      }
      this.responseCache.delete(cacheKey);
    }

    // Detect emotions in the user's message
    const detectedEmotions = this.detectEmotions(userMessage);
    const primaryEmotion = detectedEmotions[0];

    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const systemPrompt = this.buildSystemPrompt(context, detectedEmotions);
        const fullPrompt = `${systemPrompt}\n\nUser: ${userMessage}\n\nAssistant:`;

        const response = await this.client.post('/api/generate', {
          model: this.model,
          prompt: fullPrompt,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            max_tokens: 250,
            stop: ['\n\nUser:', '\nUser:', 'Human:', '\n\n'],
            repeat_penalty: 1.1,
          }
        });

        const cleanedResponse = this.cleanResponse(response.data.response);
        const result = {
          success: true,
          response: cleanedResponse,
          detectedEmotions: detectedEmotions,
          tokensUsed: this.estimateTokens(fullPrompt + cleanedResponse),
          attempt: attempt,
          generatedAt: new Date().toISOString()
        };

        // Cache successful response
        this.responseCache.set(cacheKey, {
          timestamp: Date.now(),
          response: result
        });

        return result;

      } catch (error) {
        lastError = error;
        console.error(`Ollama generation attempt ${attempt} failed:`, this.sanitizeError(error));
        
        // Wait before retry (exponential backoff)
        if (attempt < this.maxRetries) {
          await this.sleep(this.retryDelay * Math.pow(2, attempt - 1));
        }
      }
    }

    // All retries failed
    return {
      success: false,
      error: this.sanitizeError(lastError),
      fallbackResponse: this.getContextualFallbackResponse(userMessage, context, detectedEmotions),
      detectedEmotions: detectedEmotions,
      attemptsRade: this.maxRetries,
      generatedAt: new Date().toISOString()
    };
  }

  // Enhanced system prompt with emotion-aware guidance
  buildSystemPrompt(context, detectedEmotions = []) {
    const basePrompt = `You are a warm, empathetic wellness companion. Your role is to:

CORE BEHAVIOR:
- Provide genuine, heartfelt responses that feel like talking to a caring friend
- Listen actively and acknowledge the user's emotions with empathy
- When they say thank you, respond naturally with "You're welcome! I'm here for you" or similar
- Offer gentle, practical wellness tips and coping strategies
- Maintain a warm, supportive, non-judgmental tone
- try giving them solutions also
- when they ask you questions, suggest them answers that are related to their emotions

EMOTION-FOCUSED RESPONSES:
- When someone expresses an emotion (sad, anxious, happy, etc.), ALWAYS ask what made them feel that way
- Use phrases like: "What's been making you feel [emotion]?" or "Can you tell me what led to feeling [emotion]?"
- Show genuine curiosity about their experience and validate their feelings
- Help them explore the root causes of their emotions in a supportive way
-Suggest practical self-care strategies based on their emotional state 

RESPONSE STYLE:
- dont sound stiff
- Keep responses conversational and concise (2-4 sentences typically)
- Use natural, flowing language - avoid lists or clinical-sounding advice
- Show genuine care and understanding in your words
- Be encouraging but realistic, never dismissive of their feelings
- Match their emotional energy appropriately

WELLNESS FOCUS:
- Suggest practical techniques: deep breathing, mindfulness, gentle movement, journaling
- Encourage healthy habits like good sleep, nature connection, and social support
- Help them identify positive coping strategies and personal strengths
- Normalize difficult emotions while promoting healthy processing

BOUNDARIES:
- Never provide medical diagnoses or specific medical advice
- Encourage professional help when signs of serious distress appear
- Avoid discussing politics, religion, or controversial topics
- Don't suggest harmful behaviors or dismiss serious mental health concerns
- If someone mentions self-harm or crisis, gently suggest professional resources

Remember: You're a supportive friend focused on emotional wellness and practical self-care strategies. ask follow-up questions about what's causing their emotions and provide solutions too.`;

    // Add emotion-specific guidance
    let contextualPrompt = basePrompt;
    
    if (detectedEmotions.length > 0) {
      const primaryEmotion = detectedEmotions[0];
      contextualPrompt += `\n\nEMOTION CONTEXT: The user seems to be feeling ${primaryEmotion.emotion} (intensity: ${primaryEmotion.intensity.toFixed(1)}). Make sure to:
1. Acknowledge this emotion with empathy
2. Ask what specifically made them feel this way
3. Provide emotion-appropriate support and coping suggestions`;
    }
    
    if (context.recentMoods && context.recentMoods.length > 0) {
      const moodContext = context.recentMoods
        .map(mood => `${mood.moodType} (${mood.intensity}/10)`)
        .join(', ');
      contextualPrompt += `\n\nMOOD HISTORY: The user's recent mood patterns show: ${moodContext}. Use this to provide more personalized support.`;
    }

    if (context.timeOfDay) {
      const timeContext = this.getTimeContext(context.timeOfDay);
      contextualPrompt += `\n\nTIME CONTEXT: ${timeContext}`;
    }

    return contextualPrompt;
  }

  // Get time-appropriate context
  getTimeContext(timeOfDay) {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) {
      return "It's morning - consider gentle morning routines, setting intentions, or energizing activities.";
    } else if (hour >= 12 && hour < 17) {
      return "It's afternoon - think about midday resets, brief walks, or moments of reflection.";
    } else if (hour >= 17 && hour < 21) {
      return "It's evening - consider winding down activities, reflection on the day, or relaxing practices.";
    } else {
      return "It's late - focus on calming activities, rest preparation, or gentle self-care.";
    }
  }

  // Enhanced fallback responses with emotion-aware follow-ups
  getContextualFallbackResponse(userMessage, context = {}, detectedEmotions = []) {
    const lowerMessage = userMessage.toLowerCase();
    const recentMoods = context.recentMoods || [];
    const primaryEmotion = detectedEmotions[0];
    
    // Emotion-specific responses with follow-up questions
    if (primaryEmotion) {
      switch (primaryEmotion.emotion) {
        case 'sad':
          return `I can hear the sadness in your words, and I want you to know that it's completely okay to feel this way. Your feelings are valid. Can you tell me what's been making you feel so sad lately? Sometimes talking about what's weighing on your heart can help.`;
        
        case 'anxious':
          return `It sounds like anxiety is really weighing on you right now, and that can feel so overwhelming. You're not alone in this feeling. What's been triggering these anxious feelings for you? Understanding what's behind the worry can sometimes help us find ways to cope.`;
        
        case 'angry':
          return `I can sense the anger and frustration you're experiencing. Those are such intense emotions, and it makes sense that you'd want to express them. What happened that made you feel this angry? Let's talk through what's got you feeling this way.`;
        
        case 'happy':
          return `It's wonderful to hear such positivity from you! Your happiness is really coming through, and it brightens my day. What's been bringing you this joy and happiness? I'd love to celebrate these good moments with you.`;
        
        case 'tired':
          return `Exhaustion can make everything feel so much harder, and I hear how drained you're feeling. It takes a lot to reach out when you're this tired. What's been wearing you down lately? Is it physical tiredness, emotional exhaustion, or maybe both?`;
        
        case 'lonely':
          return `Loneliness can feel so heavy and isolating. I'm really glad you reached out and shared this with me - that takes courage. What's been making you feel so alone lately? Sometimes understanding the source can help us think about ways to reconnect.`;
        
        case 'confused':
          return `Feeling confused and uncertain can be really unsettling. It's like you're trying to navigate without a clear path forward. What's been causing this confusion for you? Sometimes talking through what's unclear can help bring some clarity.`;
        
        case 'grateful':
          return `It's so beautiful to hear gratitude in your words! Gratitude is such a powerful emotion for our wellbeing. What's been making you feel so grateful and thankful lately? I'd love to hear about the positive things in your life.`;
        
        case 'proud':
          return `I can feel the pride and accomplishment in your message, and that's wonderful! It's so important to recognize and celebrate our achievements. What have you accomplished that's making you feel so proud? I'd love to celebrate this moment with you.`;
        
        default:
          return `I can sense some strong emotions in what you're sharing with me. Your feelings matter, and I'm here to listen and support you. Can you tell me more about what's been making you feel this way? Understanding what's behind these emotions can help us work through them together.`;
      }
    }
    
    // Keyword-based responses with follow-up questions
    const stressKeywords = ['stress', 'stressed', 'pressure', 'overwhelmed'];
    const workKeywords = ['work', 'job', 'boss', 'colleague', 'office', 'career', 'meeting'];
    const sleepKeywords = ['sleep', 'insomnia', 'can\'t sleep'];
    const relationshipKeywords = ['relationship', 'partner', 'friend', 'family', 'argument', 'conflict'];

    if (stressKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return "Stress can feel so overwhelming sometimes, like everything is piling up at once. You're not alone in feeling this way. What's been the biggest source of stress for you lately? Let's talk about what's been building up this pressure.";
    }
    
    if (workKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return "Work challenges can really impact how we feel throughout the day and beyond. It sounds like something at work is weighing on your mind. What's been happening in your work situation that's affecting you? I'm here to listen.";
    }

    if (sleepKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return "Sleep struggles can make everything feel more difficult and overwhelming. You're dealing with something that affects so many of us. What's been making it hard for you to get good rest? Is it your mind racing, physical discomfort, or something else?";
    }

    if (relationshipKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return "Relationships can bring us so much joy and sometimes real challenges too. It sounds like there's something important happening with someone in your life. What's been going on that's affecting you? I'm here to listen without judgment.";
    }
    
    // Default empathetic response with follow-up
    return "I'm really glad you reached out to share what's on your mind. Sometimes just having someone listen can help, and I'm here for you. Can you tell me more about what's been on your heart lately? What's been making you feel the way you do right now?";
  }

  // Enhanced journal insight generation
  async generateJournalInsight(journalText) {
    if (!journalText || journalText.trim().length < 10) {
      return {
        success: false,
        error: "Journal entry too short for meaningful analysis",
        fallbackInsight: "Thank you for taking time to journal. Even brief moments of reflection can be valuable for your wellbeing."
      };
    }

    // Detect emotions in journal entry
    const detectedEmotions = this.detectEmotions(journalText);

    try {
      let emotionContext = '';
      if (detectedEmotions.length > 0) {
        const primaryEmotion = detectedEmotions[0];
        emotionContext = `\n\nNote: The journal entry seems to express ${primaryEmotion.emotion} emotions. Address this sensitively and ask gentle follow-up questions about what might be causing these feelings.`;
      }

      const prompt = `Read this journal entry with care and empathy, then provide supportive insight:

"${journalText}"

Please respond with:
1. A brief, compassionate reflection on what you notice (1-2 sentences)
2. One practical, gentle wellness suggestion based on what they've shared (1-2 sentences)
3. If emotions are present, gently ask what might be contributing to these feelings

Keep your response warm, supportive, and focused on their emotional wellbeing. Avoid being clinical or overly analytical.${emotionContext}`;

      const response = await this.client.post('/api/generate', {
        model: this.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.6,
          max_tokens: 200,
          stop: ['\n\n', 'User:', 'Human:'],
          repeat_penalty: 1.1,
        }
      });

      const cleanedInsight = this.cleanResponse(response.data.response);

      return {
        success: true,
        insight: cleanedInsight,
        detectedEmotions: detectedEmotions,
        tokensUsed: this.estimateTokens(prompt + cleanedInsight),
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Journal insight generation error:', this.sanitizeError(error));
      return {
        success: false,
        error: this.sanitizeError(error),
        fallbackInsight: this.getJournalFallbackInsight(journalText, detectedEmotions),
        detectedEmotions: detectedEmotions
      };
    }
  }

  // Enhanced journal fallback with emotion awareness
  getJournalFallbackInsight(journalText, detectedEmotions = []) {
    const lowerText = journalText.toLowerCase();
    const primaryEmotion = detectedEmotions[0];
    
    if (primaryEmotion) {
      switch (primaryEmotion.emotion) {
        case 'sad':
          return "I can sense some sadness in your writing, and I want you to know that it's okay to feel this way. Journaling about difficult emotions can be really healing. What do you think has been contributing to these sad feelings lately?";
        
        case 'grateful':
          return "I notice you're reflecting on gratitude - that's such a powerful practice for wellbeing! It's beautiful to see you acknowledging the positive things in your life. What's been inspiring this sense of gratitude for you?";
        
        case 'anxious':
          return "It sounds like you're processing some worry or anxiety through your writing. Journaling can be such a helpful way to work through anxious thoughts. What's been on your mind that's causing these feelings?";
        
        default:
          return `I can sense some ${primaryEmotion.emotion} emotions in your reflection. Thank you for being honest about your feelings - that takes courage. What do you think has been influencing how you're feeling lately?`;
      }
    }
    
    if (lowerText.includes('challenge') || lowerText.includes('difficult') || lowerText.includes('struggle')) {
      return "Thank you for honestly sharing about the challenges you're facing. Writing about difficulties can help process emotions and often reveals your own strength and resilience. What's been the most challenging part of what you're going through?";
    }
    
    if (lowerText.includes('goal') || lowerText.includes('plan') || lowerText.includes('want to')) {
      return "I can see you're thinking about your goals and aspirations. Journaling about your intentions is a wonderful way to clarify what matters to you and take meaningful steps forward. What's motivating these goals for you?";
    }
    
    return "Thank you for taking time to reflect and write. Journaling is such a valuable practice for understanding yourself better and processing your experiences. What prompted you to write about this today? Keep nurturing this healthy habit.";
  }

  // Utility methods
  generateCacheKey(message, context) {
    const contextStr = JSON.stringify(context);
    return `${message.toLowerCase().trim()}_${contextStr}`.substring(0, 100);
  }

  cleanResponse(response) {
    if (!response) return '';
    
    return response
      .trim()
      .replace(/^(Assistant:|AI:|Bot:)\s*/i, '') // Remove AI prefixes
      .replace(/\n{3,}/g, '\n\n') // Clean up excessive newlines
      .replace(/\s+/g, ' ') // Clean up multiple spaces
      .trim();
  }

  sanitizeError(error) {
    if (!error) return 'Unknown error occurred';
    
    // Return user-friendly error messages
    if (error.code === 'ECONNREFUSED') {
      return 'Unable to connect to Ollama service';
    }
    if (error.message) {
      return error.message;
    }
    return 'An unexpected error occurred';
  }

  estimateTokens(text) {
    if (!text) return 0;
    // More accurate token estimation
    return Math.ceil(text.split(/\s+/).filter(word => word.length > 0).length * 1.4);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Cleanup method for cache management
  cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.responseCache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.responseCache.delete(key);
      }
    }
  }

  // Get service statistics
  getServiceStats() {
    return {
      cacheSize: this.responseCache.size,
      lastHealthCheck: this.lastHealthCheck?.timestamp || null,
      isHealthy: this.lastHealthCheck?.result?.isRunning || false,
      modelConfigured: this.model,
      baseURL: this.baseURL,
      supportedEmotions: Object.keys(this.emotionPatterns)
    };
  }
}

module.exports = new OllamaService();