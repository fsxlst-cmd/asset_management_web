<script setup lang="ts">
/** The standard rounded surface card from the design: white, soft shadow, 16px-ish radius. */
withDefaults(defineProps<{ padded?: boolean }>(), { padded: true })
</script>

<template>
  <div
    class="bg-surface-container-lowest rounded-xl border border-slate-100 shadow-card"
    :class="padded ? 'p-stack-lg' : ''"
  >
    <slot />
  </div>
</template>
