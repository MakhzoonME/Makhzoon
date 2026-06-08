'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Pencil, Trash2, Phone, ToggleLeft, ToggleRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter,
} from '@/components/ui/dialog';
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form';
import {
  useDeliveryAgents, useCreateDeliveryAgent, useUpdateDeliveryAgent, useDeleteDeliveryAgent,
} from '@/hooks/haraka';
import { toast, useModuleGuard } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { cn } from '@/lib/utils/cn';
import { deliveryAgentSchema, type DeliveryAgentFormData } from '@/lib/modules/haraka/delivery-agents/schemas';
import type { HarakaDeliveryAgent } from '@/types';

const EMPTY: DeliveryAgentFormData = { name: '', phone: null, notes: null, isActive: true };

function AgentFormDialog({
  open,
  onOpenChange,
  initial,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<DeliveryAgentFormData>;
  onSave: (values: DeliveryAgentFormData) => Promise<void>;
  saving: boolean;
}) {
  const form = useForm<DeliveryAgentFormData>({
    resolver: zodResolver(deliveryAgentSchema),
    defaultValues: { ...EMPTY, ...initial },
  });

  // Reset form when dialog opens with new data
  useState(() => { form.reset({ ...EMPTY, ...initial }); });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{initial?.name ? 'Edit delivery agent' : 'New delivery agent'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSave)}>
            <DialogBody className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input autoFocus placeholder="Agent name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="+962 7…"
                        inputMode="tel"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={2}
                        placeholder="Optional notes…"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function DeliveryAgentsPage() {
  const { isAllowed } = useModuleGuard({ featureKey: 'pos', moduleKey: 'pos' });
  const params = useParams<{ locale: string; orgSlug: string; space: string }>();
  const { data: orgInfo } = useOrgInfo();
  if (!isAllowed) return null;
  const base = `/${params.locale}/${params.orgSlug}/${params.space}/haraka`;

  const { data, isLoading } = useDeliveryAgents();
  const agents = data?.items ?? [];

  const createMut = useCreateDeliveryAgent();
  const updateMut = useUpdateDeliveryAgent();
  const deleteMut = useDeleteDeliveryAgent();

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<HarakaDeliveryAgent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HarakaDeliveryAgent | null>(null);

  async function handleCreate(values: DeliveryAgentFormData) {
    try {
      await createMut.mutateAsync(values);
      toast.success('Delivery agent added');
      setAddOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add agent');
    }
  }

  async function handleEdit(values: DeliveryAgentFormData) {
    if (!editTarget) return;
    try {
      await updateMut.mutateAsync({ id: editTarget.id, body: values });
      toast.success('Agent updated');
      setEditTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update agent');
    }
  }

  async function handleToggleActive(agent: HarakaDeliveryAgent) {
    try {
      await updateMut.mutateAsync({ id: agent.id, body: { isActive: !agent.isActive } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update agent');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMut.mutateAsync(deleteTarget.id);
      toast.success('Agent removed');
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete agent');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery agents"
        description="External people who handle deliveries. They don't need a system account."
        breadcrumb={[
          { label: orgInfo?.name ?? params.orgSlug },
          { label: params.space },
          { label: 'Haraka', href: base },
          { label: 'Delivery agents' },
        ]}
        actions={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 me-1" strokeWidth={1.75} />
            Add agent
          </Button>
        }
      />

      <div className="bg-surface-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-page">
              <th className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
              <th className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</th>
              <th className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</th>
              <th className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-surface-page rounded animate-pulse" style={{ width: j === 0 ? '120px' : '80px' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : agents.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-400">
                  No delivery agents yet. Add one to start assigning deliveries.
                </td>
              </tr>
            ) : agents.map((a) => (
              <tr key={a.id} className="hover:bg-surface-page transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{a.name}</td>
                <td className="px-4 py-3 text-gray-500">
                  {a.phone ? (
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-gray-400" strokeWidth={1.75} />
                      {a.phone}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{a.notes || '—'}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(a)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold cursor-pointer transition-colors',
                      a.isActive
                        ? 'bg-[var(--green-100)] text-[var(--green-700)] hover:bg-[var(--green-200)]'
                        : 'bg-surface-page text-gray-500 hover:bg-gray-100',
                    )}
                  >
                    {a.isActive
                      ? <><ToggleRight className="h-3 w-3" strokeWidth={1.75} /> Active</>
                      : <><ToggleLeft className="h-3 w-3" strokeWidth={1.75} /> Inactive</>
                    }
                  </button>
                </td>
                <td className="px-4 py-3 text-end">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="Edit agent"
                      className="text-gray-500 hover:text-primary-600 hover:bg-primary-50 cursor-pointer transition-colors"
                      onClick={() => setEditTarget(a)}
                    >
                      <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="Delete agent"
                      className="text-red-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                      onClick={() => setDeleteTarget(a)}
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add dialog */}
      <AgentFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSave={handleCreate}
        saving={createMut.isPending}
      />

      {/* Edit dialog */}
      {editTarget && (
        <AgentFormDialog
          key={editTarget.id}
          open={!!editTarget}
          onOpenChange={(v) => !v && setEditTarget(null)}
          initial={{
            name: editTarget.name,
            phone: editTarget.phone,
            notes: editTarget.notes,
            isActive: editTarget.isActive,
          }}
          onSave={handleEdit}
          saving={updateMut.isPending}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Remove delivery agent"
        description={`Remove "${deleteTarget?.name}"? This won't affect existing orders they were assigned to.`}
        confirmLabel="Remove"
        onConfirm={handleDelete}
        loading={deleteMut.isPending}
      />
    </div>
  );
}
