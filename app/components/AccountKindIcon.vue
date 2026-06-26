<script setup lang="ts">
import type { AccountKind } from '@shared/dto'

/** Maps an account kind to its Material Symbol, per the mockups. */
const props = defineProps<{ kind: AccountKind; filled?: boolean; size?: number }>()

const ICONS: Record<AccountKind, string> = {
  bank: 'account_balance',
  'e-wallet': 'account_balance_wallet',
  cash: 'payments',
  'prepaid-card': 'credit_card',
}
const icon = computed(() => ICONS[props.kind])
</script>

<template>
  <AppIcon :name="icon" :filled="filled" :size="size ?? 24" />
</template>
