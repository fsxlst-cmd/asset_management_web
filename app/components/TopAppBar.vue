<script setup lang="ts">
/** Sticky top bar: optional back button, title, optional settings affordance. */
withDefaults(defineProps<{ title?: string; back?: boolean }>(), { title: 'Finance Hub', back: false })
</script>

<template>
  <header
    class="w-full top-0 sticky z-40 bg-surface flex justify-between items-center px-container-padding-mobile py-stack-md"
  >
    <div class="flex items-center gap-3">
      <button v-if="back" class="text-primary active:opacity-70" aria-label="Back" @click="$router.back()">
        <AppIcon name="arrow_back" />
      </button>
      <div
        v-else
        class="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container"
      >
        <AppIcon name="person" :filled="true" :size="22" />
      </div>
      <h1 class="font-headline-md text-headline-md font-bold text-primary">{{ title }}</h1>
    </div>
    <button class="p-2 hover:bg-surface-variant rounded-full transition-colors text-primary active:opacity-70" aria-label="Settings">
      <AppIcon name="settings" />
    </button>
  </header>
</template>
