import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth/requireUser');
vi.mock('@/lib/supabase/route');
vi.mock('@/lib/supabase/service');
vi.mock('@/lib/ai/legalReview');

import { requireUser } from '@/lib/auth/requireUser';
import { createRouteClient } from '@/lib/supabase/route';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { runLegalReview } from '@/lib/ai/legalReview';
import { POST } from '@/app/api/licenses/incoming/[id]/review/route';

function chainEndingWith(value: unknown) {
  const t = { maybeSingle: vi.fn().mockResolvedValue(value), eq: () => t } as const;
  return t;
}

describe('POST /api/licenses/incoming/[id]/review', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with review and uses cache when available', async () => {
    vi.mocked(requireUser).mockResolvedValue({ id: 'user-1', email: 'u@example.com' } as never);

    const fakeRow = { id: 'req-1', creator_id: 'creator-1', brand_email: 'u@example.com', contract_body: { type: 'doc', content: [] } };

    const routeSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'license_requests') {
          return { select: vi.fn().mockReturnValue(chainEndingWith({ data: fakeRow, error: null })) };
        }
        return { select: vi.fn().mockReturnValue(chainEndingWith({ data: null, error: null })) };
      }),
    } as unknown as Record<string, unknown>;
    vi.mocked(createRouteClient).mockResolvedValue(routeSupabase as never);

    // service client with a cached row
    const serviceFrom = vi.fn((table: string) => {
      if (table === 'ai_review_cache') {
        return {
          select: vi.fn().mockReturnValue(
            chainEndingWith({
              data: {
                result: {
                  overallRisk: "low",
                  summary: "cached",
                  issues: [],
                  disclaimer: "This is an AI-assisted contract review, not legal advice.",
                },
                expires_at: new Date(Date.now() + 86400000).toISOString(),
              },
              error: null,
            })
          ),
        };
      }
      return { select: vi.fn().mockReturnValue(chainEndingWith({ data: null, error: null })), insert: vi.fn().mockResolvedValue({ error: null }) };
    });
    const serviceClient = { from: serviceFrom, rpc: vi.fn().mockResolvedValue([{ ok: true, review_count: 1, estimated_cost_cents: 50 }]) } as unknown as Record<string, unknown>;
    vi.mocked(createServiceRoleClient).mockReturnValue(serviceClient as never);

    const response = await POST(new Request('http://test', { method: 'POST' }), { params: Promise.resolve({ id: 'req-1' }) } as unknown as { params: Promise<{ id: string }> });
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.review.overallRisk).toBe('low');
  });

  it('enforces rate limit', async () => {
    vi.mocked(requireUser).mockResolvedValue({ id: 'user-2', email: 'u2@example.com' } as never);
    const fakeRow = { id: 'req-2', creator_id: 'creator-2', brand_email: 'u2@example.com', contract_body: { type: 'doc', content: [] } };
    const routeSupabase = { from: vi.fn((table: string) => { if (table === 'license_requests') return { select: vi.fn().mockReturnValue(chainEndingWith({ data: fakeRow, error: null })) }; return { select: vi.fn().mockReturnValue(chainEndingWith({ data: null, error: null })) }; }) } as unknown as Record<string, unknown>;
    vi.mocked(createRouteClient).mockResolvedValue(routeSupabase as never);

    // service client counters show already at limit (rpc will return ok=false)
    const serviceFrom = vi.fn((table: string) => {
      if (table === 'ai_review_counters') {
        return { select: vi.fn().mockReturnValue(chainEndingWith({ data: [{ review_count: 100 }], error: null })), upsert: vi.fn().mockResolvedValue({ error: null }) };
      }
      return { select: vi.fn().mockReturnValue(chainEndingWith({ data: null, error: null })), insert: vi.fn().mockResolvedValue({ error: null }) };
    });
    const serviceClient = { from: serviceFrom, rpc: vi.fn().mockResolvedValue([{ ok: false, review_count: 100, estimated_cost_cents: 1000 }]) } as unknown as Record<string, unknown>;
    vi.mocked(createServiceRoleClient).mockReturnValue(serviceClient as never);

    // set low limit
    process.env.OPENAI_DAILY_LIMIT = '10';

    const response = await POST(new Request('http://test', { method: 'POST' }), { params: Promise.resolve({ id: 'req-2' }) } as unknown as { params: Promise<{ id: string }> });
    expect(response.status).toBe(429);
  });

  it('calls runLegalReview and saves to cache when no cache', async () => {
    vi.mocked(requireUser).mockResolvedValue({ id: 'user-3', email: 'u3@example.com' } as never);
    const fakeRow = { id: 'req-3', creator_id: 'creator-3', brand_email: 'u3@example.com', contract_body: { type: 'doc', content: [] } };
    const routeSupabase = { from: vi.fn((table: string) => { if (table === 'license_requests') return { select: vi.fn().mockReturnValue(chainEndingWith({ data: fakeRow, error: null })) }; return { select: vi.fn().mockReturnValue(chainEndingWith({ data: null, error: null })) }; }) } as unknown as Record<string, unknown>;
    vi.mocked(createRouteClient).mockResolvedValue(routeSupabase as never);

    const runResult = { overallRisk: 'medium', summary: 'ok', issues: [], missingClauses: [], riskyClauses: [], suggestedEdits: [], disclaimer: 'This is an AI-assisted contract review, not legal advice. Consult a qualified lawyer before signing.' };
    vi.mocked(runLegalReview as unknown as (() => Promise<unknown>)).mockResolvedValue(runResult as never);

    const insertSpy = vi.fn().mockResolvedValue({ error: null });
    const serviceFrom = vi.fn(() => ({
      select: vi.fn().mockReturnValue(chainEndingWith({ data: null, error: null })),
      insert: insertSpy,
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }));
    const serviceClient = { from: serviceFrom, rpc: vi.fn().mockResolvedValue([{ ok: true, review_count: 1, estimated_cost_cents: 50 }]) } as unknown as Record<string, unknown>;
    vi.mocked(createServiceRoleClient).mockReturnValue(serviceClient as never);

    const response = await POST(new Request('http://test', { method: 'POST' }), { params: Promise.resolve({ id: 'req-3' }) } as unknown as { params: Promise<{ id: string }> });
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(runLegalReview).toHaveBeenCalled();
    expect(insertSpy).toHaveBeenCalled();
  });
});
