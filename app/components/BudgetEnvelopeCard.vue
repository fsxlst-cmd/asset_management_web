<script setup lang="ts">
import type { EnvelopeDto } from '@shared/dto'

/** The "Daily Spending" card: running balance, accrual caption, progress. */
const props = defineProps<{ envelope: EnvelopeDto }>()
const { format } = useMoneyFormat()

const periodLabel = computed(() => {
  const p = props.envelope.accrual?.period
  return p === 'day' ? '/day' : p === 'week' ? '/week' : p === 'month' ? '/month' : ''
})
const accrualText = computed(() =>
  props.envelope.accrual ? `+${format(props.envelope.accrual.amount)}${periodLabel.value}` : '',
)
// Progress shows how much of one accrual period's allowance remains.
const periodAmount = computed(() => props.envelope.accrual?.amount ?? 0)
const negative = computed(() => props.envelope.balance < 0)
</script>

<template>
  <AppCard>
    <div class="flex justify-between items-start mb-stack-md">
      <div class="flex flex-col">
        <h3 class="font-headline-md text-headline-md">{{ envelope.name }}</h3>
        <p class="font-body-sm text-body-sm" :class="negative ? 'text-tertiary' : 'text-on-surface-variant'">
          <MoneyText :amount="envelope.balance" :color-by-sign="negative" /> left
        </p>
      </div>
      <span v-if="accrualText" class="font-label-caps text-label-caps text-secondary">{{ accrualText }}</span>
    </div>
    <ProgressBar :value="envelope.balance" :max="periodAmount" :negative="negative" />
  </AppCard>
</template>
