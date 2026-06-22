import Anthropic from "@anthropic-ai/sdk";

// Constructed with a fallback so importing this module never throws at build time
// when the key is absent. The route guards against a missing key before any real call.
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "MISSING_ANTHROPIC_API_KEY",
});
