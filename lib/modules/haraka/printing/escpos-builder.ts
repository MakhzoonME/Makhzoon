/**
 * Tiny ESC/POS byte-stream builder. Covers what a receipt needs — text formatting,
 * alignment, cutting, and (optionally) embedding a QR raster as a bit-image.
 *
 * We deliberately do NOT implement the printer's native GS ( k QR command —
 * raster bit-image works on every model from the cheapest Bluetooth roll
 * printer to a Star TSP100, while native QR commands vary by vendor.
 *
 * Most thermal printers default to CP437; Arabic is not natively supported,
 * so for receipts in Arabic we fall back to image rendering (out of scope
 * for v1 — we keep AR labels short and Latin-friendly here).
 */

const ESC = 0x1b
const GS = 0x1d
const LF = 0x0a

export type Align = 'left' | 'center' | 'right'

export class EscPosBuilder {
  private parts: Uint8Array[] = []

  private push(bytes: number[]) {
    this.parts.push(new Uint8Array(bytes))
    return this
  }

  init() {
    return this.push([ESC, 0x40]) // ESC @
  }

  align(a: Align) {
    const code = a === 'left' ? 0 : a === 'center' ? 1 : 2
    return this.push([ESC, 0x61, code])
  }

  bold(on: boolean) {
    return this.push([ESC, 0x45, on ? 1 : 0])
  }

  /** size = 0 (normal), 1 (2× tall), 16 (2× wide), 17 (2× both). */
  size(value = 0) {
    return this.push([GS, 0x21, value])
  }

  text(s: string) {
    // Best-effort encode — for ASCII / Latin-1 receipts this works; non-Latin
    // characters will print as their CP437 fallback unless the printer is
    // configured otherwise. v1 prints Arabic via rastered logo only.
    const bytes: number[] = []
    for (const ch of s) {
      const code = ch.charCodeAt(0)
      bytes.push(code > 0xff ? 0x3f : code) // ? for unsupported chars
    }
    this.parts.push(new Uint8Array(bytes))
    return this
  }

  line(s = '') {
    return this.text(s).feed()
  }

  feed(n = 1) {
    const bytes: number[] = []
    for (let i = 0; i < n; i++) bytes.push(LF)
    return this.push(bytes)
  }

  /** Solid divider line of `width` chars. */
  divider(char = '-', width = 32) {
    return this.line(char.repeat(width))
  }

  /** Print a QR image as raw GS v 0 raster bit-image. */
  qrRaster(matrix: boolean[][]) {
    if (matrix.length === 0) return this
    const rows = matrix.length
    const cols = matrix[0].length
    const widthBytes = Math.ceil(cols / 8)
    const xL = widthBytes & 0xff
    const xH = (widthBytes >> 8) & 0xff
    const yL = rows & 0xff
    const yH = (rows >> 8) & 0xff
    // GS v 0 m xL xH yL yH d1...dk
    const header = [GS, 0x76, 0x30, 0, xL, xH, yL, yH]
    const data: number[] = []
    for (let y = 0; y < rows; y++) {
      for (let bx = 0; bx < widthBytes; bx++) {
        let byte = 0
        for (let bit = 0; bit < 8; bit++) {
          const x = bx * 8 + bit
          if (x >= cols) continue
          if (matrix[y][x]) byte |= 1 << (7 - bit)
        }
        data.push(byte)
      }
    }
    return this.push([...header, ...data])
  }

  cut() {
    // GS V 0 = full cut
    return this.push([GS, 0x56, 0x00]).feed(2)
  }

  build(): Uint8Array {
    let total = 0
    for (const p of this.parts) total += p.length
    const out = new Uint8Array(total)
    let off = 0
    for (const p of this.parts) {
      out.set(p, off)
      off += p.length
    }
    return out
  }
}
