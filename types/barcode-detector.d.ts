// Type declarations for the Barcode Detection API, which is not yet part of
// the standard TypeScript DOM lib. Supported on Chromium (Android/desktop);
// feature-detected at runtime with a graceful fallback elsewhere.
// https://developer.mozilla.org/en-US/docs/Web/API/Barcode_Detection_API

interface DetectedBarcode {
  boundingBox: DOMRectReadOnly;
  rawValue: string;
  format: string;
  cornerPoints: ReadonlyArray<{ x: number; y: number }>;
}

interface BarcodeDetectorOptions {
  formats?: string[];
}

declare class BarcodeDetector {
  constructor(options?: BarcodeDetectorOptions);
  static getSupportedFormats(): Promise<string[]>;
  detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>;
}

interface Window {
  BarcodeDetector?: typeof BarcodeDetector;
}
