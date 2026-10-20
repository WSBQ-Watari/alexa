/**
 * Online AI Conversational Service
 * Features Dual-Engine Architecture:
 * 1. Default: Free Cloud AI (Zero API Key required, 100% Free, Instant Hinglish answers)
 * 2. High-Performance: Google Gemini API (when API Key is provided in Settings)
 * Cost: ₹0.
 */

class AIService {
  constructor() {
    this.apiKey = localStorage.getItem('gemini_api_key') || '';
    this.model = localStorage.getItem('gemini_model') || 'gemini-1.5-flash';
    this.conversationHistory = [];
  }

  setApiKey(key) {
    this.apiKey = (key || '').trim();
    localStorage.setItem('gemini_api_key', this.apiKey);
  }

  getApiKey() {
    return this.apiKey;
  }

  setModel(model) {
    this.model = model;
    localStorage.setItem('gemini_model', this.model);
  }

  getModel() {
    return this.model;
  }

  hasApiKey() {
    return !!this.apiKey && this.apiKey.length > 10;
  }

  /**
   * Generates a Hinglish response from AI
   * @param {string} userQuery
   * @returns {Promise<{text: string, spokenText: string, isError: boolean, source: string}>}
   */
  async askAI(userQuery) {
    if (!navigator.onLine) {
      return {
        text: 'Abhi internet disconnected hai. Main offline commands jaise time, date aur math calculations abhi bhi turant bata sakti hoon!',
        spokenText: 'Internet disconnect hai. Aap offline time, date ya math puch sakte hain.',
        isError: true,
        source: 'Offline Fallback'
      };
    }

    // Mode A: If user provided Google Gemini API Key, use Gemini
    if (this.hasApiKey()) {
      return await this.askGemini(userQuery);
    }

    // Mode B: Zero-Setup Free AI Engine (Works Out-Of-The-Box with ₹0 and NO API KEY!)
    return await this.askFreeCloudAI(userQuery);
  }

  /**
   * Free Cloud AI (Zero-setup Hinglish voice assistant)
   */
  async askFreeCloudAI(userQuery) {
    const systemPrompt = `
You are "Alexa", a witty, warm, and helpful AI assistant running on a Samsung Galaxy J6 smart display connected to a Bluetooth speaker.
STRICT RULES:
1. Reply in natural, warm, conversational Hinglish (written in Latin/English alphabet, e.g. "Haanji, bilkul...", "Aaj ka mausam bohot badiya hai...", "Chai banane ke liye...").
2. KEEP RESPONSES VERY SHORT (1 to 2 sentences, maximum 35 words) because this will be spoken aloud via speaker.
3. NEVER use bullet points, tables, asterisks, or markdown formatting. Just plain conversational speech.
4. Current year is 2026.
    `.trim();

    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        ...this.conversationHistory.slice(-4),
        { role: 'user', content: userQuery }
      ];

      const response = await fetch('https://text.pollinations.ai/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages,
          model: 'openai',
          temperature: 0.7,
          seed: 42
        })
      });

      if (!response.ok) {
        throw new Error(`Free AI HTTP ${response.status}`);
      }

      let reply = await response.text();
      reply = this.cleanSpokenText(reply);

      // Save turn to history
      this.conversationHistory.push({ role: 'user', content: userQuery });
      this.conversationHistory.push({ role: 'assistant', content: reply });
      if (this.conversationHistory.length > 8) {
        this.conversationHistory = this.conversationHistory.slice(-4);
      }

      return {
        text: reply,
        spokenText: reply,
        isError: false,
        source: 'Free Cloud AI (Zero Setup)'
      };

    } catch (e) {
      console.warn('Free Cloud AI error, attempting fallback:', e);
      return {
        text: `Maine aapka sawal suna: "${userQuery}". AI server se jodne mein dikkat aayi. Aap Settings mein apni free Google Gemini key bhi daal sakte hain!`,
        spokenText: 'Maaf kijiye, abhi server se connect nahi ho paya. Thodi der baad try kijiye.',
        isError: true,
        source: 'Connection Retry'
      };
    }
  }

  /**
   * Google Gemini API Engine
   */
  async askGemini(userQuery) {
    const systemInstruction = `
You are "Alexa", a friendly AI assistant on a custom Samsung Galaxy J6 Smart Display connected to a Bluetooth speaker.
STRICT GUIDELINES:
1. Speak in warm, conversational Hinglish (Latin alphabet, e.g., "Haanji, bilkul...", "Ye raha aapka answer...").
2. KEEP RESPONSES VERY SHORT (1 to 2 sentences maximum, under 35 words) for voice output.
3. NEVER output markdown symbols, asterisks, lists, or code blocks.
4. Current year is 2026.
    `.trim();

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

      const payload = {
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [
          { role: 'user', parts: [{ text: userQuery }] }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 100,
          topP: 0.95
        }
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Gemini API HTTP ${response.status}`);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const reply = this.cleanSpokenText(rawText);

      return {
        text: reply,
        spokenText: reply,
        isError: false,
        source: `Gemini AI (${this.model})`
      };

    } catch (error) {
      console.warn('Gemini request failed, falling back to Free Cloud AI:', error);
      return await this.askFreeCloudAI(userQuery);
    }
  }

  cleanSpokenText(text) {
    return (text || '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#/g, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`/g, '')
      .replace(/\[.*?\]/g, '')
      .trim();
  }
}

// Global instance
window.aiService = new AIService();
