import { describe, it, expect } from 'vitest';
import { selectBalancedAgents } from '@/lib/modules/haraka/delivery-agents/balanced-routing';
import type { HarakaDeliveryAgent } from '@/types';

function agent(overrides: Partial<HarakaDeliveryAgent> = {}): HarakaDeliveryAgent {
  return {
    id: 'agent-1',
    organizationId: 'org-1',
    name: 'Agent',
    phone: null,
    notes: null,
    isActive: true,
    createdAt: new Date(),
    createdBy: null,
    updatedAt: new Date(),
    updatedBy: null,
    ...overrides,
  };
}

describe('selectBalancedAgents', () => {
  it('picks the agent with the lowest open-job count', () => {
    const agents = [
      agent({ id: 'a', name: 'A' }),
      agent({ id: 'b', name: 'B' }),
      agent({ id: 'c', name: 'C' }),
    ];
    const counts = { a: 3, b: 0, c: 1 };
    const picked = selectBalancedAgents(agents, counts, 1);
    expect(picked.map((p) => p.id)).toEqual(['b']);
  });

  it('picks N agents in ascending load order', () => {
    const agents = [
      agent({ id: 'a', name: 'A' }),
      agent({ id: 'b', name: 'B' }),
      agent({ id: 'c', name: 'C' }),
    ];
    const counts = { a: 3, b: 0, c: 1 };
    const picked = selectBalancedAgents(agents, counts, 2);
    expect(picked.map((p) => p.id)).toEqual(['b', 'c']);
  });

  it('treats agents with no recorded jobs as zero load', () => {
    const agents = [agent({ id: 'a' }), agent({ id: 'b' })];
    const picked = selectBalancedAgents(agents, { a: 2 }, 1);
    expect(picked.map((p) => p.id)).toEqual(['b']);
  });

  it('excludes inactive agents', () => {
    const agents = [
      agent({ id: 'a', isActive: false }),
      agent({ id: 'b', isActive: true }),
    ];
    const picked = selectBalancedAgents(agents, { a: 0, b: 5 }, 1);
    expect(picked.map((p) => p.id)).toEqual(['b']);
  });

  it('breaks ties deterministically by agent id', () => {
    const agents = [agent({ id: 'zzz' }), agent({ id: 'aaa' })];
    const picked = selectBalancedAgents(agents, { zzz: 0, aaa: 0 }, 1);
    expect(picked.map((p) => p.id)).toEqual(['aaa']);
  });

  it('returns fewer than count when not enough active agents exist', () => {
    const agents = [agent({ id: 'a' })];
    const picked = selectBalancedAgents(agents, {}, 3);
    expect(picked.map((p) => p.id)).toEqual(['a']);
  });
});
