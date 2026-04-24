/**
 * Opt-out feature toggles via Vite env. Omitted or empty means enabled (production-safe defaults).
 * Set to "false" or "0" to disable.
 */
function readBoolFlag(raw: string | undefined, defaultOn: boolean): boolean {
  if (raw === undefined || raw === '') return defaultOn;
  const v = raw.trim().toLowerCase();
  return v !== 'false' && v !== '0' && v !== 'off' && v !== 'no';
}

export const featureFlags = {
  navigationAssistant: () =>
    readBoolFlag(import.meta.env.VITE_FEATURE_NAVIGATION_ASSISTANT, true),

  /** When false, hirer/musician chat pages skip the automatic first AI message. */
  aiAssistantAutoWelcome: () =>
    readBoolFlag(import.meta.env.VITE_FEATURE_AI_ASSISTANT_AUTO_WELCOME, true),
} as const;
