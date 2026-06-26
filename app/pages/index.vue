<script setup lang="ts">
const api = useApi()
const { data, refresh } = await useAsyncData('dashboard', () => api.dashboard())

const lastUpdated = computed(() => {
  const iso = data.value?.lastSnapshotAt
  if (!iso) return 'Not yet reconciled'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  return days <= 0 ? 'Updated today' : `Last updated ${days} day${days === 1 ? '' : 's'} ago`
})

onActivated(refresh)
</script>

<template>
  <div>
    <TopAppBar />
    <main class="px-container-padding-mobile space-y-stack-lg mt-stack-md">
      <!-- Net worth -->
      <section class="flex flex-col space-y-1">
        <h2 class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">
          Total Net Worth
        </h2>
        <MoneyText
          :amount="data?.netWorth ?? 0"
          class="font-display-currency-mobile text-display-currency-mobile text-on-surface"
        />
        <span class="font-body-sm text-body-sm text-on-surface-variant/70 italic">{{ lastUpdated }}</span>
      </section>

      <!-- Account cards (horizontal scroll) -->
      <section v-if="data?.accounts.length" class="-mx-container-padding-mobile">
        <div class="flex overflow-x-auto gap-gutter px-container-padding-mobile pb-2 hide-scrollbar">
          <AccountCard v-for="a in data.accounts" :key="a.id" :account="a" variant="hero" />
        </div>
      </section>
      <AppCard v-else class="text-center text-on-surface-variant">
        No accounts yet. Tap + to add your first one.
      </AppCard>

      <!-- Daily Spending budget -->
      <BudgetEnvelopeCard v-if="data?.primaryEnvelope" :envelope="data.primaryEnvelope" />

      <!-- Recent transactions -->
      <section class="space-y-stack-md">
        <div class="flex justify-between items-center px-1">
          <h3 class="font-headline-md text-headline-md">Recent Transactions</h3>
        </div>
        <div v-if="data?.recentTransactions.length" class="space-y-stack-sm">
          <TransactionRow v-for="t in data.recentTransactions" :key="t.id" :tx="t" />
        </div>
        <p v-else class="text-on-surface-variant font-body-sm px-1">No transactions yet.</p>
      </section>
    </main>
    <FloatingActionButton />
  </div>
</template>
