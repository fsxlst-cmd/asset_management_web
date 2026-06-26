<script setup lang="ts">
/** Material Symbols icon, matching the design mockups. */
withDefaults(defineProps<{ name: string; filled?: boolean; size?: number }>(), {
  filled: false,
  size: 24,
})
</script>

<template>
  <span
    class="material-symbols-outlined leading-none"
    :style="{
      fontSize: `${size}px`,
      fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' ${size}`,
    }"
  >{{ name }}</span>
</template>
