<script setup lang="ts">
import type { TransactionDto } from '@shared/dto'

const props = defineProps<{ tx: TransactionDto }>()

const ICON: Record<TransactionDto['type'], string> = {
  expense: 'shopping_cart',
  income: 'payments',
  transfer: 'swap_horiz',
}
// Signed amount for display: expenses are negative, income positive, transfers neutral.
const signedAmount = computed(() => (props.tx.type === 'expense' ? -props.tx.amount : props.tx.amount))
const isIncome = computed(() => props.tx.type === 'income')

const subtitle = computed(() => {
  if (props.tx.type === 'expense') {
    // Category is the classification; the budget envelope is shown alongside when both exist.
    const parts = [props.tx.categoryName, props.tx.envelopeName].filter(Boolean)
    return parts.length ? parts.join(' · ') : 'Expense'
  }
  if (props.tx.type === 'income') return props.tx.categoryName ?? 'Income'
  return 'Transfer'
})
const when = computed(() => new Date(props.tx.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }))
</script>

<template>
  <div class="flex items-center justify-between p-stack-md bg-surface-container-lowest rounded-xl border border-slate-50">
    <div class="flex items-center gap-4">
      <div
        class="w-10 h-10 rounded-full flex items-center justify-center"
        :class="isIncome ? 'bg-secondary-container/20 text-secondary' : 'bg-surface-container text-primary'"
      >
        <AppIcon :name="ICON[tx.type]" :size="20" />
      </div>
      <div>
        <p class="font-body-lg font-semibold text-on-surface">{{ tx.note || subtitle }}</p>
        <p class="font-body-sm text-on-surface-variant">{{ subtitle }}</p>
      </div>
    </div>
    <div class="text-right">
      <MoneyText
        :amount="signedAmount"
        :signed="tx.type !== 'transfer'"
        :color-by-sign="tx.type !== 'transfer'"
        class="font-body-lg block"
      />
      <p class="font-body-sm text-on-surface-variant/50">{{ when }}</p>
    </div>
  </div>
</template>
