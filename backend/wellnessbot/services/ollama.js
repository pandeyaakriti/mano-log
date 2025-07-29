//backend/wellnessbot/services/ollama.js
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
    
    // Track conversation context to avoid repetitive questions
    this.conversationContext = new Map();
    this.contextTimeout = 300000; // 5 minutes
    
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

    // Solution patterns for each emotion
    this.emotionSolutions = {
      sad: [
        'Try gentle movement like a short walk or stretching to help shift your energy',
        'Sometimes talking about what\'s on your heart can help - would you like to share more, or would you prefer to just be heard?',
        'Consider doing something nurturing for yourself - maybe make a warm drink or wrap up in a cozy blanket',
        'Write down your feelings without censoring them - sometimes getting them out of your head helps',
        'Reach out to someone who cares about you, even if it\'s just to say hello'
      ],
      anxious: [
        'Try the 5-4-3-2-1 grounding technique: name 5 things you see, 4 you hear, 3 you touch, 2 you smell, 1 you taste',
        'Practice box breathing: 4 counts in, hold 4, out 4, hold 4',
        'Focus on what you can control right now, not what you can\'t',
        'Try progressive muscle relaxation - tense and release each muscle group',
        'Step outside for fresh air or change your environment'
      ],
      angry: [
        'Take slow, deep breaths to activate your body\'s calm response',
        'Try physical movement - walk, stretch, or do jumping jacks to release tension',
        'Write down your thoughts without censoring to get them out of your head',
        'Use the STOP technique: Stop, Take a breath, Observe, Proceed mindfully',
        'Count to 10 or take a brief timeout before responding'
      ],
      tired: [
        'Consider a 10-20 minute power nap if possible',
        'Stay hydrated - fatigue often includes dehydration',
        'Try gentle movement or stretching to boost energy naturally',
        'Prioritize your most important tasks and let go of the rest today',
        'Plan for earlier sleep tonight and create a calming bedtime routine'
      ],
      lonely: [
        'Reach out to one person - even a simple text saying hello',
        'Consider joining an online community or local group with shared interests',
        'Practice self-compassion - treat yourself with the kindness you\'d show a friend',
        'Try volunteering, which connects you with others while helping',
        'Spend time in public spaces like cafes or parks to feel connected to others'
      ],
      confused: [
        'Write down what you know vs. what you\'re unsure about',
        'Break the situation into smaller, clearer pieces',
        'Talk it through with someone you trust for a fresh perspective',
        'Take a step back and revisit this when you feel clearer',
        'Focus on the next small step rather than the whole picture'
      ]
    };
  }

  // Track conversation context to avoid repetitive responses
  updateConversationContext(userId, emotion, hasAskedCause) {
    const now = Date.now();
    if (!this.conversationContext.has(userId)) {
      this.conversationContext.set(userId, {
        emotions: new Map(),
        timestamp: now
      });
    }

    const context = this.conversationContext.get(userId);
    if (!context.emotions.has(emotion)) {
      context.emotions.set(emotion, {
        causesAsked: hasAskedCause,
        solutionsGiven: [],
        count: 1,
        firstMentioned: now
      });
    } else {
      const emotionData = context.emotions.get(emotion);
      emotionData.count += 1;
      if (hasAskedCause) emotionData.causesAsked = true;
    }
    
    context.timestamp = now;
  }

  getConversationContext(userId, emotion) {
    const context = this.conversationContext.get(userId);
    if (!context || Date.now() - context.timestamp > this.contextTimeout) {
      return null;
    }
    return context.emotions.get(emotion) || null;
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

  // Get a random solution for an emotion
  getRandomSolution(emotion) {
    const solutions = this.emotionSolutions[emotion];
    if (!solutions || solutions.length === 0) return null;
    return solutions[Math.floor(Math.random() * solutions.length)];
  }

  // Enhanced wellness response generation with better solution/question balance
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
    
    // Get conversation context to avoid repetitive questions
    const userId = context.userId || 'default';
    const emotionContext = primaryEmotion ? 
      this.getConversationContext(userId, primaryEmotion.emotion) : null;

    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const systemPrompt = this.buildSystemPrompt(context, detectedEmotions, emotionContext);
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
        
        // Update conversation context
        if (primaryEmotion) {
          this.updateConversationContext(userId, primaryEmotion.emotion, 
            cleanedResponse.toLowerCase().includes('what') && cleanedResponse.includes('?'));
        }
        
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
      fallbackResponse: this.getContextualFallbackResponse(userMessage, context, detectedEmotions, emotionContext),
      detectedEmotions: detectedEmotions,
      attemptsRade: this.maxRetries,
      generatedAt: new Date().toISOString()
    };
  }

  // Check if user response is vague/dismissive
  isVagueResponse(message) {
    const vaguePatterns = [
      'nothing much', 'not much', 'nothing really', 'not sure',
      'just because', 'just sad', 'just tired', 'just angry',
      'i dont know', "i don't know", 'dunno', 'no reason',
      'everything', 'life', 'just life', 'just feeling',
      'cant explain', "can't explain", 'hard to say',
      'just am', 'just do', 'idk', 'whatever'
    ];
    
    return vaguePatterns.some(pattern => 
      message.includes(pattern) || 
      message === 'nothing' || 
      message === 'everything' ||
      message.length < 15 // Very short responses often indicate reluctance to elaborate
    );
  }

  // Enhanced system prompt with better solution/question balance
  buildSystemPrompt(context, detectedEmotions = [], emotionContext = null) {
    const basePrompt = `You are a warm, empathetic wellness companion. Your role is to:

CORE BEHAVIOR:
- Provide genuine, heartfelt responses that feel like talking to a caring friend
- Listen actively and acknowledge the user's emotions with empathy based on the context they have provided earlier
- When they say thank you, respond naturally with "You're welcome! I'm here for you" or similar
- ALWAYS offer practical, actionable wellness tips and coping strategies
- Maintain a warm, supportive, non-judgmental tone
- Focus on giving helpful solutions, not just asking questions

RESPONSE STRATEGY:
- PRIORITIZE giving practical solutions and coping strategies
- When user gives vague responses like "nothing much" or "just sad", immediately offer helpful solutions instead of probing further
- Only ask follow-up questions about emotions if the user seems open to sharing details
- Provide 1-2 concrete, actionable suggestions in every response
- Balance empathy with practical help
- Recognize when someone doesn't want to elaborate and pivot to supportive solutions

SOLUTION-FOCUSED RESPONSES:
- Always include at least one specific technique they can try right now
- Suggest breathing exercises, grounding techniques, physical movement, or mindfulness practices
- Give practical self-care strategies based on their emotional state
- Encourage healthy habits like rest, hydration, nature connection, or social support
- Make suggestions concrete and immediate, not vague

RESPONSE STYLE:
- Keep responses conversational and concise (2-4 sentences typically)
- Use natural, flowing language - avoid lists or clinical-sounding advice
- Show genuine care and understanding in your words
- Be encouraging and solution-oriented, never dismissive
- Match their emotional energy appropriately

WELLNESS FOCUS:
- Suggest specific techniques: "Try taking 5 deep breaths, counting to 4 on each inhale and 6 on exhales"
- Encourage immediate actions: "Step outside for a few minutes" or "Write down three things going well"
- Help them identify what they can do right now to feel a bit better
- Normalize difficult emotions while promoting healthy coping

BOUNDARIES:
- Never provide medical diagnoses or specific medical advice
- Encourage professional help when signs of serious distress appear
- Don't suggest harmful behaviors or dismiss serious mental health concerns
- If someone mentions self-harm or crisis, gently suggest professional resources

Remember: Focus on being a helpful friend who gives practical advice, not a therapist who only asks questions.`;

    // Add emotion-specific guidance with solution focus
    let contextualPrompt = basePrompt;
    
    if (detectedEmotions.length > 0) {
      const primaryEmotion = detectedEmotions[0];
      const shouldAskCause = !emotionContext || !emotionContext.causesAsked;
      
      contextualPrompt += `\n\nEMOTION CONTEXT: The user seems to be feeling ${primaryEmotion.emotion} (intensity: ${primaryEmotion.intensity.toFixed(1)}). 
${shouldAskCause ? 
  'You may gently ask what made them feel this way, but PRIORITIZE giving them a practical solution first.' : 
  'Focus on providing practical solutions - you\'ve already explored the causes with them.'
}
Give them a specific coping technique for ${primaryEmotion.emotion} emotions.`;
    }
    
    if (context.recentMoods && context.recentMoods.length > 0) {
      const moodContext = context.recentMoods
        .map(mood => `${mood.moodType} (${mood.intensity}/10)`)
        .join(', ');
      contextualPrompt += `\n\nMOOD HISTORY: Recent patterns: ${moodContext}. Use this to provide more personalized support.`;
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

  // Enhanced fallback responses with solution focus
  getContextualFallbackResponse(userMessage, context = {}, detectedEmotions = [], emotionContext = null) {
    const lowerMessage = userMessage.toLowerCase();
    const primaryEmotion = detectedEmotions[0];
    const shouldAskCause = primaryEmotion && (!emotionContext || !emotionContext.causesAsked);
    
    // Check for vague responses that indicate user doesn't want to elaborate
    const isVagueResponse = this.isVagueResponse(lowerMessage);
    
    // Emotion-specific responses with solutions first, questions optional
    if (primaryEmotion) {
      const solution = this.getRandomSolution(primaryEmotion.emotion);
      const emotionName = primaryEmotion.emotion;
      
      let response = `I can hear the ${emotionName} in your words, and that's completely valid. `;
      
      // If it's a vague response or we've already asked about causes, focus on solutions
      if (isVagueResponse || !shouldAskCause) {
        if (solution) {
          response += `Here's something that might help: ${solution}. `;
        }
        response += `Sometimes ${emotionName} feelings just need acknowledgment and gentle self-care.`;
      } else {
        // First time mentioning emotion - ask about cause but also offer solution
        if (solution) {
          response += `Here's something that might help right now: ${solution}. `;
        }
        response += `If you'd like to share, what's been contributing to these ${emotionName} feelings?`;
      }
      
      return response;
    }
    
    // Keyword-based responses with solution focus
    const stressKeywords = ['stress', 'stressed', 'pressure', 'overwhelmed'];
    const workKeywords = ['work', 'job', 'boss', 'colleague', 'office', 'career', 'meeting'];
    const sleepKeywords = ['sleep', 'insomnia', 'can\'t sleep'];
    const relationshipKeywords = ['relationship', 'partner', 'friend', 'family', 'argument', 'conflict'];

    if (stressKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return "Stress can feel overwhelming, but you're not alone in this. Try this right now: take 5 slow, deep breaths, making your exhale longer than your inhale. This activates your body's calm response and can provide immediate relief.";
    }
    
    if (workKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return "Work stress can really weigh on us. Here's something that might help: take a 2-minute break to step away from your workspace, do some gentle neck rolls, and remind yourself of one thing that went well today. Sometimes small resets make a big difference.";
    }

    if (sleepKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return "Sleep struggles are so frustrating. Try this tonight: put away screens 30 minutes before bed, do some gentle stretches, and focus on relaxing each part of your body from your toes up to your head. Creating a calm routine signals to your body that it's time to rest.";
    }

    if (relationshipKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return "Relationship challenges can stir up so many emotions. Before your next interaction, try taking a few minutes to think about what outcome you really want, then approach the conversation from a place of curiosity rather than defensiveness. This often helps communication flow better.";
    }
    
    // Default empathetic response with practical suggestion
    return "I'm glad you reached out - that takes courage. Right now, try this simple grounding technique: notice 5 things you can see around you, 4 things you can hear, and 3 things you can physically feel (like your feet on the floor). This can help bring you into the present moment when things feel overwhelming.";
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
        const solution = this.getRandomSolution(primaryEmotion.emotion);
        emotionContext = `\n\nNote: The journal entry expresses ${primaryEmotion.emotion} emotions. Acknowledge this sensitively and provide a practical wellness tip: ${solution || 'something supportive they can do for themselves'}.`;
      }

      const prompt = `Read this journal entry with care and empathy, then provide supportive insight:

"${journalText}"

Please respond with:
1. A brief, compassionate reflection on what you notice (1-2 sentences)
2. One specific, practical wellness suggestion they can try today (1-2 sentences)
3. Brief encouragement about their self-reflection practice

Keep your response warm, supportive, and solution-focused rather than just asking questions.${emotionContext}`;

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

  // Enhanced journal fallback with solution focus
  getJournalFallbackInsight(journalText, detectedEmotions = []) {
    const primaryEmotion = detectedEmotions[0];
    
    if (primaryEmotion) {
      const solution = this.getRandomSolution(primaryEmotion.emotion);
      let response = `I can sense some ${primaryEmotion.emotion} emotions in your writing, and it's really meaningful that you're taking time to process these feelings through journaling. `;
      
      if (solution) {
        response += `Here's something that might help: ${solution}. `;
      }
      
      response += `Your self-awareness and commitment to reflection shows real strength.`;
      return response;
    }
    
    const lowerText = journalText.toLowerCase();
    
    if (lowerText.includes('challenge') || lowerText.includes('difficult') || lowerText.includes('struggle')) {
      return "Thank you for honestly sharing about the challenges you're facing. Try being as kind to yourself as you would be to a good friend going through the same thing. Your willingness to reflect on difficult experiences shows resilience and self-compassion.";
    }
    
    if (lowerText.includes('goal') || lowerText.includes('plan') || lowerText.includes('want to')) {
      return "I can see you're thinking about your goals and aspirations - that's wonderful self-direction. Try writing down just one small step you can take toward these goals this week. Breaking things down makes them feel more achievable and builds momentum.";
    }
    
    return "Thank you for taking time to reflect and write. Here's a simple way to build on this practice: each time you journal, try ending with one thing you're grateful for, even if it's small. This helps balance processing challenges with recognizing positives in your life.";
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

  // Clean up conversation context
  cleanupConversationContext() {
    const now = Date.now();
    for (const [userId, context] of this.conversationContext.entries()) {
      if (now - context.timestamp > this.contextTimeout) {
        this.conversationContext.delete(userId);
      }
    }
  }

  // Get service statistics
  getServiceStats() {
    return {
      cacheSize: this.responseCache.size,
      conversationContexts: this.conversationContext.size,
      lastHealthCheck: this.lastHealthCheck?.timestamp || null,
      isHealthy: this.lastHealthCheck?.result?.isRunning || false,
      modelConfigured: this.model,
      baseURL: this.baseURL,
      supportedEmotions: Object.keys(this.emotionPatterns)
    };
  }
}

module.exports = new OllamaService();