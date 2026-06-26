<script setup lang="ts">
const route = useRoute()
const api = useApi()
const id = route.params.id as string
const { data } = await useAsyncData(`budget-${id}`, () => api.budget(id))

const showEdit = ref(false)
const editAmount = ref(0)
const editPeriod = ref<'day' | 'week' | 'month'>('day')
const saving = ref(false)
const periodOptions = [
  { value: 'day', label: 'Per day' },
  { value: 'week', label: 'Per week' },
  { value: 'month', label: 'Per month' },
]

watchEffect(() => {
  if (data.value?.envelope.accrual) {
    editAmount.value = data.value.envelope.accrual.amount
    editPeriod.value = data.value.envelope.accrual.period
  }
})

async function saveAccrual() {
  saving.value = true
  try {
    await api.editAccrual(id, { amount: editAmount.value, period: editPeriod.value })
    showEdit.value = false
    await refreshNuxtData(`budget-${id}`)
  } finally {
    saving.value = false
  }
}

const deleting = ref(false)
const deleteError = ref('')
async function remove() {
  if (!confirm('Delete this budget? This cannot be undone.')) return
  deleting.value = true
  deleteError.value = ''
  try {
    await api.deleteBudget(id)
    await navigateTo('/budgets')
  } catch (e: unknown) {
    deleteError.value = (e as { statusMessage?: string }).statusMessage ?? 'Could not delete budget'
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div v-if="data">
    <TopAppBar :title="data.envelope.name" :back="true" />
    <main class="px-container-padding-mobile mt-stack-lg space-y-stack-lg">
      <AppCard>
        <span class="font-label-caps text-label-caps text-on-surface-variant uppercase">Running balance</span>
        <MoneyText
          :amount="data.envelope.balance"
          :color-by-sign="data.envelope.balance < 0"
          class="font-display-currency-mobile text-display-currency-mobile block mt-1"
        />
        <button
          class="mt-4 text-primary font-label-caps text-label-caps flex items-center gap-1"
          @click="showEdit = !showEdit"
        >
          <AppIcon name="tune" :size="16" /> Edit accrual
        </button>

        <div v-if="showEdit" class="mt-4 space-y-stack-md">
          <div class="flex flex-col gap-stack-sm">
            <label class="font-label-caps text-label-caps text-on-surface-variant ml-1">ACCRUAL AMOUNT</label>
            <AmountInput v-model="editAmount" />
          </div>
          <PickerField v-model="editPeriod" label="PERIOD" :options="periodOptions" icon="event_repeat" />
          <button
            class="w-full bg-primary text-on-primary py-3 rounded-xl font-headline-md disabled:opacity-50"
            :disabled="saving || editAmount <= 0"
            @click="saveAccrual"
          >
            {{ saving ? 'Saving…' : 'Save accrual (past unchanged)' }}
          </button>
        </div>
      </AppCard>

      <section class="space-y-stack-md">
        <h3 class="font-headline-md text-headline-md">Charged expenses</h3>
        <div v-if="data.transactions.length" class="space-y-stack-sm">
          <TransactionRow v-for="t in data.transactions" :key="t.id" :tx="t" />
        </div>
        <p v-else class="text-on-surface-variant font-body-sm">Nothing charged to this envelope yet.</p>
      </section>

      <!-- Delete -->
      <section class="pt-2">
        <button
          class="w-full border border-tertiary/40 text-tertiary py-3 rounded-xl font-label-caps text-label-caps flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
          :disabled="deleting"
          @click="remove"
        >
          <AppIcon name="delete" :size="18" /> {{ deleting ? 'Deleting…' : 'Delete budget' }}
        </button>
        <p v-if="deleteError" class="text-tertiary font-body-sm text-center mt-2">{{ deleteError }}</p>
      </section>
    </main>
    <FloatingActionButton />
  </div>
</template>
