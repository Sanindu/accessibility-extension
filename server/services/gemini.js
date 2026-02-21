const Groq = require('groq-sdk');

class GroqService {
  constructor() {
    this.client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    this.model = 'llama-3.3-70b-versatile';
  }

  async summarizePage(pageContent, pageTitle) {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful accessibility assistant that creates concise webpage summaries for visually impaired users.'
        },
        {
          role: 'user',
          content: `Summarize this webpage in 2-3 concise sentences, focusing on the main purpose and key interactive elements (buttons, links, forms).

Page Title: ${pageTitle}

Page Content:
${pageContent.substring(0, 3000)}

Provide a clear, actionable summary.`
        }
      ],
      temperature: 0.7,
      max_tokens: 200
    });

    return response.choices[0].message.content.trim();
  }

  async findElement(command, elements) {
    const elementsDescription = elements.map((el, idx) =>
      `${idx}. ${el.tag} - Text: "${el.text}" - ARIA Label: "${el.ariaLabel || 'none'}" - Role: "${el.role || 'none'}"`
    ).join('\n');

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: 'You are an AI assistant that matches user voice commands to webpage elements. Respond with only the element number.'
        },
        {
          role: 'user',
          content: `A visually impaired user wants to interact with a webpage. They said: "${command}"

Available elements on the page:
${elementsDescription}

Which element number (0-${elements.length - 1}) best matches their command? Consider:
- Exact text matches
- Semantic meaning
- Common synonyms (e.g., "sign up" = "register")
- Element type (button, link, input)

Respond with ONLY the element number. If no good match exists, respond with "-1".`
        }
      ],
      temperature: 0.3,
      max_tokens: 10
    });

    const elementIndex = parseInt(response.choices[0].message.content.trim());

    if (isNaN(elementIndex) || elementIndex === -1 || elementIndex < 0 || elementIndex >= elements.length) {
      return { found: false, message: 'No matching element found' };
    }

    return {
      found: true,
      element: elements[elementIndex],
      elementIndex: elementIndex
    };
  }
}

module.exports = new GroqService();
