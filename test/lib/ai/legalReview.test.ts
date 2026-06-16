import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runLegalReview } from '@/lib/ai/legalReview';

const SAMPLE_RESULT = {
  overallRisk: 'medium',
  summary: 'Some issues found',
  issues: [
    {
      severity: 'medium',
      clause: 'Payment',
      problem: 'No payment timing',
      whyItMatters: 'Creator may not get paid on time',
      suggestedFix: 'Add payment within 30 days of delivery',
    },
  ],
  missingClauses: ['Governing law'],
  riskyClauses: ['IP assignment'],
  suggestedEdits: [
    { currentText: undefined, proposedText: 'Payment due within 30 days', reason: 'Clarify timing' },
  ],
  disclaimer: 'This is an AI-assisted contract review, not legal advice. Consult a qualified lawyer before signing.'
};

describe('runLegalReview', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';
  });

  it('parses model JSON and returns validated result', async () => {
    // mock fetch (OpenAI)
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify(SAMPLE_RESULT) } }] }),
    }) as unknown as Response));

    const res = await runLegalReview('contract text', { id: 'x' });
    expect(res.overallRisk).toBe('medium');
    expect(res.issues.length).toBe(1);
    expect(res.missingClauses).toContain('Governing law');
  });
});
