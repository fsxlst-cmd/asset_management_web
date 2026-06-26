<script setup lang="ts">
/** The indigo sticky net-worth footer on the Accounts screen. */
defineProps<{ netWorth: number }>()
</script>

<template>
  <div class="fixed bottom-[88px] left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-2xl z-40">
    <div class="bg-primary px-6 py-4 rounded-xl shadow-xl flex items-center justify-between">
      <div class="flex flex-col">
        <span class="font-label-caps text-label-caps text-on-primary-container/80 uppercase">Total Net Worth</span>
        <MoneyText :amount="netWorth" class="font-headline-md text-headline-md text-white" />
      </div>
      <div class="bg-white/20 text-white rounded-full p-2">
        <AppIcon name="trending_up" />
      </div>
    </div>
  </div>
</template>
