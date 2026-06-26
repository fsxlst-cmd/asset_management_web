<script setup lang="ts">
import type { CrossCheckDto } from '@shared/dto'

/** The reconciliation insight card — framed as insight, not error (reconciliation spec). */
const props = defineProps<{ result: CrossCheckDto }>()
const emit = defineEmits<{ addAsExpense: []; keepAsIs: [] }>()
const { format } = useMoneyFormat()

const dropText = computed(() => {
  const c = props.result.netWorthChange
  return c < 0 ? `dropped ${format(-c)}` : c > 0 ? `rose ${format(c)}` : 'held steady'
})
const headline = computed(() => {
  switch (props.result.status) {
    case 'complete':
      return 'All tracked — your logging matches reality.'
    case 'untracked-spending':
      return `about ${format(props.result.untracked)} untracked this period.`
    case 'unexplained-income':
      return `about ${format(-props.result.untracked)} of unexplained income.`
  }
  return ''
})
const showActions = computed(() => props.result.status === 'untracked-spending')
</script>

<template>
  <div class="p-stack-md rounded-xl bg-primary-container text-on-primary-container border border-primary/20">
    <div class="flex items-start gap-4">
      <div class="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
        <AppIcon name="lightbulb" class="text-white" />
      </div>
      <div>
        <h4 class="font-headline-md text-headline-md mb-2">Check-in complete</h4>
        <p class="font-body-lg mb-4 leading-relaxed">
          Your net worth {{ dropText }}. You logged {{ format(result.loggedExpense) }} of spending — {{ headline }}
        </p>
        <div v-if="showActions" class="flex gap-3">
          <button
            class="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg font-label-caps text-label-caps transition-colors"
            @click="emit('addAsExpense')"
          >
            ADD AS EXPENSE
          </button>
          <button
            class="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg font-label-caps text-label-caps transition-colors"
            @click="emit('keepAsIs')"
          >
            KEEP AS IS
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
