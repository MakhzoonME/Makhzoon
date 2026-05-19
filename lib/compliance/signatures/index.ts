/**
 * Digital signature provider interface for countries that require signed
 * payloads (ZATCA Phase 2, PEPPOL Sender, etc). Inert until a concrete
 * provider is wired in — adapters that need it should declare
 * `capabilities.requiresSignature = true` so the future activation check
 * knows to look for one.
 *
 * Never implement real signing on the client — see /SECURITY.md.
 */

export interface SignatureProvider {
  /** ASCII or DER-encoded signature over the input bytes. */
  sign(payload: string): {
    algorithm: string
    signature: string
    certificateRef: string | null
  }
}
