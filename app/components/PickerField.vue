<script setup lang="ts">
/**
 * A labelled selector styled as the design's tappable row (leading icon + chevron).
 * Implemented over a native <select> for accessibility and zero extra dependencies.
 */
defineProps<{
  label: string
  modelValue: string
  options: { value: string; label: string }[]
  icon?: string
  placeholder?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div class="flex flex-col gap-stack-sm">
    <label class="font-label-caps text-label-caps text-on-surface-variant ml-1">{{ label }}</label>
    <div
      class="relative bg-surface-container-lowest border border-outline-variant rounded-xl shadow-card flex items-center gap-stack-md px-4"
    >
      <span
        v-if="icon"
        class="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary shrink-0"
      >
        <AppIcon :name="icon" :size="20" />
      </span>
      <select
        :value="modelValue"
        class="flex-1 appearance-none bg-transparent border-none py-4 pr-8 text-body-lg text-on-surface focus:ring-0 cursor-pointer"
        @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      >
        <option v-if="placeholder" value="">{{ placeholder }}</option>
        <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
      <AppIcon name="expand_more" class="absolute right-4 text-on-surface-variant pointer-events-none" />
    </div>
  </div>
</template>
