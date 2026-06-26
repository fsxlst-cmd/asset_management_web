<script setup lang="ts">
import type { AccountDto } from '@shared/dto'

/**
 * Two layouts: `hero` (the horizontal-scroll card on the dashboard) and `row`
 * (the grouped list item on the Accounts screen).
 */
withDefaults(defineProps<{ account: AccountDto; variant?: 'hero' | 'row' }>(), { variant: 'row' })
</script>

<template>
  <!-- Hero (dashboard horizontal scroll) -->
  <AppCard v-if="variant === 'hero'" class="min-w-[260px] h-40 flex flex-col justify-between">
    <div>
      <div class="flex justify-between items-start">
        <span class="font-label-caps text-label-caps text-on-surface-variant">{{ account.name }}</span>
        <AccountKindIcon :kind="account.kind" class="text-primary" :size="22" />
      </div>
      <MoneyText :amount="account.balance" class="font-headline-md text-headline-md mt-2 block" />
    </div>
    <span class="text-[10px] font-bold text-on-surface-variant/60 uppercase">
      {{ account.accuracy === 'live-tracked' ? 'Live-tracked' : 'Updated weekly' }}
    </span>
  </AppCard>

  <!-- Row (accounts list) -->
  <NuxtLink
    v-else
    :to="`/accounts/${account.id}`"
    class="bg-surface-container-lowest p-4 rounded-xl shadow-card border border-slate-100 flex items-center justify-between transition-all hover:border-primary/20 active:scale-[0.99]"
  >
    <div class="flex items-center gap-4">
      <div class="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
        <AccountKindIcon :kind="account.kind" />
      </div>
      <div>
        <p class="font-body-lg font-bold text-on-surface">{{ account.name }}</p>
        <p class="font-body-sm text-on-surface-variant">{{ account.institution ?? 'No institution' }}</p>
      </div>
    </div>
    <div class="text-right">
      <MoneyText :amount="account.balance" class="font-body-lg font-bold text-on-surface block" />
      <p class="font-label-caps text-[10px] uppercase" :class="account.accuracy === 'live-tracked' ? 'text-secondary' : 'text-on-surface-variant/60'">
        {{ account.accuracy === 'live-tracked' ? 'Live' : 'Weekly' }}
      </p>
    </div>
  </NuxtLink>
</template>
