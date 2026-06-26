<script setup lang="ts">
import type { CategoryKind } from '@shared/dto'

const api = useApi()

const kind = ref<CategoryKind>('expense')
const kindOptions = [
  { value: 'expense', label: 'EXPENSE' },
  { value: 'income', label: 'INCOME' },
]
const showArchived = ref(false)

// Always fetch the full list (including archived) and split client-side, so the
// "Show archived" toggle is purely a display switch with no extra request. Only a
// kind change needs a refetch.
const { data, refresh, pending } = await useAsyncData(
  'categories',
  () => api.categories(kind.value, true),
  { watch: [kind] },
)

const active = computed(() => (data.value ?? []).filter((c) => !c.archived))
const archived = computed(() => (data.value ?? []).filter((c) => c.archived))

// Create
const newName = ref('')
const saving = ref(false)
async function create() {
  if (!newName.value.trim()) return
  saving.value = true
  try {
    await api.createCategory({ name: newName.value.trim(), kind: kind.value })
    newName.value = ''
    await refresh()
  } finally {
    saving.value = false
  }
}

// Inline rename
const editingId = ref('')
const editName = ref('')
function startEdit(id: string, name: string) {
  editingId.value = id
  editName.value = name
}
async function saveEdit() {
  if (editingId.value && editName.value.trim()) {
    await api.renameCategory(editingId.value, editName.value.trim())
  }
  editingId.value = ''
  await refresh()
}

async function archive(id: string) {
  await api.archiveCategory(id)
  await refresh()
}
async function restore(id: string) {
  await api.restoreCategory(id)
  await refresh()
}
</script>

<template>
  <div>
    <TopAppBar title="Categories" :back="true" />
    <main class="px-container-padding-mobile mt-stack-lg space-y-stack-lg">
      <header>
        <h1 class="font-headline-lg text-headline-lg mb-1">Categories</h1>
        <p class="text-on-surface-variant font-body-lg">Separate label lists for income and expense.</p>
      </header>

      <SegmentedToggle v-model="kind" :options="kindOptions" />

      <!-- Create -->
      <AppCard class="space-y-stack-md">
        <LabeledInput v-model="newName" :label="`NEW ${kind.toUpperCase()} CATEGORY`" placeholder="e.g. Dining" icon="sell" />
        <button
          class="w-full bg-primary text-on-primary py-4 rounded-xl font-headline-md disabled:opacity-50"
          :disabled="saving || !newName.trim()"
          @click="create"
        >
          {{ saving ? 'Creating…' : 'Add category' }}
        </button>
      </AppCard>

      <!-- Active list -->
      <section class="space-y-stack-md">
        <AppCard v-if="!active.length && !pending" class="text-center space-y-2 py-8">
          <AppIcon name="sell" :size="40" class="text-on-surface-variant/50" />
          <p class="font-headline-md text-headline-md">No {{ kind }} categories yet</p>
          <p class="text-on-surface-variant font-body-sm">Add one above to start tagging records.</p>
        </AppCard>

        <div
          v-for="c in active"
          :key="c.id"
          class="flex items-center justify-between p-stack-md bg-surface-container-lowest rounded-xl border border-outline-variant gap-3"
        >
          <template v-if="editingId === c.id">
            <input
              v-model="editName"
              class="flex-1 bg-transparent border-b border-primary py-1 text-body-lg text-on-surface focus:outline-none"
              @keyup.enter="saveEdit"
            />
            <button class="text-primary font-label-caps text-label-caps" @click="saveEdit">SAVE</button>
          </template>
          <template v-else>
            <span class="font-body-lg text-on-surface">{{ c.name }}</span>
            <div class="flex items-center gap-3 shrink-0">
              <button class="text-on-surface-variant" aria-label="Rename" @click="startEdit(c.id, c.name)">
                <AppIcon name="edit" :size="20" />
              </button>
              <button class="text-tertiary" aria-label="Archive" @click="archive(c.id)">
                <AppIcon name="archive" :size="20" />
              </button>
            </div>
          </template>
        </div>
      </section>

      <!-- Archived -->
      <section class="space-y-stack-md">
        <label class="flex items-center gap-2 font-body-sm text-on-surface-variant ml-1">
          <input v-model="showArchived" type="checkbox" class="rounded" />
          Show archived
        </label>

        <template v-if="showArchived">
          <p v-if="!archived.length" class="font-body-sm text-on-surface-variant/60 ml-1">No archived categories.</p>
          <div
            v-for="c in archived"
            :key="c.id"
            class="flex items-center justify-between p-stack-md bg-surface-container rounded-xl border border-outline-variant gap-3"
          >
            <span class="font-body-lg text-on-surface-variant line-through">{{ c.name }}</span>
            <button class="text-primary font-label-caps text-label-caps shrink-0" @click="restore(c.id)">RESTORE</button>
          </div>
        </template>
      </section>
    </main>
    <FloatingActionButton />
  </div>
</template>
