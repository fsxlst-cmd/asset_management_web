<script setup lang="ts">
/**
 * Spending Insights: for one WIB calendar month, expenses ranked by category with each
 * category's share of the month and its change vs the previous month. Read-only.
 */
const api = useApi()
const { format, formatSigned } = useMoneyFormat()

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000

/** Current month in WIB (UTC+7), as { year, month } with month 1–12. */
function currentWibMonth() {
  const shifted = new Date(Date.now() + WIB_OFFSET_MS)
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1 }
}

const now = currentWibMonth()
const sel = reactive({ year: now.year, month: now.month })

const monthStr = computed(() => `${sel.year}-${String(sel.month).padStart(2, '0')}`)
const monthLabel = computed(() => `${MONTH_NAMES[sel.month - 1]} ${sel.year}`)
const prevLabel = computed(() => {
  const m = sel.month === 1 ? 12 : sel.month - 1
  const y = sel.month === 1 ? sel.year - 1 : sel.year
  return `${MONTH_NAMES[m - 1]} ${y}`
})

// Don't let the user page into the future (no data can exist there yet).
const selIndex = computed(() => sel.year * 12 + sel.month)
const atCurrent = computed(() => selIndex.value >= now.year * 12 + now.month)

function step(delta: number) {
  if (delta > 0 && atCurrent.value) return
  const idx = sel.year * 12 + (sel.month - 1) + delta
  sel.year = Math.floor(idx / 12)
  sel.month = (idx % 12) + 1
}

const { data, pending } = await useAsyncData(
  'spending-report',
  () => api.spendingReport(monthStr.value),
  { watch: [monthStr] },
)

const hasRows = computed(() => (data.value?.rows.length ?? 0) > 0)

/** Per-row delta badge: text, direction (drives colour/arrow). More spend = tertiary (red). */
function delta(row: { deltaKind: string; deltaPercent?: number; deltaAbsolute?: number }) {
  if (row.deltaKind === 'new') return { text: 'NEW', dir: 'new' as const }
  if (row.deltaKind === 'absolute') {
    const v = row.deltaAbsolute ?? 0
    return { text: formatSigned(v), dir: v > 0 ? 'up' : v < 0 ? 'down' : 'flat' }
  }
  const pct = row.deltaPercent ?? 0
  const arrow = pct > 0 ? '▲' : pct < 0 ? '▼' : ''
  return { text: `${arrow} ${Math.abs(Math.round(pct * 100))}%`, dir: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat' }
}

function deltaClass(dir: string) {
  if (dir === 'up') return 'text-tertiary' // spending more
  if (dir === 'down') return 'text-secondary' // spending less
  if (dir === 'new') return 'text-on-surface-variant'
  return 'text-on-surface-variant'
}

const totalDelta = computed(() => {
  const p = data.value?.totalDeltaPercent
  if (p === undefined) return null
  const arrow = p > 0 ? '▲' : p < 0 ? '▼' : ''
  return { text: `${arrow} ${Math.abs(Math.round(p * 100))}%`, dir: p > 0 ? 'up' : p < 0 ? 'down' : 'flat' }
})
</script>

<template>
  <div>
    <TopAppBar title="Insights" />
    <main class="px-container-padding-mobile mt-stack-lg space-y-stack-lg pb-28">
      <header>
        <h1 class="font-headline-lg text-headline-lg mb-1">Spending</h1>
        <p class="text-on-surface-variant font-body-lg">Where your money went, by category.</p>
      </header>

      <!-- Month picker -->
      <div class="flex items-center justify-between">
        <button
          class="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center active:scale-95"
          aria-label="Previous month"
          @click="step(-1)"
        >
          <AppIcon name="chevron_left" />
        </button>
        <span class="font-headline-md text-headline-md">{{ monthLabel }}</span>
        <button
          class="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center active:scale-95 disabled:opacity-30"
          aria-label="Next month"
          :disabled="atCurrent"
          @click="step(1)"
        >
          <AppIcon name="chevron_right" />
        </button>
      </div>

      <!-- Total + delta vs last month -->
      <AppCard class="space-y-1">
        <p class="font-label-caps text-label-caps text-on-surface-variant">TOTAL SPENT</p>
        <div class="flex items-end justify-between">
          <MoneyText :amount="data?.total ?? 0" class="font-headline-lg text-headline-lg" />
          <span v-if="totalDelta" class="font-body-sm" :class="deltaClass(totalDelta.dir)">
            {{ totalDelta.text }} vs {{ prevLabel }}
          </span>
        </div>
      </AppCard>

      <!-- Loading -->
      <p v-if="pending" class="text-on-surface-variant font-body-sm text-center py-8">Loading…</p>

      <!-- Empty state -->
      <AppCard v-else-if="!hasRows" class="text-center space-y-2 py-8">
        <AppIcon name="receipt_long" :size="40" class="text-on-surface-variant/50" />
        <p class="font-headline-md text-headline-md">No spending in {{ monthLabel }}</p>
        <p class="text-on-surface-variant font-body-sm">Log some expenses and they'll show up here, ranked by category.</p>
      </AppCard>

      <!-- Ranked categories -->
      <section v-else class="space-y-stack-md">
        <AppCard v-for="row in data!.rows" :key="row.categoryId" class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-headline-md text-headline-md">{{ row.categoryName }}</span>
            <MoneyText :amount="row.amount" class="font-headline-md text-headline-md" />
          </div>
          <ProgressBar :value="row.share * 100" :max="100" />
          <div class="flex items-center justify-between font-body-sm">
            <span class="text-on-surface-variant">{{ Math.round(row.share * 100) }}% of total</span>
            <span :class="deltaClass(delta(row).dir)">{{ delta(row).text }}</span>
          </div>
        </AppCard>
      </section>

      <!-- Quiet this month -->
      <section v-if="data?.quiet.length" class="space-y-stack-sm">
        <h2 class="font-label-caps text-label-caps text-on-surface-variant ml-1">QUIET THIS MONTH</h2>
        <AppCard class="space-y-2">
          <div v-for="q in data!.quiet" :key="q.categoryId" class="flex items-center justify-between font-body-sm">
            <span class="text-on-surface">{{ q.categoryName }}</span>
            <span class="text-on-surface-variant">was {{ format(q.lastMonth) }} in {{ prevLabel }}</span>
          </div>
        </AppCard>
      </section>
    </main>
    <BottomNav />
  </div>
</template>
