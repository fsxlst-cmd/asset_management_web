<script setup lang="ts">
/**
 * "More" hub: secondary destinations that don't warrant a primary nav slot.
 * Keeps the bottom bar at five items while making Insights, Reconcile, and
 * Categories discoverable from one place.
 */
const links = [
  { to: '/insights', icon: 'bar_chart', title: 'Insights', subtitle: 'Monthly spending by category' },
  { to: '/reconcile', icon: 'fact_check', title: 'Reconcile', subtitle: 'Update balances & cross-check' },
  { to: '/categories', icon: 'sell', title: 'Categories', subtitle: 'Manage income & expense labels' },
]
</script>

<template>
  <div>
    <TopAppBar title="More" />
    <main class="px-container-padding-mobile mt-stack-lg space-y-stack-md pb-28">
      <NuxtLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="block active:scale-[0.99] transition-transform"
      >
        <AppCard class="flex items-center gap-4">
          <div class="w-11 h-11 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container shrink-0">
            <AppIcon :name="link.icon" :size="22" />
          </div>
          <div class="flex-1">
            <p class="font-headline-md text-headline-md">{{ link.title }}</p>
            <p class="text-on-surface-variant font-body-sm">{{ link.subtitle }}</p>
          </div>
          <AppIcon name="chevron_right" class="text-on-surface-variant" />
        </AppCard>
      </NuxtLink>
    </main>
    <BottomNav />
  </div>
</template>
