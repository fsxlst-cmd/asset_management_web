<script setup lang="ts">
/** Floating "+" action button that routes to the add-transaction screen. */
withDefaults(defineProps<{ to?: string }>(), { to: '/add' })
</script>

<template>
  <NuxtLink
    :to="to"
    class="fixed bottom-24 right-6 w-14 h-14 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-all z-50"
    aria-label="Add transaction"
  >
    <AppIcon name="add" :size="30" />
  </NuxtLink>
</template>
