/** Reading script for voice licensing samples (~90s at a natural pace). */
export const VOICE_SAMPLE_SCRIPT = `This is my voice sample for Muhr. I am reading clearly and at a steady, natural pace so licensees can understand my tone, rhythm, and pronunciation.

Every brand license is approved by me first. My likeness and voice stay under my control, and I decide where they appear.

The quick brown fox jumps over the lazy dog near the quiet riverbank. Bright city lights shimmer after midnight rain on cobblestone streets.

Numbers matter too: one, two, three, four, five, six, seven, eight, nine, ten, eleven, twelve, twenty, thirty, forty, fifty, one hundred.

Questions and emphasis change how I sound. Really? Absolutely. Perhaps tomorrow we finalize the agreement.

Soft vowels and sharp consonants: auctioned, rhythm, synthesis, photography, architecture, extraordinary, vulnerability, opportunity.

Thank you for listening. This completes my Muhr voice sample.`;

/** Estimated reading duration at ~130 words per minute. */
export function voiceScriptDurationMs(wordsPerMinute = 130): number {
  const words = VOICE_SAMPLE_SCRIPT.split(/\s+/).filter(Boolean).length;
  return Math.round((words / wordsPerMinute) * 60 * 1000);
}
