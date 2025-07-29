//backend/journal/insights/insight.controller.js
const { generateInsightFromJournal } = require('./insight.service');

const generateInsightHandler = async (req, res) => {
  try {
    const { journalId } = req.params;
    
    console.log(' Generating insight for journal ID:', journalId);
    
    if (!journalId) {
      return res.status(400).json({
        success: false,
        error: 'Journal ID is required'
      });
    }

    // Check if journalId is a valid ObjectId format
    if (!journalId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid journal ID format'
      });
    }

    const insight = await generateInsightFromJournal(journalId);
    
    console.log('Insight generated successfully:', insight.id);
    
    res.json({
      success: true,
      data: insight,
      message: 'Insight generated successfully'
    });

  } catch (error) {
    console.error(' Error in generateInsightHandler:', error);
    
    // Handle specific error types
    if (error.message === 'Journal entry not found') {
      return res.status(404).json({
        success: false,
        error: 'Journal entry not found'
      });
    }
    
    if (error.message.includes('Ollama')) {
      return res.status(503).json({
        success: false,
        error: 'AI service temporarily unavailable. Please try again.',
        details: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to generate insight',
      details: error.message
    });
  }
};

module.exports = {
  generateInsightHandler,
};