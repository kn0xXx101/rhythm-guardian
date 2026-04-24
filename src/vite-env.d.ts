/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Client-side OpenAI key for the AI Assistant (optional; falls back to local knowledge base). */
  readonly VITE_OPENAI_API_KEY?: string;
  /** Set to "false" to hide the dashboard navigation assistant. */
  readonly VITE_FEATURE_NAVIGATION_ASSISTANT?: string;
  /** Set to "false" to skip the automatic first AI Assistant message on chat load. */
  readonly VITE_FEATURE_AI_ASSISTANT_AUTO_WELCOME?: string;
}
