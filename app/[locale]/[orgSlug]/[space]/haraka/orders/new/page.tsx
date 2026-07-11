'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Search, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfigSelect } from '@/components/shared/ConfigSelect';
import { DeliveryAgentPicker } from '@/components/haraka/DeliveryAgentPicker';
import type { DeliveryAgentValue } from '@/components/haraka/DeliveryAgentPicker';
import { CustomerSelect } from '@/components/haraka/CustomerSelect';
import type { SelectedCustomer } from '@/components/haraka/CustomerSelect';
import { useCreateOrder } from '@/hooks/haraka';
import { useInventoryItems } from '@/hooks/inventory/useInventory';
import { useSpaceMembers } from '@/hooks/spaces';
import { toast } from '@/hooks/ui';
import { createOrderSchema, type CreateOrderPayload } from '@/lib/modules/haraka/orders/schemas';
import { useOrgInfo } from '@/hooks/org';
import { formatCurrency } from '@/lib/utils/format';
import { useDebounce } from '@/hooks/ui';
import { DateTimePicker } from '@/components/ui/date-time-picker';

interface LineItem {
  inventoryItemId: string;
  inventoryItemName: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discountAmount: number;
}

function lineTotal(l: LineItem) {
  const sub = l.quantity * l.unitPrice - l.discountAmount;
  return sub + sub * l.taxRate;
}

