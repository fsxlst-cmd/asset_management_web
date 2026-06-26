<script setup lang="ts">
/**
 * Large centred amount entry (the add-transaction hero). Emits an integer-rupiah
 * number via v-model. Non-digits are stripped so only whole rupiah are entered.
 */
const props = defineProps<{ modelValue: number }>()
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

const { formatPlain } = useMoneyFormat()

const display = computed(() => (props.modelValue > 0 ? formatPlain(props.modelValue) : ''))

function onInput(e: Event) {
  const raw = (e.target as HTMLInputElement).value.replace(/\D/g, '')
  emit('update:modelValue', raw ? Number.parseInt(raw, 10) : 0)
}
</script>

<template>
  <div class="flex flex-col items-center justify-center py-stack-lg">
    <span class="font-label-caps text-label-caps text-on-surface-variant mb-2">AMOUNT</span>
    <div class="flex items-baseline gap-1">
      <span class="font-display-currency-mobile text-display-currency-mobile text-on-surface-variant">Rp</span>
      <input
        :value="display"
        inputmode="numeric"
        placeholder="0"
        class="w-48 bg-transparent border-none text-center font-display-currency-mobile text-display-currency-mobile text-on-surface tnum focus:ring-0 placeholder-on-surface-variant/30 p-0"
        @input="onInput"
      />
    </div>
  </div>
</template>
