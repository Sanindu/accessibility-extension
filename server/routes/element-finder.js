const express = require('express');
const router = express.Router();
const geminiService = require('../services/gemini');

/**
 * POST /api/find-element
 * Finds the best matching element for a voice command
 */
router.post('/', async (req, res) => {
  try {
    const { command, elements, userId } = req.body;

    console.log('🎤 Voice command received:', command);
    console.log('📊 Elements to search:', elements?.length);

    if (!command || !elements || !Array.isArray(elements)) {
      console.error('❌ Invalid request:', { command: !!command, elements: Array.isArray(elements) });
      return res.status(400).json({
        success: false,
        error: 'command and elements array are required'
      });
    }

    if (elements.length === 0) {
      console.warn('⚠️ No elements on page');
      return res.json({
        success: true,
        found: false,
        message: 'No interactive elements found on page'
      });
    }

    console.log('🔍 Searching for element matching:', command);

    // Use Minimax AI to find matching element (or fallback)
    let result;
    let usedGroq = false;

    try {
      console.log('🤖 Attempting Groq AI element matching...');
      result = await geminiService.findElement(command, elements);
      usedGroq = true;
      console.log('✅ Groq found element:', result.found);
    } catch (geminiError) {
      console.error('❌ Groq element finder failed:', geminiError.message);
      console.warn('⚠️ Falling back to SIMPLE TEXT MATCHING');

      // Fallback: Simple text matching
      const commandLower = command.toLowerCase();
      let foundIndex = -1;

      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        const text = (el.text || el.ariaLabel || '').toLowerCase();

        if (text.includes(commandLower) || commandLower.includes(text)) {
          foundIndex = i;
          console.log(`📝 FALLBACK found match: "${el.text}" at index ${i}`);
          break;
        }
      }

      if (foundIndex >= 0) {
        result = {
          found: true,
          element: elements[foundIndex],
          elementIndex: foundIndex
        };
      } else {
        result = {
          found: false,
          message: 'Could not find a matching element for your command'
        };
      }
    }

    console.log('✅ Search result:', result.found ? 'Found' : 'Not found');
    console.log('🔧 Method used:', usedGroq ? 'MINIMAX AI' : 'FALLBACK');

    if (!result.found) {
      return res.json({
        success: true,
        found: false,
        usedGroq: usedGroq,
        message: result.message || 'Could not find a matching element for your command'
      });
    }

    res.json({
      success: true,
      found: true,
      usedGroq: usedGroq,
      element: result.element,
      elementIndex: result.elementIndex,
      message: `Found: ${result.element.text || result.element.ariaLabel || result.element.tag}`
    });
  } catch (error) {
    console.error('Element finder error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to find element'
    });
  }
});

module.exports = router;
