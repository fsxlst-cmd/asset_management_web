/**
 * Currency formatting shared by client and server. Amounts are integer rupiah
 * (minor units) everywhere; this is the single place that turns them into the
 * `Rp 1.250.000` form the design uses (dot thousand separators, no decimals).
 */
export function formatRupiah(
  amount: number,
  opts: { signed?: boolean; withPrefix?: boolean } = {},
): string {
  const { signed = false, withPrefix = true } = opts
  const abs = Math.abs(amount)
  const grouped = new Intl.NumberFormat('id-ID').format(abs)
  const sign = amount < 0 ? '-' : signed ? '+' : ''
  const prefix = withPrefix ? 'Rp ' : ''
  return `${sign}${prefix}${grouped}`
}
