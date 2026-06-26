<script setup lang="ts">
import type { EnvelopeDto } from '@shared/dto'

const props = defineProps<{ envelope: EnvelopeDto }>()
const { format } = useMoneyFormat()
const negative = computed(() => props.envelope.balance < 0)
const accrualText = computed(() => {
  const a = props.envelope.accrual
  if (!a) return 'No accrual'
  const per = a.period === 'day' ? '/day' : a.period === 'week' ? '/week' : '/month'
  return `+${format(a.amount)}${per}`
})
</script>

<template>
  <NuxtLink
    :to="`/budgets/${envelope.id}`"
    class="bg-surface-container-lowest rounded-xl p-4 flex items-center justify-between border border-outline-variant/30 hover:border-primary/50 transition-colors shadow-card active:scale-[0.99]"
  >
    <div class="flex items-center gap-4">
      <div
        class="w-12 h-12 rounded-xl flex items-center justify-center"
        :class="negative ? 'bg-error-container/20 text-tertiary' : 'bg-surface-variant text-on-surface-variant'"
      >
        <AppIcon name="savings" />
      </div>
      <div>
        <h4 class="font-headline-md text-body-lg font-semibold">{{ envelope.name }}</h4>
        <p class="text-on-surface-variant font-body-sm">{{ accrualText }}</p>
      </div>
    </div>
    <div class="text-right">
      <MoneyText :amount="envelope.balance" :color-by-sign="negative" class="font-headline-md text-headline-md block" />
      <p class="text-on-surface-variant font-body-sm">balance</p>
    </div>
  </NuxtLink>
</template>
