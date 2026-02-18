// Centralized configuration and secret access
// DO NOT return private keys to client code

function requireEnv(name) {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  // Push notifications
  VAPID_PUBLIC_KEY: () => requireEnv("VAPID_PUBLIC_KEY"),
  VAPID_PRIVATE_KEY: () => requireEnv("VAPID_PRIVATE_KEY"), // NEVER expose to client
  
  // Slack (if added)
  SLACK_BOT_TOKEN: () => Deno.env.get("SLACK_BOT_TOKEN") || null,
  SLACK_SIGNING_SECRET: () => Deno.env.get("SLACK_SIGNING_SECRET") || null,
  
  // QuickBooks (if added)
  QUICKBOOKS_CLIENT_ID: () => Deno.env.get("QUICKBOOKS_CLIENT_ID") || null,
  QUICKBOOKS_CLIENT_SECRET: () => Deno.env.get("QUICKBOOKS_CLIENT_SECRET") || null,
  
  // External AI/LLM provider keys (if added)
  LLM_PROVIDER_KEY: () => Deno.env.get("LLM_PROVIDER_KEY") || null,
  
  // Weather API (if added)
  WEATHER_API_KEY: () => Deno.env.get("WEATHER_API_KEY") || null,
};