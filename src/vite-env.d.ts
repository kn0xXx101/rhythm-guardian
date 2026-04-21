/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Client-side OpenAI key for the AI Assistant (optional; falls back to local knowledge base). */
  readonly VITE_OPENAI_API_KEY?: string;
}
