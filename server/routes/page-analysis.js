const express = require('express');
const router = express.Router();
const geminiService = require('../services/gemini');

/**
 * POST /api/analyze-page
 * Analyzes page content and returns summary with audio
 */
router.post('/', async (req, res) => {
  try {
    const { pageContent, pageTitle, elements, userId } = req.body;

    if (!pageContent || !pageTitle) {
      return res.status(400).json({
        success: false,
        error: 'pageContent and pageTitle are required'
      });
    }

    let summary;
    let audioBase64 = null;
    let usedGroq = false;

    try {
      console.log('🤖 Attempting to use Groq AI...');

      summary = await geminiService.summarizePage(pageContent, pageTitle);

      console.log('✅ Groq Summary Generated:', summary.substring(0, 100) + '...');
      usedGroq = true;
    } catch (geminiError) {
      console.error('❌ Groq FAILED:', geminiError.message);
      console.warn('⚠️ Falling back to simple summary and browser TTS');

      // Fallback: Generate descriptive summary with navigation options
      let description = '';
      let navOptions = '';

      // Create page description based on content
      const contentPreview = pageContent.substring(0, 200).trim();
      if (contentPreview.length > 20) {
        description = ` ${contentPreview.substring(0, 150)}...`;
      }

      // List navigation options (increased from 8 to 20)
      if (elements && elements.length > 0) {
        // Filter valid elements with text
        const validElements = elements.filter(el =>
          el.text &&
          el.text.length > 0 &&
          el.text.length < 50 &&
          !el.text.match(/^\s*$/) // Not just whitespace
        );

        // Get up to 20 elements
        const displayElements = validElements.slice(0, 20);

        if (displayElements.length > 0) {
          const buttonList = displayElements.map(el => el.text).join(', ');
          navOptions = ` Main navigation options available on this page: ${buttonList}`;

          if (validElements.length > 20) {
            navOptions += `, and ${validElements.length - 20} more`;
          }
          navOptions += '.';
        }
      }

      summary = `This page is titled: ${pageTitle}.${description}${navOptions} You can navigate by pressing Alt A and saying commands like "click on sign in", "go to about", or "click search button".`;

      // No audio - extension will use browser TTS
      audioBase64 = null;

      console.log('📝 FALLBACK Summary Generated:', summary.substring(0, 100) + '...');
      console.log('🔊 Will use BROWSER TTS for audio');
    }

    res.json({
      success: true,
      summary: summary,
      audio: audioBase64,
      audioFormat: 'mp3',
      usedGroq: usedGroq,
      usedFallback: !usedGroq
    });
  } catch (error) {
    console.error('Page analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze page'
    });
  }
});

module.exports = router;
