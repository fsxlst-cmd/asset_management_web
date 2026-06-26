<script setup lang="ts">
/** Thin rounded progress bar. `value`/`max` clamp to [0,100]%. */
const props = withDefaults(defineProps<{ value: number; max: number; negative?: boolean }>(), {
  negative: false,
})
const pct = computed(() => {
  if (props.max <= 0) return 0
  return Math.min(100, Math.max(0, (props.value / props.max) * 100))
})
</script>

<template>
  <div class="w-full h-3 bg-surface-container rounded-full overflow-hidden">
    <div
      class="h-full rounded-full transition-all duration-700"
      :class="negative ? 'bg-tertiary' : 'bg-primary'"
      :style="{ width: `${pct}%` }"
    />
  </div>
</template>
