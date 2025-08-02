//backend/journal/insights/insight.service.js
const { buildInsightPrompt } = require('./promptTemplate');
const ollamaService = require('../../wellnessbot/services/ollama');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Enhanced function to call Ollama with better error handling
async function callOllamaForInsight(prompt) {
  try {
    console.log('🤖 Calling Ollama for insight generation...');
    
    const response = await ollamaService.client.post('/api/generate', {
      model: ollamaService.model,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.6,
        top_p: 0.9,
        max_tokens: 350,
        stop: ['\n\nUser:', '\nUser:', 'Human:', '\n\n'],
        repeat_penalty: 1.1,
      }
    });

    console.log(' Ollama response received');
    console.log('Raw response:', response.data.response.substring(0, 200) + '...');
    
    return response.data.response;
  } catch (error) {
    console.error(' Ollama API call failed:', error.message);
    throw new Error(`Ollama API call failed: ${error.message}`);
  }
}

// Function to extract JSON from Ollama response with better parsing
function parseOllamaResponse(rawResponse) {
  console.log('Parsing Ollama response:', rawResponse.substring(0, 200) + '...');
  
  try {
    // First, try to parse as direct JSON
    const parsed = JSON.parse(rawResponse.trim());
    
    if (parsed.summary && parsed.tip) {
      return {
        summary: cleanText(parsed.summary),
        wellnessTip: cleanText(parsed.tip)
      };
    }
    
    throw new Error('Missing required fields in JSON response');
    
  } catch (jsonError) {
    console.log(' JSON parsing failed, attempting fallback parsing...');
    
    // Fallback: Try to extract JSON from within the response
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.summary && parsed.tip) {
          return {
            summary: cleanText(parsed.summary),
            wellnessTip: cleanText(parsed.tip)
          };
        }
      } catch (e) {
        console.log('Fallback JSON parsing also failed');
      }
    }
    
    // Advanced fallback: Extract content between quotes
    console.log(' Using advanced text extraction...');
    
    let summary = '';
    let wellnessTip = '';
    
    // Look for "summary": "content" pattern
    const summaryMatch = rawResponse.match(/"summary"\s*:\s*"([^"]+(?:\\.[^"]*)*?)"/);
    if (summaryMatch) {
      summary = summaryMatch[1].replace(/\\"/g, '"').replace(/\\n/g, ' ').trim();
    }
    
    // Look for "tip": "content" pattern  
    const tipMatch = rawResponse.match(/"tip"\s*:\s*"([^"]+(?:\\.[^"]*)*?)"/);
    if (tipMatch) {
      wellnessTip = tipMatch[1].replace(/\\"/g, '"').replace(/\\n/g, ' ').trim();
    }
    
    // If regex extraction failed, try line-by-line analysis
    if (!summary || !wellnessTip) {
      const lines = rawResponse
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      let foundSummary = false;
      let foundTip = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Look for lines that contain actual insight content (not JSON structure)
        if (!foundSummary && line.includes('sense') || line.includes('feel') || line.includes('processing') || line.includes('reflect')) {
          if (line.length > 30 && !line.includes('"summary"') && !line.includes('"tip"')) {
            summary = cleanText(line);
            foundSummary = true;
          }
        }
        
        if (!foundTip && (line.includes('try') || line.includes('practice') || line.includes('consider') || line.includes('breathing'))) {
          if (line.length > 30 && !line.includes('"summary"') && !line.includes('"tip"')) {
            wellnessTip = cleanText(line);
            foundTip = true;
          }
        }
      }
    }
    
    // Final fallback with better defaults
    if (!summary || summary.length < 20) {
      summary = "I can see you're taking time to reflect, which shows emotional awareness and self-care.";
    }
    
    if (!wellnessTip || wellnessTip.length < 20) {
      wellnessTip = "Try taking three deep breaths right now - breathe in for 4 counts, hold for 4, and exhale for 6.";
    }
    
    console.log(' Parsed summary:', summary.substring(0, 100) + '...');
    console.log(' Parsed tip:', wellnessTip.substring(0, 100) + '...');
    
    return {
      summary: summary,
      wellnessTip: wellnessTip
    };
  }
}

// Helper function to clean extracted text
function cleanText(text) {
  if (!text) return '';
  
  return text
    .replace(/^["']|["']$/g, '') // Remove surrounding quotes
    .replace(/\\"/g, '"') // Unescape quotes
    .replace(/\\n/g, ' ') // Replace newlines with spaces
    .replace(/^\s*"?(summary|tip)"\s*:\s*"?/i, '') // Remove JSON property prefixes
    .replace(/"?\s*$/, '') // Remove trailing quotes
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

async function generateInsightFromJournal(journalId) {
  try {
    console.log(' Starting insight generation for journal:', journalId);
    
    // 1. Fetch journal entry
    const journal = await prisma.journalEntry.findUnique({
      where: { id: journalId },
    });
    
    if (!journal) {
      throw new Error('Journal entry not found');
    }
    
    console.log(' Journal entry found, length:', journal.textContent.length);
    
    // 2. Check if insight already exists
    const existingInsight = await prisma.aIInsight.findUnique({
      where: { journalId: journalId }
    });
    
    if (existingInsight) {
      console.log(' Returning existing insight');
      return existingInsight;
    }
    
    // 3. Build prompt for JSON response
    const prompt = buildInsightPrompt(journal.textContent);
    console.log(' Prompt built, length:', prompt.length);
    
    // 4. Call Ollama
    const ollamaResponse = await callOllamaForInsight(prompt);
    
    // 5. Parse response
    const { summary, wellnessTip } = parseOllamaResponse(ollamaResponse);
    
    console.log(' Parsed response:');
    console.log('Summary:', summary.substring(0, 100) + '...');
    console.log('Wellness Tip:', wellnessTip.substring(0, 100) + '...');
    
    // 6. Save insight to database
    const insight = await prisma.aIInsight.create({
      data: {
        journalId,
        summary: summary,
        wellnessTip: wellnessTip,
        modelUsed: ollamaService.model,
        tokensUsed: Math.ceil((prompt.length + ollamaResponse.length) / 4),
        confidence: 0.8,
      },
    });

    console.log(' Insight saved to database with ID:', insight.id);
    return insight;

  } catch (error) {
    console.error(' Error in generateInsightFromJournal:', error);
    
    // Enhanced fallback with more contextual responses
    try {
      const journal = await prisma.journalEntry.findUnique({
        where: { id: journalId },
      });
      
      let contextualSummary = "Thank you for taking time to reflect through journaling.";
      let contextualTip = "Continue this practice of self-reflection - it's valuable for your emotional wellbeing.";
      
      if (journal?.textContent) {
        const content = journal.textContent.toLowerCase();
        
        // Create more contextual fallback responses
        if (content.includes('stress') || content.includes('anxious') || content.includes('worried')) {
          contextualSummary = "I can sense you're working through some stress and anxiety. It's important that you're processing these feelings.";
          contextualTip = "When feeling overwhelmed, try the 4-7-8 breathing technique: breathe in for 4 counts, hold for 7, and exhale for 8.";
        } else if (content.includes('sad') || content.includes('down') || content.includes('difficult')) {
          contextualSummary = "You're processing some challenging emotions, and your willingness to reflect on them shows emotional courage.";
          contextualTip = "Consider reaching out to someone you trust, or try gentle movement like a short walk to help shift your energy.";
        } else if (content.includes('happy') || content.includes('good') || content.includes('grateful')) {
          contextualSummary = "It's wonderful to see positive emotions in your reflection. Acknowledging these moments helps build resilience.";
          contextualTip = "Try keeping a daily gratitude practice - writing down three good things each day can strengthen positive thinking patterns.";
        } else if (content.includes('confused') || content.includes('uncertain') || content.includes('lost')) {
          contextualSummary = "You're navigating some uncertainty, and using journaling to work through confusion is a healthy approach.";
          contextualTip = "When feeling unclear, try writing down what you know versus what you're unsure about - this can help clarify your thoughts.";
        }
      }
      
      const fallbackInsight = await prisma.aIInsight.create({
        data: {
          journalId,
          summary: contextualSummary,
          wellnessTip: contextualTip,
          modelUsed: 'fallback',
          tokensUsed: 0,
          confidence: 0.5,
        },
      });

      console.log(' Fallback insight created with ID:', fallbackInsight.id);
      return fallbackInsight;
      
    } catch (fallbackError) {
      console.error(' Fallback insight creation also failed:', fallbackError);
      throw new Error('Failed to generate insight: ' + error.message);
    }
  }
}

module.exports = {
  generateInsightFromJournal,
};