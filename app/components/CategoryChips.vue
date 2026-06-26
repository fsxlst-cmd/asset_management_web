<script setup lang="ts">
/**
 * Quick-pick category selector: a horizontal row of tappable chips so logging is
 * amount → tap a category → save. The selected chip is highlighted. When the list
 * is empty it nudges the user to create one (category is required).
 */
defineProps<{
  label: string
  modelValue: string
  options: { value: string; label: string }[]
  manageTo?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div class="flex flex-col gap-stack-sm">
    <label class="font-label-caps text-label-caps text-on-surface-variant ml-1">{{ label }}</label>

    <NuxtLink
      v-if="!options.length"
      :to="manageTo ?? '/categories'"
      class="flex items-center gap-3 p-4 rounded-xl border border-primary/30 bg-primary/5 text-primary"
    >
      <AppIcon name="sell" />
      <span class="font-body-sm">No categories yet — create one first, then tag your records.</span>
    </NuxtLink>

    <div v-else class="flex flex-wrap gap-2">
      <button
        v-for="opt in options"
        :key="opt.value"
        type="button"
        class="px-4 py-2 rounded-full font-label-caps text-label-caps border active:scale-95 transition-transform"
        :class="
          modelValue === opt.value
            ? 'bg-primary text-on-primary border-primary'
            : 'bg-surface-container-lowest text-on-surface border-outline-variant'
        "
        @click="emit('update:modelValue', opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>
  </div>
</template>
