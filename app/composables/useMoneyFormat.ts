import { formatRupiah } from '@shared/money'

/**
 * Formatting helpers for the UI. Wraps the shared formatter so client and server
 * render money identically (`Rp 1.250.000`).
 */
export function useMoneyFormat() {
  return {
    /** `Rp 1.250.000` (negative shown as `-Rp …`). */
    format: (amount: number) => formatRupiah(amount),
    /** Always shows a sign: `+Rp …` / `-Rp …`. Used for transaction amounts. */
    formatSigned: (amount: number) => formatRupiah(amount, { signed: true }),
    /** Grouped digits only, no `Rp` prefix — for inline inputs. */
    formatPlain: (amount: number) => formatRupiah(amount, { withPrefix: false }),
  }
}
