<script setup lang="ts">
const api = useApi()
const router = useRouter()

// Load pickers' data.
const { data: accountsView } = await useAsyncData('add-accounts', () => api.accounts())
const { data: budgets } = await useAsyncData('add-budgets', () => api.budgets())
const { data: expenseCategories } = await useAsyncData('add-expense-categories', () => api.categories('expense'))
const { data: incomeCategories } = await useAsyncData('add-income-categories', () => api.categories('income'))

const accountOptions = computed(() =>
  (accountsView.value?.groups ?? []).flatMap((g) => g.accounts).map((a) => ({ value: a.id, label: a.name })),
)
const budgetOptions = computed(() => (budgets.value ?? []).map((b) => ({ value: b.id, label: b.name })))
const expenseCategoryOptions = computed(() => (expenseCategories.value ?? []).map((c) => ({ value: c.id, label: c.name })))
const incomeCategoryOptions = computed(() => (incomeCategories.value ?? []).map((c) => ({ value: c.id, label: c.name })))

const mode = ref<'expense' | 'income' | 'transfer'>('expense')
const modeOptions = [
  { value: 'expense', label: 'EXPENSE' },
  { value: 'income', label: 'INCOME' },
  { value: 'transfer', label: 'TRANSFER' },
]

const amount = ref(0)
const note = ref('')
const envelopeId = ref('')
const expenseCategoryId = ref('')
const incomeCategoryId = ref('')
const sourceAccountId = ref('')
const destinationAccountId = ref('')
const error = ref('')
const saving = ref(false)

// Smart defaults: the budget envelope pre-fills so expense entry stays one
// deliberate tap (the category). Categories must be chosen explicitly.
watchEffect(() => {
  if (!envelopeId.value && budgetOptions.value.length) envelopeId.value = budgetOptions.value[0]!.value
})

const canSave = computed(() => {
  if (amount.value <= 0) return false
  if (mode.value === 'expense') return !!envelopeId.value && !!expenseCategoryId.value
  if (mode.value === 'income') return !!incomeCategoryId.value
  if (mode.value === 'transfer') {
    return !!sourceAccountId.value && !!destinationAccountId.value && sourceAccountId.value !== destinationAccountId.value
  }
  return true
})

async function save() {
  error.value = ''
  saving.value = true
  try {
    if (mode.value === 'expense') {
      await api.logExpense({
        amount: amount.value,
        envelopeId: envelopeId.value,
        categoryId: expenseCategoryId.value,
        sourceAccountId: sourceAccountId.value || undefined,
        note: note.value || undefined,
      })
    } else if (mode.value === 'income') {
      await api.logIncome({
        amount: amount.value,
        categoryId: incomeCategoryId.value,
        destinationAccountId: destinationAccountId.value || undefined,
        note: note.value || undefined,
      })
    } else {
      await api.transfer({
        amount: amount.value,
        sourceAccountId: sourceAccountId.value,
        destinationAccountId: destinationAccountId.value,
        note: note.value || undefined,
      })
    }
    await router.push('/')
  } catch (e: unknown) {
    error.value = (e as { statusMessage?: string }).statusMessage ?? 'Could not save transaction'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <TopAppBar title="Add Transaction" :back="true" />
    <main class="px-container-padding-mobile py-stack-lg space-y-stack-lg">
      <SegmentedToggle v-model="mode" :options="modeOptions" />

      <AmountInput v-model="amount" />

      <div class="flex flex-col gap-stack-md">
        <!-- Expense: required budget + optional source account -->
        <template v-if="mode === 'expense'">
          <!-- No budgets yet: an expense needs one, so guide the user to create it first. -->
          <NuxtLink
            v-if="!budgetOptions.length"
            to="/budgets"
            class="flex items-center gap-3 p-4 rounded-xl border border-primary/30 bg-primary/5 text-primary"
          >
            <AppIcon name="savings" />
            <span class="font-body-sm">No budgets yet — create a recurring budget first, then log expenses against it.</span>
          </NuxtLink>
          <PickerField v-else v-model="envelopeId" label="BUDGET" :options="budgetOptions" icon="savings" />
          <CategoryChips
            v-if="budgetOptions.length"
            v-model="expenseCategoryId"
            label="CATEGORY"
            :options="expenseCategoryOptions"
          />
          <PickerField
            v-if="budgetOptions.length"
            v-model="sourceAccountId"
            label="PAID FROM ACCOUNT (OPTIONAL)"
            :options="accountOptions"
            icon="account_balance_wallet"
            placeholder="Not specified"
          />
        </template>

        <!-- Income: required category + optional destination -->
        <template v-else-if="mode === 'income'">
          <CategoryChips v-model="incomeCategoryId" label="CATEGORY" :options="incomeCategoryOptions" />
          <PickerField
            v-model="destinationAccountId"
            label="DEPOSITED TO ACCOUNT (OPTIONAL)"
            :options="accountOptions"
            icon="account_balance_wallet"
            placeholder="Not specified"
          />
        </template>

        <!-- Transfer: from + to -->
        <template v-else>
          <PickerField v-model="sourceAccountId" label="FROM ACCOUNT" :options="accountOptions" icon="account_balance" placeholder="Select source" />
          <PickerField v-model="destinationAccountId" label="TO ACCOUNT" :options="accountOptions" icon="account_balance_wallet" placeholder="Select destination" />
        </template>

        <LabeledInput v-model="note" label="NOTE" placeholder="Add note…" icon="edit" />
      </div>

      <p v-if="error" class="text-tertiary font-body-sm text-center">{{ error }}</p>

      <button
        class="w-full bg-primary text-on-primary py-5 rounded-xl font-headline-md flex items-center justify-center gap-stack-md shadow-lg active:scale-95 transition-transform disabled:opacity-50"
        :disabled="!canSave || saving"
        @click="save"
      >
        <span>{{ saving ? 'Saving…' : 'Save Transaction' }}</span>
        <AppIcon name="check" />
      </button>
    </main>
  </div>
</template>
