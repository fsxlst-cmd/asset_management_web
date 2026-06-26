<script setup lang="ts">
import type { CrossCheckDto } from '@shared/dto'

const api = useApi()
const router = useRouter()
const { data: accountsView } = await useAsyncData('reconcile-accounts', () => api.accounts())

const accounts = computed(() => (accountsView.value?.groups ?? []).flatMap((g) => g.accounts))

// Pre-fill each real-balance input with the current app balance.
const real = reactive<Record<string, number>>({})
watchEffect(() => {
  for (const a of accounts.value) if (!(a.id in real)) real[a.id] = a.balance
})

const result = ref<CrossCheckDto | null>(null)
const submitting = ref(false)

// Period: the last 7 days up to now.
const periodEnd = new Date()
const periodStart = new Date(periodEnd.getTime() - 7 * 86_400_000)
const periodLabel = `${periodStart.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} — ${periodEnd.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}`

async function runCheck() {
  submitting.value = true
  try {
    const balances = accounts.value
      .filter((a) => a.holdingId)
      .map((a) => ({ holdingId: a.holdingId as string, value: real[a.id] ?? a.balance }))
    await api.reconcile({ balances })
    result.value = await api.crossCheck(periodStart.toISOString(), periodEnd.toISOString())
    await refreshNuxtData('reconcile-accounts')
  } finally {
    submitting.value = false
  }
}

function addAsExpense() {
  if (!result.value) return
  // Route to add screen so the user logs the untracked gap as an expense.
  router.push('/add')
}
</script>

<template>
  <div>
    <TopAppBar title="Weekly check-in" :back="true" />
    <main class="px-container-padding-mobile py-stack-lg space-y-stack-lg">
      <section>
        <h2 class="font-headline-lg text-headline-lg text-on-surface">Weekly check-in</h2>
        <p class="font-body-sm text-on-surface-variant mt-1">
          Make your digital records match your actual pockets.
        </p>
      </section>

      <div class="rounded-xl bg-surface-container-low px-6 py-4">
        <span class="font-label-caps text-label-caps text-primary uppercase tracking-widest">Snapshot</span>
        <p class="font-headline-md text-headline-md text-on-surface">Period: {{ periodLabel }}</p>
      </div>

      <div class="space-y-stack-md">
        <ReconcileAccountRow v-for="a in accounts" :key="a.id" :account="a" v-model="real[a.id]" />
      </div>

      <button
        class="w-full py-4 bg-primary text-white font-headline-md rounded-xl shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
        :disabled="submitting || !accounts.length"
        @click="runCheck"
      >
        <AppIcon name="analytics" /> {{ submitting ? 'Calculating…' : 'Calculate cross-check' }}
      </button>

      <CrossCheckCard v-if="result" :result="result" @add-as-expense="addAsExpense" @keep-as-is="result = null" />

      <div v-if="result" class="grid grid-cols-2 gap-gutter">
        <AppCard :padded="false" class="p-4">
          <AppIcon name="trending_up" class="text-secondary" />
          <p class="font-label-caps text-label-caps text-on-surface-variant mt-2">LOGGING ACCURACY</p>
          <p class="font-headline-md text-headline-md text-secondary">{{ result.loggingAccuracy }}%</p>
        </AppCard>
        <AppCard :padded="false" class="p-4">
          <AppIcon name="payments" class="text-tertiary" />
          <p class="font-label-caps text-label-caps text-on-surface-variant mt-2">UNTRACKED</p>
          <MoneyText :amount="result.untracked" class="font-headline-md text-headline-md text-tertiary" />
        </AppCard>
      </div>
    </main>
  </div>
</template>
