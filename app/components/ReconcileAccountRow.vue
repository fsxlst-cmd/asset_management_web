<script setup lang="ts">
import type { AccountDto } from '@shared/dto'

/** One account in the weekly reconciliation: app balance vs an editable real balance. */
const props = defineProps<{ account: AccountDto; modelValue: number }>()
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()
const { format, formatPlain } = useMoneyFormat()

const display = computed(() => (props.modelValue > 0 ? formatPlain(props.modelValue) : ''))
function onInput(e: Event) {
  const raw = (e.target as HTMLInputElement).value.replace(/\D/g, '')
  emit('update:modelValue', raw ? Number.parseInt(raw, 10) : 0)
}
</script>

<template>
  <AppCard :padded="false" class="p-stack-md">
    <div class="flex justify-between items-start mb-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
          <AccountKindIcon :kind="account.kind" :size="20" />
        </div>
        <div>
          <p class="font-body-lg font-semibold text-on-surface">{{ account.name }}</p>
          <p class="font-body-sm text-on-surface-variant italic">{{ account.institution ?? account.kind }}</p>
        </div>
      </div>
      <div class="text-right">
        <p class="font-label-caps text-label-caps text-on-surface-variant uppercase">App Balance</p>
        <p class="font-body-lg font-bold text-primary tnum">{{ format(account.balance) }}</p>
      </div>
    </div>
    <div class="space-y-2">
      <label class="font-label-caps text-label-caps text-on-surface-variant">REAL BALANCE</label>
      <div class="relative">
        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-body-sm">Rp</span>
        <input
          :value="display"
          inputmode="numeric"
          placeholder="0"
          class="w-full pl-12 pr-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl font-body-lg text-on-surface tnum focus:border-primary focus:ring-2 focus:ring-primary/20"
          @input="onInput"
        />
      </div>
    </div>
  </AppCard>
</template>
