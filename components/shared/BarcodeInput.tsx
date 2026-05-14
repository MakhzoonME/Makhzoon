'use client';

import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { ScanBarcode } from 'lucide-react';
import { Input } from '@/components/ui/input';

/**
 * Shared barcode input used across Raseed (item form, list quick-jump),
 * Purchases (line entry), and Haraka POS (register scan-to-cart).
 *
 * Most USB/Bluetooth barcode scanners act as HID keyboards: they type the
 * code rapidly and emit Enter. We detect that pattern by measuring
 * inter-keystroke timing — a burst of characters arriving < ~30ms apart
 * followed by Enter is treated as a scan. Manual typing also resolves on
 * Enter or on blur (configurable), so both flows feel identical.
 */

export interface BarcodeInputHandle {
  focus: () => void;
  clear: () => void;
}

export interface BarcodeInputProps {
  /** Called with the trimmed code when the user submits a scan or manual entry. */
  onResolve: (code: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** When true, autofocus on mount (use for scan-heavy contexts like POS register). */
  autoFocus?: boolean;
  /** Clear the input after resolve. Default: true. */
  clearOnResolve?: boolean;
  /** Submit on blur in addition to Enter. Default: false (avoids accidental submits). */
  submitOnBlur?: boolean;
  /** Threshold (ms) between keystrokes to classify the input as a scanner burst. */
  scannerKeyDeltaMs?: number;
  className?: string;
  'aria-label'?: string;
  id?: string;
  name?: string;
  /** Optional uncontrolled initial value (useful in forms). */
  defaultValue?: string;
}

export const BarcodeInput = forwardRef<BarcodeInputHandle, BarcodeInputProps>(
  function BarcodeInput(props, ref) {
    const {
      onResolve,
      placeholder = 'Scan or type a barcode',
      disabled,
      autoFocus,
      clearOnResolve = true,
      submitOnBlur = false,
      scannerKeyDeltaMs = 30,
      className,
      defaultValue = '',
      ...rest
    } = props;

    const [value, setValue] = useState<string>(defaultValue);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const lastKeyAtRef = useRef<number>(0);
    const scannerBurstRef = useRef<boolean>(false);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      clear: () => setValue(''),
    }));

    const submit = useCallback(
      (raw: string) => {
        const code = raw.trim();
        if (!code) return;
        onResolve(code);
        if (clearOnResolve) setValue('');
      },
      [onResolve, clearOnResolve],
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        const now = performance.now();
        if (e.key.length === 1) {
          const delta = now - lastKeyAtRef.current;
          // First keystroke or a fast follow-up = part of a scanner burst.
          if (lastKeyAtRef.current === 0 || delta < scannerKeyDeltaMs) {
            scannerBurstRef.current = true;
          } else {
            scannerBurstRef.current = false;
          }
          lastKeyAtRef.current = now;
        }

        if (e.key === 'Enter') {
          e.preventDefault();
          submit((e.currentTarget as HTMLInputElement).value);
          // Reset for next scan.
          lastKeyAtRef.current = 0;
          scannerBurstRef.current = false;
        }
      },
      [submit, scannerKeyDeltaMs],
    );

    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        if (submitOnBlur) submit(e.currentTarget.value);
      },
      [submit, submitOnBlur],
    );

    return (
      <div className={`relative ${className ?? ''}`}>
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          <ScanBarcode size={16} aria-hidden />
        </span>
        <Input
          ref={inputRef}
          className="pl-8"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={disabled}
          autoFocus={autoFocus}
          inputMode="text"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          {...rest}
        />
      </div>
    );
  },
);
