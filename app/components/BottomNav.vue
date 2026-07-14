<script setup lang="ts">
/**
 * Glass bottom navigation: Home · Accounts · + · Budgets · More.
 * "More" is a hub for secondary destinations (Insights, Reconcile, Categories), so the
 * primary bar stays at five slots. Active state derives from the current route.
 */
const route = useRoute()

const moreRoutes = ['/more', '/insights', '/reconcile', '/categories']

const items = [
  { to: '/', icon: 'home', label: 'Home', match: (p: string) => p === '/' },
  { to: '/accounts', icon: 'account_balance', label: 'Accounts', match: (p: string) => p.startsWith('/accounts') },
  { to: '/add', icon: 'add_circle', label: 'Add', center: true, match: (p: string) => p === '/add' },
  { to: '/budgets', icon: 'pie_chart', label: 'Budgets', match: (p: string) => p.startsWith('/budgets') },
  { to: '/more', icon: 'menu', label: 'More', match: (p: string) => moreRoutes.some((r) => p.startsWith(r)) },
] as const

const isActive = (item: (typeof items)[number]) => item.match(route.path)
</script>

<template>
  <nav
    class="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-2 glass border-t border-outline-variant rounded-t-xl shadow-lg"
  >
    <NuxtLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="flex flex-col items-center justify-center transition-all active:scale-95 duration-200"
      :class="isActive(item) ? 'text-primary' : 'text-on-surface-variant hover:text-primary'"
    >
      <AppIcon :name="item.icon" :filled="isActive(item)" :size="item.center ? 32 : 24" />
      <span class="font-label-caps text-label-caps mt-1">{{ item.label }}</span>
      <span v-if="isActive(item) && !item.center" class="w-1 h-1 bg-primary rounded-full mt-1" />
    </NuxtLink>
  </nav>
</template>
