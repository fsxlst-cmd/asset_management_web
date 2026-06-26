<script setup lang="ts">
/** Label-above-input field, matching the design's input style (12px radius, focus ring). */
defineProps<{
  label: string
  modelValue: string
  type?: string
  placeholder?: string
  icon?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div class="flex flex-col gap-stack-sm">
    <label class="font-label-caps text-label-caps text-on-surface-variant ml-1">{{ label }}</label>
    <div
      class="bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-4 flex items-center gap-stack-sm shadow-card focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all"
    >
      <AppIcon v-if="icon" :name="icon" :size="18" class="text-on-surface-variant shrink-0" />
      <input
        :value="modelValue"
        :type="type ?? 'text'"
        :placeholder="placeholder"
        class="bg-transparent border-none p-0 focus:ring-0 w-full text-body-lg text-on-surface placeholder-on-surface-variant/40"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
    </div>
  </div>
</template>
