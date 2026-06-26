<script setup lang="ts">
const route = useRoute()
const api = useApi()
const id = route.params.id as string
const { data } = await useAsyncData(`account-${id}`, () => api.account(id))

const query = ref('')
const filtered = computed(() => {
  const txs = data.value?.transactions ?? []
  const q = query.value.trim().toLowerCase()
  if (!q) return txs
  return txs.filter((t) => (t.note ?? '').toLowerCase().includes(q) || (t.envelopeName ?? '').toLowerCase().includes(q))
})

const updating = ref(false)
const newBalance = ref(0)
const showUpdate = ref(false)

async function updateBalance() {
  const holdingId = data.value?.account.holdingId
  if (!holdingId) return
  updating.value = true
  try {
    await api.reconcile({ balances: [{ holdingId, value: newBalance.value }] })
    showUpdate.value = false
    await refreshNuxtData(`account-${id}`)
  } finally {
    updating.value = false
  }
}
</script>

<template>
  <div v-if="data">
    <TopAppBar :title="data.account.name" :back="true" />
    <main class="px-container-padding-mobile mt-stack-lg space-y-stack-lg">
      <!-- Hero balance -->
      <AppCard class="relative overflow-hidden">
        <div class="flex items-center gap-2">
          <AccountKindIcon :kind="data.account.kind" :filled="true" class="text-primary" :size="20" />
          <span class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">
            Available Balance
          </span>
        </div>
        <MoneyText
          :amount="data.account.balance"
          class="font-display-currency-mobile text-display-currency-mobile text-on-surface block mt-2"
        />
        <span
          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold mt-4"
          :class="data.account.accuracy === 'live-tracked' ? 'bg-secondary-container/40 text-on-secondary-container' : 'bg-surface-container-high text-on-surface-variant'"
        >
          <span class="w-2 h-2 rounded-full" :class="data.account.accuracy === 'live-tracked' ? 'bg-secondary' : 'bg-outline'" />
          {{ data.account.accuracy === 'live-tracked' ? 'Live-tracked' : 'Updated weekly' }}
        </span>
        <button
          class="mt-6 w-full bg-primary text-on-primary font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98]"
          @click="showUpdate = !showUpdate"
        >
          <AppIcon name="sync" :size="20" /> Update balance
        </button>
        <div v-if="showUpdate" class="mt-4 space-y-3">
          <AmountInput v-model="newBalance" />
          <button
            class="w-full bg-secondary text-on-secondary py-3 rounded-xl font-headline-md disabled:opacity-50"
            :disabled="updating"
            @click="updateBalance"
          >
            {{ updating ? 'Saving…' : 'Save snapshot' }}
          </button>
        </div>
      </AppCard>

      <!-- Income / expense stats (computed from tagged entries) -->
      <section class="grid grid-cols-2 gap-gutter">
        <div class="bg-surface-container-low p-stack-md rounded-xl border border-outline-variant/50">
          <p class="font-label-caps text-label-caps text-on-surface-variant mb-1">INCOME</p>
          <MoneyText :amount="data.income" class="font-headline-md text-headline-md text-secondary" />
        </div>
        <div class="bg-surface-container-low p-stack-md rounded-xl border border-outline-variant/50">
          <p class="font-label-caps text-label-caps text-on-surface-variant mb-1">EXPENSES</p>
          <MoneyText :amount="data.expense" class="font-headline-md text-headline-md text-tertiary" />
        </div>
      </section>

      <!-- Transactions with search -->
      <section class="space-y-stack-md">
        <h3 class="font-headline-md text-headline-md">Transactions</h3>
        <div class="relative">
          <AppIcon name="search" class="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" :size="20" />
          <input
            v-model="query"
            placeholder="Search transactions…"
            class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm"
          />
        </div>
        <div v-if="filtered.length" class="space-y-stack-sm">
          <TransactionRow v-for="t in filtered" :key="t.id" :tx="t" />
        </div>
        <p v-else class="text-on-surface-variant font-body-sm">No transactions tagged to this account.</p>
      </section>
    </main>
  </div>
</template>
