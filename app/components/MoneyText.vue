<script setup lang="ts">
/**
 * Renders an integer-rupiah amount with tabular numerals and the design's colour
 * semantics: green (secondary) for positive, red (tertiary) for negative when
 * `colorBySign` is on. The `Rp` prefix is rendered slightly lighter, per DESIGN.md.
 */
const props = withDefaults(
  defineProps<{
    amount: number
    signed?: boolean
    colorBySign?: boolean
  }>(),
  { signed: false, colorBySign: false },
)

const { format, formatSigned } = useMoneyFormat()

const text = computed(() => (props.signed ? formatSigned(props.amount) : format(props.amount)))
const colorClass = computed(() => {
  if (!props.colorBySign) return ''
  if (props.amount < 0) return 'text-tertiary'
  if (props.amount > 0) return 'text-secondary'
  return ''
})
</script>

<template>
  <span class="tnum" :class="colorClass">{{ text }}</span>
</template>