export default function NewOrderPage() {
  const router = useRouter();
  const params = useParams<{ locale: string; orgSlug: string; space: string }>();
  const { data: orgInfo } = useOrgInfo();
  const createMut = useCreateOrder();
  const base = `/${params.locale}/${params.orgSlug}/${params.space}/haraka`;

  const [items, setItems] = useState<LineItem[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [showItemSearch, setShowItemSearch] = useState(false);
  const [deliveryAgent, setDeliveryAgent] = useState<DeliveryAgentValue | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null);
  const debouncedSearch = useDebounce(itemSearch, 300);

  const { data: inventoryData } = useInventoryItems({
    search: debouncedSearch || undefined,
    posEnabled: true,
    pageSize: 12,
  });
  const { data: membersData } = useSpaceMembers(params.space);
  const members = membersData?.items ?? [];

  const currency = orgInfo?.currency ?? 'USD';

  type FormData = CreateOrderPayload;

  const form = useForm<FormData>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      channel:         'phone',
      fulfillmentType: 'delivery',
      customerName:    '',
      customerPhone:   '',
      salesAgentId:    '',
      salesAgentName:  '',
      items:           [],
    },
  });

  const fulfillmentType = form.watch('fulfillmentType');

  // Keep the form's items field in sync so Zod validates the actual line items
  useEffect(() => {
    form.setValue('items', items as CreateOrderPayload['items'], { shouldValidate: true });
  }, [items, form]);

  function addItem(inv: { id: string; name: string; sku?: string; posPrice?: number | null; taxRateId?: string | null; unitCost?: number }) {
    const existing = items.find((l) => l.inventoryItemId === inv.id);
    if (existing) {
      setItems((prev) => prev.map((l) => l.inventoryItemId === inv.id ? { ...l, quantity: l.quantity + 1 } : l));
    } else {
      setItems((prev) => [...prev, {
        inventoryItemId:   inv.id,
        inventoryItemName: inv.name,
        sku:               inv.sku ?? null,
        quantity:          1,
        unitPrice:         inv.posPrice ?? inv.unitCost ?? 0,
        taxRate:           0,
        discountAmount:    0,
      }]);
    }
    setItemSearch('');
    setShowItemSearch(false);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((l) => l.inventoryItemId !== id));
  }

  function updateItem(id: string, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((l) => l.inventoryItemId === id ? { ...l, ...patch } : l));
  }

  const grandTotal = items.reduce((acc, l) => acc + lineTotal(l), 0);

  async function onSubmit(values: FormData) {
    if (items.length === 0) {
      toast.error('Add at least one item before submitting.');
      return;
    }
    try {
      const payload: CreateOrderPayload = {
        ...values,
        deliveryAgentId:       deliveryAgent?.type === 'external' ? deliveryAgent.id : null,
        deliveryAgentMemberId: deliveryAgent?.type === 'member'   ? deliveryAgent.id : null,
        deliveryAgentName:     deliveryAgent?.name ?? null,
        items: items.map((l) => ({
          inventoryItemId:   l.inventoryItemId,
          inventoryItemName: l.inventoryItemName,
          sku:               l.sku,
          quantity:          l.quantity,
          unitPrice:         l.unitPrice,
          taxRate:           l.taxRate,
          discountAmount:    l.discountAmount,
        })),
      };
      const { order } = await createMut.mutateAsync(payload);
      toast.success(`Order ${order.orderNumber} created.`);
      router.push(`${base}/orders/${order.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create order');
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="New Order"
        breadcrumb={[
          { label: orgInfo?.name ?? params.orgSlug },
          { label: 'Haraka', href: base },
          { label: 'Orders', href: `${base}/orders` },
          { label: 'New Order' },
        ]}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          {/* ── Channel + Fulfillment ───────────────────────────────── */}
          <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Order info</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="channel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Channel *</FormLabel>
                    <FormControl>
                      <ConfigSelect listKey="order_channel" value={field.value} onValueChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fulfillmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fulfillment *</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="delivery">Delivery</SelectItem>
                          <SelectItem value="pickup">Pickup</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* ── Customer ───────────────────────────────────────────── */}
          <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Customer</h3>

            {/* Customer picker — links to pos_customers */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Customer *</label>
              <CustomerSelect
                value={selectedCustomer}
                onChange={(c) => {
                  setSelectedCustomer(c);
                  form.setValue('customerName', c?.name ?? '', { shouldValidate: true });
                  form.setValue('customerPhone', c?.phone ?? null);
                  form.setValue('customerId', c?.id ?? null);
                }}
              />
              {form.formState.errors.customerName && (
                <p className="text-[12px] text-red-500">{form.formState.errors.customerName.message}</p>
              )}
            </div>

            {/* Manual override — visible when no customer selected */}
            {!selectedCustomer && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl><Input placeholder="Customer name" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl><Input placeholder="+962..." {...field} value={field.value ?? ''} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          {/* Delivery address — only when fulfillmentType = delivery */}
          {fulfillmentType === 'delivery' && (
            <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Delivery address</h3>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="deliveryAddress.street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street</FormLabel>
                      <FormControl><Input placeholder="Street / building" {...field} value={field.value ?? ''} /></FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="deliveryAddress.area"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Area</FormLabel>
                      <FormControl><Input placeholder="Neighborhood / area" {...field} value={field.value ?? ''} /></FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="deliveryAddress.city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl><Input placeholder="City" {...field} value={field.value ?? ''} /></FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="deliveryAddress.notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address notes</FormLabel>
                      <FormControl><Input placeholder="Landmark, floor…" {...field} value={field.value ?? ''} /></FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {/* ── Items ──────────────────────────────────────────────── */}
          <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Items</h3>

            {/* Item search */}
            <div className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search products to add…"
                    className="pl-9"
                    value={itemSearch}
                    onChange={(e) => { setItemSearch(e.target.value); setShowItemSearch(true); }}
                    onFocus={() => setShowItemSearch(true)}
                    onBlur={() => setTimeout(() => setShowItemSearch(false), 200)}
                  />
                </div>
              </div>
              {showItemSearch && (inventoryData?.items ?? []).length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-white shadow-lg max-h-48 overflow-y-auto">
                  {(inventoryData?.items ?? []).map((inv) => (
                    <button
                      key={inv.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center justify-between"
                      onMouseDown={() => addItem(inv)}
                    >
                      <span>
                        <span className="font-medium">{inv.name}</span>
                        {inv.sku && <span className="text-gray-400 text-xs ml-2">#{inv.sku}</span>}
                      </span>
                      <span className="font-mono text-xs text-gray-500">
                        {formatCurrency(inv.posPrice ?? inv.unitCost ?? 0, currency)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Line items table */}
            {items.length > 0 && (
              <div className="space-y-2">
                {items.map((line) => (
                  <div key={line.inventoryItemId} className="flex items-center gap-2 rounded-lg border border-border bg-surface-inset px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{line.inventoryItemName}</div>
                      {line.sku && <div className="text-xs text-gray-400">#{line.sku}</div>}
                    </div>
                    <Input
                      type="number"
                      min="1"
                      className="w-16 h-8 text-sm text-center"
                      value={line.quantity}
                      onChange={(e) => updateItem(line.inventoryItemId, { quantity: Math.max(1, Number(e.target.value)) })}
                    />
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-24 h-8 text-sm text-right font-mono"
                      value={line.unitPrice}
                      onChange={(e) => updateItem(line.inventoryItemId, { unitPrice: Number(e.target.value) })}
                    />
                    <span className="text-sm font-mono w-20 text-right tabular-nums">
                      {formatCurrency(lineTotal(line), currency)}
                    </span>
                    <button type="button" onClick={() => removeItem(line.inventoryItemId)} className="p-1 text-gray-300 hover:text-red-500 rounded">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <div className="flex justify-end pt-1">
                  <div className="text-sm font-semibold tabular-nums font-mono">
                    Total: {formatCurrency(grandTotal, currency)}
                  </div>
                </div>
              </div>
            )}
            {items.length === 0 && (
              <p className="text-sm text-center text-muted-foreground py-4">Search and add products above.</p>
            )}
          </div>

          {/* ── Agents ─────────────────────────────────────────────── */}
          <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Agents</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="salesAgentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sales agent *</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={(v) => {
                          field.onChange(v);
                          const m = members.find((m) => m.userId === v);
                          form.setValue('salesAgentName', m?.displayName || m?.email || v);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Who took this order?" />
                        </SelectTrigger>
                        <SelectContent>
                          {members.map((m) => (
                            <SelectItem key={m.userId} value={m.userId}>
                              {m.displayName || m.email || m.userId}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Delivery agent</div>
                <DeliveryAgentPicker value={deliveryAgent} onChange={setDeliveryAgent} />
              </div>
            </div>
          </div>

          {/* ── Payment + Schedule + Notes ─────────────────────────── */}
          <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Extra</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment method</FormLabel>
                    <FormControl>
                      <ConfigSelect
                        listKey="order_payment_method"
                        value={field.value ?? ''}
                        onValueChange={field.onChange}
                        placeholder="Select method…"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="scheduledAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scheduled at</FormLabel>
                    <FormControl>
                      <DateTimePicker value={field.value ?? ''} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any additional notes…" rows={2} {...field} value={field.value ?? ''} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={createMut.isPending} style={{ background: 'var(--mod-haraka)' }}>
              {createMut.isPending ? 'Creating…' : 'Create Order'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
