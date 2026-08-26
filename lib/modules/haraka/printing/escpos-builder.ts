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

/**
 * Dot rows the last printed line must travel to clear the cutter blade.
 * Head-to-blade is ~15–25 mm depending on model; 200 dots ≈ 25 mm at 203 dpi
 * covers the range. Overshooting only adds blank tail to the receipt being
 * cut — undershooting silently eats the footer, so err long.
 */
const BLADE_CLEARANCE_DOTS = 200

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

  /**
   * Print and feed an exact number of dot rows (ESC J n).
   *
   * Preferred over `feed()` for anything that has to travel a known physical
   * distance: LF advances by whatever line spacing is currently set, which is
   * not something we control after a raster bit-image. ESC J is in dots, so
   * 203 dots ≈ 1 inch regardless of printer state. Split across several
   * commands because n is a single byte.
   */
  feedDots(dots: number) {
    let left = Math.max(0, Math.round(dots))
    while (left > 0) {
      const n = Math.min(255, left)
      this.push([ESC, 0x4a, n])
      left -= n
    }
    return this
  }

  /** Solid divider line of `width` chars. */
  divider(char = '-', width = 32) {
    return this.line(char.repeat(width))
  }

  /**
   * Print a 1-bit raster bitmap (`true` = black dot) as a single GS v 0
   * bit-image command. Fine for small images (QR codes), but many thermal
   * printers cap how much data a single GS v 0 command can hold in its print
   * buffer — a full receipt rendered as one tall image can exceed that and
   * get silently truncated or spill into the next job. Use
   * `rasterImageChunked` for anything that could be tall (a whole receipt).
   */
  rasterImage(matrix: boolean[][]) {
    if (matrix.length === 0 || matrix[0].length === 0) return this
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
      const row = matrix[y]
      for (let bx = 0; bx < widthBytes; bx++) {
        let byte = 0
        for (let bit = 0; bit < 8; bit++) {
          const x = bx * 8 + bit
          if (x >= cols) continue
          if (row[x]) byte |= 1 << (7 - bit)
        }
        data.push(byte)
      }
    }
    return this.push([...header, ...data])
  }

  /**
   * Same as `rasterImage`, but splits tall images into multiple GS v 0
   * commands of at most `maxRows` rows each, sent back to back with no feed
   * in between — visually one continuous image, but each command stays
   * small enough to fit typical printer raster buffers. Use this for a
   * whole rendered receipt; use plain `rasterImage`/`qrRaster` for small
   * one-off images like a QR code.
   */
  rasterImageChunked(matrix: boolean[][], maxRows = 200) {
    for (let start = 0; start < matrix.length; start += maxRows) {
      this.rasterImage(matrix.slice(start, start + maxRows))
    }
    return this
  }

  /** Print a QR image as raw GS v 0 raster bit-image. */
  qrRaster(matrix: boolean[][]) {
    return this.rasterImage(matrix)
  }

  /**
   * Feed the paper clear of the cutter, then full-cut (GS V 0).
   *
   * BLADE_CLEARANCE_DOTS is not a preference — the blade sits a fixed distance
   * past the print head, and the last printed row has to physically travel that
   * far before the cut or it stays inside the printer. That is what "the footer
   * is missing" looks like: the cut lands above the footer, and the orphaned
   * strip is then ejected as the leading blank of the *next* receipt.
   *
   * So the clearance is always applied and `extraLines` can only add to it.
   * Previously this was fully caller-controlled, which let an org-wide
   * `cutFeed` of 2 (≈ 8 mm) sit below the physical minimum and lose the footer.
   */
  cut(extraLines = 0) {
    this.feedDots(BLADE_CLEARANCE_DOTS)
    if (extraLines > 0) this.feed(extraLines)
    return this.push([GS, 0x56, 0x00])
  }

  /**
   * Kick the cash drawer connected to the printer's RJ11 port.
   * ESC p m t1 t2 — standard ESC/POS cash drawer command.
   *
   * @param port     0 = pin 2 (drawer 1), 1 = pin 5 (drawer 2)
   * @param onTimeMs solenoid fire duration in ms (converted: t1 = onTimeMs / 2, clamped 1–255)
   * @param offTimeMs recovery time in ms (converted: t2 = offTimeMs / 2, clamped 1–255)
   */
  kickDrawer(port: 0 | 1 = 0, onTimeMs = 100, offTimeMs = 100) {
    const m  = port & 0x01
    const t1 = Math.max(1, Math.min(255, Math.round(onTimeMs  / 2)))
    const t2 = Math.max(1, Math.min(255, Math.round(offTimeMs / 2)))
    return this.push([ESC, 0x70, m, t1, t2])
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
