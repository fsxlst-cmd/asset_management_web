<script setup lang="ts">
const api = useApi()
const { data } = await useAsyncData('accounts', () => api.accounts())

const showCreate = ref(false)
const form = reactive({ name: '', kind: 'bank', institution: '', initialBalance: 0 })
const kindOptions = [
  { value: 'bank', label: 'Bank' },
  { value: 'e-wallet', label: 'E-Wallet' },
  { value: 'cash', label: 'Cash' },
  { value: 'prepaid-card', label: 'Prepaid Card' },
]
const saving = ref(false)

async function create() {
  if (!form.name.trim()) return
  saving.value = true
  try {
    await api.createAccount({
      name: form.name,
      kind: form.kind as 'bank',
      institution: form.institution || undefined,
      initialBalance: form.initialBalance || undefined,
    })
    showCreate.value = false
    Object.assign(form, { name: '', kind: 'bank', institution: '', initialBalance: 0 })
    await refreshNuxtData('accounts')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <TopAppBar title="Accounts" />
    <main class="px-container-padding-mobile mt-stack-lg space-y-stack-lg">
      <div class="flex items-center justify-between">
        <div>
          <p class="font-label-caps text-label-caps text-on-surface-variant uppercase">Financial Summary</p>
          <h2 class="font-headline-lg text-headline-lg text-on-surface">Manage Accounts</h2>
        </div>
        <button
          class="bg-primary text-on-primary rounded-full px-4 py-2 font-label-caps text-label-caps flex items-center gap-1 active:scale-95"
          @click="showCreate = !showCreate"
        >
          <AppIcon name="add" :size="18" /> New
        </button>
      </div>

      <!-- Inline create form -->
      <AppCard v-if="showCreate" class="space-y-stack-md">
        <LabeledInput v-model="form.name" label="ACCOUNT NAME" placeholder="e.g. BCA Utama" />
        <PickerField v-model="form.kind" label="KIND" :options="kindOptions" />
        <LabeledInput v-model="form.institution" label="INSTITUTION (OPTIONAL)" placeholder="e.g. Bank Central Asia" />
        <div class="flex flex-col gap-stack-sm">
          <label class="font-label-caps text-label-caps text-on-surface-variant ml-1">OPENING BALANCE</label>
          <AmountInput v-model="form.initialBalance" />
        </div>
        <button
          class="w-full bg-primary text-on-primary py-4 rounded-xl font-headline-md disabled:opacity-50"
          :disabled="saving || !form.name.trim()"
          @click="create"
        >
          {{ saving ? 'Saving…' : 'Create account' }}
        </button>
      </AppCard>

      <!-- Grouped by kind -->
      <section v-for="group in data?.groups" :key="group.kind" class="space-y-stack-sm">
        <div class="flex items-center justify-between">
          <h3 class="font-label-caps text-label-caps text-on-surface-variant uppercase">{{ group.label }}</h3>
          <MoneyText :amount="group.subtotal" class="text-body-sm font-medium text-primary" />
        </div>
        <AccountCard v-for="a in group.accounts" :key="a.id" :account="a" variant="row" />
      </section>

      <p v-if="!data?.groups.length" class="text-on-surface-variant text-center py-8">
        No accounts yet — create one above.
      </p>
    </main>

    <NetWorthFooterBar v-if="data" :net-worth="data.netWorth" />
  </div>
</template>
