import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/supabase/auth-helpers';
import { z } from 'zod';
// NOTE: this controller dispatches the legacy Firestore clone workflow
// (sync-firestore.yml) — obsolete post-migration. Auth swapped to Supabase so
// it compiles; the workflow itself is removed in Phase 6/7.

// Sync controller for the superadmin UI. Triggers the sync-firestore.yml
// GitHub Actions workflow via the workflow_dispatch API. We never run the
// clone scripts on the request-handling server — they'd time out, leak
// credentials, and tie prod uptime to a long-running batch job.

const ALLOWED_CALLER_ROLES = new Set(['super_admin', 'makhzoon_admin']);

const ALLOWED_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['prod', 'dev'],
  ['prod', 'staging'],
  ['prod', 'legacy'],
  ['staging', 'dev'],
];

const bodySchema = z.object({
  source: z.enum(['prod', 'staging']),
  target: z.enum(['dev', 'staging', 'legacy']),
  dry_run: z.boolean().optional(),
  skip_auth: z.boolean().optional(),
});

const WORKFLOW_FILE = 'sync-firestore.yml';
const DEFAULT_REPO = 'MakhzoonME/Makhzoon';

function isAllowedPair(source: string, target: string) {
  return ALLOWED_PAIRS.some(([s, t]) => s === source && t === target);
}

async function dispatchWorkflow(inputs: Record<string, string>) {
  const repo = process.env.GITHUB_REPO ?? DEFAULT_REPO;
  const ref = process.env.GITHUB_REF_BRANCH ?? 'main';
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  if (!token) throw new Error('GITHUB_DISPATCH_TOKEN env var is not set');

  const url = `https://api.github.com/repos/${repo}/actions/workflows/${WORKFLOW_FILE}/dispatches`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ref, inputs }),
  });
  if (res.status === 204) return { ok: true } as const;
  const text = await res.text();
  return { ok: false, status: res.status, body: text } as const;
}

export async function POST(req: NextRequest) {
  const caller = await verifySessionCookie();
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!ALLOWED_CALLER_ROLES.has(caller.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  const { source, target, dry_run, skip_auth } = parsed.data;

  if (!isAllowedPair(source, target)) {
    return NextResponse.json({ error: `Pair ${source} → ${target} is not allowed` }, { status: 422 });
  }
  if (source === target) {
    return NextResponse.json({ error: 'Source and target cannot be the same' }, { status: 422 });
  }

  const result = await dispatchWorkflow({
    source,
    target,
    dry_run: String(dry_run ?? false),
    skip_auth: String(skip_auth ?? false),
  });
  if (!result.ok) {
    console.error('[POST /api/superadmin/sync] github dispatch failed', result);
    return NextResponse.json(
      { error: 'Failed to dispatch sync workflow', details: result.body },
      { status: 502 },
    );
  }
  return NextResponse.json({ dispatched: true, source, target }, { status: 202 });
}

export async function GET() {
  const caller = await verifySessionCookie();
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!ALLOWED_CALLER_ROLES.has(caller.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const repo = process.env.GITHUB_REPO ?? DEFAULT_REPO;
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  if (!token) {
    return NextResponse.json({ runs: [], note: 'GITHUB_DISPATCH_TOKEN not configured' });
  }

  const url = `https://api.github.com/repos/${repo}/actions/workflows/${WORKFLOW_FILE}/runs?per_page=10`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    return NextResponse.json({ runs: [], error: `github api ${res.status}` }, { status: 502 });
  }
  const data = (await res.json()) as {
    workflow_runs: Array<{
      id: number;
      status: string;
      conclusion: string | null;
      created_at: string;
      html_url: string;
      display_title: string;
      event: string;
      run_started_at?: string;
      updated_at: string;
    }>;
  };
  const runs = data.workflow_runs.map((r) => ({
    id: r.id,
    status: r.status,
    conclusion: r.conclusion,
    title: r.display_title,
    event: r.event,
    started: r.run_started_at ?? r.created_at,
    updated: r.updated_at,
    url: r.html_url,
  }));
  return NextResponse.json({ runs });
}
