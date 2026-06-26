<script setup lang="ts">
const api = useApi()
const { data, refresh } = await useAsyncData('budgets', () => api.budgets())

const recurring = computed(() => (data.value ?? []).filter((e) => e.accrual))
const others = computed(() => (data.value ?? []).filter((e) => !e.accrual))

// Create form
const showCreate = ref(false)
const form = reactive({ name: '', amount: 0, period: 'day' as 'day' | 'week' | 'month' })
const periodOptions = [
  { value: 'day', label: 'Per day' },
  { value: 'week', label: 'Per week' },
  { value: 'month', label: 'Per month' },
]
const saving = ref(false)

async function create() {
  if (!form.name.trim() || form.amount <= 0) return
  saving.value = true
  try {
    await api.createBudget({ name: form.name, accrual: { amount: form.amount, period: form.period } })
    Object.assign(form, { name: '', amount: 0, period: 'day' })
    showCreate.value = false
    await refresh()
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <TopAppBar title="Budgets" />
    <main class="px-container-padding-mobile mt-stack-lg space-y-stack-lg">
      <header class="flex items-start justify-between">
        <div>
          <h1 class="font-headline-lg text-headline-lg mb-1">Budget Envelopes</h1>
          <p class="text-on-surface-variant font-body-lg">Recurring budgets you set up and control.</p>
        </div>
        <button
          class="bg-primary text-on-primary rounded-full px-4 py-2 font-label-caps text-label-caps flex items-center gap-1 active:scale-95 shrink-0"
          @click="showCreate = !showCreate"
        >
          <AppIcon name="add" :size="18" /> New
        </button>
      </header>

      <!-- Create form -->
      <AppCard v-if="showCreate" class="space-y-stack-md">
        <LabeledInput v-model="form.name" label="BUDGET NAME" placeholder="e.g. Daily Spending" />
        <div class="flex flex-col gap-stack-sm">
          <label class="font-label-caps text-label-caps text-on-surface-variant ml-1">ACCRUAL AMOUNT</label>
          <AmountInput v-model="form.amount" />
        </div>
        <PickerField v-model="form.period" label="RECURRENCE" :options="periodOptions" icon="event_repeat" />
        <button
          class="w-full bg-primary text-on-primary py-4 rounded-xl font-headline-md disabled:opacity-50"
          :disabled="saving || !form.name.trim() || form.amount <= 0"
          @click="create"
        >
          {{ saving ? 'Creating…' : 'Create recurring budget' }}
        </button>
      </AppCard>

      <!-- Empty state -->
      <AppCard v-if="!data?.length && !showCreate" class="text-center space-y-2 py-8">
        <AppIcon name="savings" :size="40" class="text-on-surface-variant/50" />
        <p class="font-headline-md text-headline-md">No budgets yet</p>
        <p class="text-on-surface-variant font-body-sm">
          Create a recurring budget to start tracking daily spending.
        </p>
      </AppCard>

      <!-- Recurring budgets (tap to edit / delete) -->
      <section v-if="recurring.length" class="space-y-stack-md">
        <NuxtLink v-for="e in recurring" :key="e.id" :to="`/budgets/${e.id}`" class="block active:scale-[0.99] transition-transform">
          <BudgetEnvelopeCard :envelope="e" />
        </NuxtLink>
      </section>

      <!-- Non-accruing envelopes (if any) -->
      <section v-if="others.length" class="space-y-stack-md">
        <h2 class="font-headline-md text-headline-md">Other Envelopes</h2>
        <div class="space-y-4">
          <EnvelopeRow v-for="e in others" :key="e.id" :envelope="e" />
        </div>
      </section>
    </main>
    <FloatingActionButton />
  </div>
</template>
