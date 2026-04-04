// OpenAI Service for AI Assistant
// This service provides intelligent responses using OpenAI's API

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

class OpenAIService {
  private apiKey: string | null = null;
  private baseURL = 'https://api.openai.com/v1/chat/completions';

  constructor() {
    // Get API key from environment variable
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY || null;
  }

  /**
   * Check if OpenAI is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Generate a response using OpenAI
   */
  async generateResponse(messages: Message[]): Promise<string | null> {
    if (!this.isConfigured()) {
      console.warn('OpenAI API key not configured');
      return null;
    }

    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages,
          max_tokens: 300,
          temperature: 0.7,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('OpenAI API error:', error);
        return null;
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || null;
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      return null;
    }
  }

  /**
   * Generate a response with streaming (for future use)
   */
  async *generateStreamingResponse(messages: Message[]): AsyncGenerator<string> {
    if (!this.isConfigured()) {
      console.warn('OpenAI API key not configured');
      return;
    }

    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages,
          max_tokens: 300,
          temperature: 0.7,
          stream: true,
        }),
      });

      if (!response.ok) {
        console.error('OpenAI API error');
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in streaming response:', error);
    }
  }
}

export const openAIService = new OpenAIService();