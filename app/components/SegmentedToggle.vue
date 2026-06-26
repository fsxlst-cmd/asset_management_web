<script setup lang="ts">
/** Pill-shaped segmented control with a sliding active surface (Expense/Income/Transfer). */
const props = defineProps<{ modelValue: string; options: { value: string; label: string }[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const activeIndex = computed(() => props.options.findIndex((o) => o.value === props.modelValue))
const widthPct = computed(() => 100 / props.options.length)
</script>

<template>
  <div class="relative w-full bg-surface-container p-1 rounded-full flex items-center h-12 shadow-sm">
    <div
      class="absolute top-1 bottom-1 bg-surface-container-lowest rounded-full shadow-sm transition-transform duration-300"
      :style="{
        width: `calc(${widthPct}% - 4px)`,
        transform: `translateX(calc(${activeIndex * 100}% + ${activeIndex === 0 ? 0 : 4}px))`,
        left: '2px',
      }"
    />
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      class="relative z-10 flex-1 h-full font-label-caps text-label-caps flex items-center justify-center transition-colors"
      :class="opt.value === modelValue ? 'text-primary font-bold' : 'text-on-surface-variant'"
      @click="emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>
