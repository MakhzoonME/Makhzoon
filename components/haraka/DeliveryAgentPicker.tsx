'use client';

import { useMemo } from 'react';
import { Truck, Users } from 'lucide-react';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { useDeliveryAgents } from '@/hooks/haraka';
import { useSpaceMembers } from '@/hooks/spaces';
import { useParams } from 'next/navigation';

export interface DeliveryAgentValue {
  type: 'member' | 'external';
  id: string;
  name: string;
}

interface Props {
  value: DeliveryAgentValue | null;
  onChange: (v: DeliveryAgentValue | null) => void;
  placeholder?: string;
}

function encode(v: DeliveryAgentValue): string {
  return `${v.type}:${v.id}`;
}

export function DeliveryAgentPicker({ value, onChange, placeholder = 'Assign delivery agent' }: Props) {
  const { space } = useParams<{ space?: string }>();

  const { data: agentsData } = useDeliveryAgents(true);
  const { data: membersData } = useSpaceMembers(space);

  const agents: DeliveryAgentValue[] = useMemo(() => {
    const members = (membersData?.items ?? []).map((m) => ({
      type: 'member' as const,
      id: m.userId,
      name: m.displayName || m.email || m.userId,
    }));
    const externals = (agentsData?.items ?? []).map((a) => ({
      type: 'external' as const,
      id: a.id,
      name: a.name,
    }));
    return [...members, ...externals];
  }, [membersData, agentsData]);

  const options: ComboboxOption[] = useMemo(
    () =>
      agents.map((a) => ({
        value: encode(a),
        label: a.name,
        group: a.type === 'member' ? 'Staff' : 'External agents',
      })),
    [agents],
  );

  const selectedIcon = useMemo(() => {
    if (!value) return Users;
    return value.type === 'member' ? Users : Truck;
  }, [value]);

  return (
    <Combobox
      value={value ? encode(value) : null}
      onChange={(v) => {
        const agent = v ? agents.find((a) => encode(a) === v) ?? null : null;
        onChange(agent);
      }}
      options={options}
      placeholder={placeholder}
      emptyMessage="No agents found."
      icon={selectedIcon}
    />
  );
}
