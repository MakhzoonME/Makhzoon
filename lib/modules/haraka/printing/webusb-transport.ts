'use client';

/**
 * WebUSB transport for thermal printers. The browser asks the user to pair
 * a device once; we remember the device descriptor in localStorage so future
 * sessions reconnect silently. Works with any ESC/POS-speaking USB printer.
 *
 * Network printers (Ethernet) are NOT supported in v1: browsers can't open
 * raw TCP sockets. The print-bridge approach (a tiny local daemon) is
 * intentionally left out of scope.
 */

const STORAGE_KEY = 'makhzoon:posPrinter';

interface SavedDevice {
  vendorId: number;
  productId: number;
  paperWidth: 58 | 80;
  copies: number;
}

interface USBDeviceShape {
  vendorId: number;
  productId: number;
  productName?: string;
  manufacturerName?: string;
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  transferOut(endpointNumber: number, data: BufferSource): Promise<{ status: string; bytesWritten: number }>;
  configuration?: { configurationValue: number; interfaces: Array<{ interfaceNumber: number; alternates: Array<{ endpoints: Array<{ endpointNumber: number; direction: string }> }> }> };
  opened: boolean;
}

declare global {
  interface Navigator {
    usb?: {
      requestDevice(options: { filters: Array<{ vendorId?: number; productId?: number; classCode?: number }> }): Promise<USBDeviceShape>;
      getDevices(): Promise<USBDeviceShape[]>;
    };
  }
}

export function isWebUsbSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.usb;
}

export function readSavedPrinter(): SavedDevice | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedDevice) : null;
  } catch {
    return null;
  }
}

export function savePrinter(d: SavedDevice) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
}

export function clearSavedPrinter() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Prompt the user to pair a printer. Use class code 7 (printer) as a filter
 * so the device picker shows only printers.
 */
export async function pairPrinter(paperWidth: 58 | 80 = 80, copies = 1): Promise<SavedDevice> {
  if (!navigator.usb) throw new Error('WebUSB not supported in this browser');
  const device = await navigator.usb.requestDevice({ filters: [{ classCode: 7 }] });
  const saved: SavedDevice = {
    vendorId: device.vendorId,
    productId: device.productId,
    paperWidth,
    copies,
  };
  savePrinter(saved);
  return saved;
}

/**
 * Find the paired device (if connected) and send the byte stream.
 * Returns false silently if no printer is paired — callers should fall back
 * to a PDF or on-screen receipt preview in that case.
 */
export async function printRaw(bytes: Uint8Array): Promise<boolean> {
  if (!navigator.usb) return false;
  const saved = readSavedPrinter();
  if (!saved) return false;
  const devices = await navigator.usb.getDevices();
  const device = devices.find((d) => d.vendorId === saved.vendorId && d.productId === saved.productId);
  if (!device) return false;

  if (!device.opened) await device.open();
  if (!device.configuration) await device.selectConfiguration(1);
  const iface = device.configuration?.interfaces[0];
  if (!iface) throw new Error('No printer interface found');
  await device.claimInterface(iface.interfaceNumber);
  const outEndpoint = iface.alternates[0].endpoints.find((e) => e.direction === 'out');
  if (!outEndpoint) throw new Error('No outbound endpoint found');
  const copies = Math.max(1, saved.copies ?? 1);
  // Copy into a fresh ArrayBuffer so the type is BufferSource-compatible (avoids
  // the SharedArrayBuffer union issue in some TS DOM lib versions).
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  for (let i = 0; i < copies; i++) {
    await device.transferOut(outEndpoint.endpointNumber, buffer);
  }
  return true;
}
