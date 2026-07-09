import { describe, it, expect, afterEach, vi } from 'vitest';
import { isCameraScanSupported } from '@/components/haraka/CameraScannerDialog';

/**
 * isCameraScanSupported gates whether the camera button renders. It must be
 * true only when BOTH the Barcode Detection API and getUserMedia exist, so a
 * device missing either falls back to the text input / physical scanner
 * instead of showing a button that can't work.
 */

const originalNavigator = globalThis.navigator;

afterEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(globalThis, 'navigator', {
    value: originalNavigator,
    configurable: true,
  });
});

function setEnv(opts: { detector: boolean; getUserMedia: boolean }) {
  const win = {} as Record<string, unknown>;
  if (opts.detector) win.BarcodeDetector = class {};
  vi.stubGlobal('window', win);
  Object.defineProperty(globalThis, 'navigator', {
    value: { mediaDevices: opts.getUserMedia ? { getUserMedia: () => {} } : {} },
    configurable: true,
  });
}

describe('isCameraScanSupported', () => {
  it('is true when both BarcodeDetector and getUserMedia exist', () => {
    setEnv({ detector: true, getUserMedia: true });
    expect(isCameraScanSupported()).toBe(true);
  });

  it('is false without BarcodeDetector', () => {
    setEnv({ detector: false, getUserMedia: true });
    expect(isCameraScanSupported()).toBe(false);
  });

  it('is false without getUserMedia', () => {
    setEnv({ detector: true, getUserMedia: false });
    expect(isCameraScanSupported()).toBe(false);
  });
});
