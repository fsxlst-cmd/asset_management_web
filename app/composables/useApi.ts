import type {
  AccountsViewDto,
  AccountDetailDto,
  CategoryDto,
  CategoryKind,
  CrossCheckDto,
  DashboardDto,
  EnvelopeDto,
  EnvelopeDetailDto,
} from '@shared/dto'
import type {
  CreateAccountBody,
  CreateCategoryBody,
  CreateEnvelopeBody,
  LogExpenseBody,
  LogIncomeBody,
  RecordTransferBody,
  ReconciliationBody,
} from '@shared/schemas'

/**
 * Thin typed client over the Nitro API. Centralises endpoint paths and types so
 * pages call `api.dashboard()` etc. rather than hand-writing `$fetch` URLs.
 */
export function useApi() {
  return {
    dashboard: () => $fetch<DashboardDto>('/api/dashboard'),
    accounts: () => $fetch<AccountsViewDto>('/api/accounts'),
    account: (id: string) => $fetch<AccountDetailDto>(`/api/accounts/${id}`),
    createAccount: (body: CreateAccountBody) =>
      $fetch<{ accountId: string; holdingId: string }>('/api/accounts', { method: 'POST', body }),

    budgets: () => $fetch<EnvelopeDto[]>('/api/budgets'),
    budget: (id: string) => $fetch<EnvelopeDetailDto>(`/api/budgets/${id}`),
    createBudget: (body: CreateEnvelopeBody) => $fetch<{ id: string }>('/api/budgets', { method: 'POST', body }),
    deleteBudget: (id: string) => $fetch<{ ok: true }>(`/api/budgets/${id}`, { method: 'DELETE' }),
    editAccrual: (id: string, body: { amount: number; period: 'day' | 'week' | 'month' }) =>
      $fetch(`/api/budgets/${id}/accrual`, { method: 'PATCH', body }),

    categories: (kind: CategoryKind, includeArchived = false) =>
      $fetch<CategoryDto[]>('/api/categories', { query: { kind, includeArchived: String(includeArchived) } }),
    createCategory: (body: CreateCategoryBody) => $fetch<{ id: string }>('/api/categories', { method: 'POST', body }),
    renameCategory: (id: string, name: string) =>
      $fetch<{ ok: true }>(`/api/categories/${id}`, { method: 'PATCH', body: { name } }),
    archiveCategory: (id: string) => $fetch<{ ok: true }>(`/api/categories/${id}`, { method: 'DELETE' }),
    restoreCategory: (id: string) => $fetch<{ ok: true }>(`/api/categories/${id}/restore`, { method: 'POST' }),

    logExpense: (body: LogExpenseBody) => $fetch<{ id: string }>('/api/transactions/expense', { method: 'POST', body }),
    logIncome: (body: LogIncomeBody) => $fetch<{ id: string }>('/api/transactions/income', { method: 'POST', body }),
    transfer: (body: RecordTransferBody) => $fetch<{ id: string }>('/api/transactions/transfer', { method: 'POST', body }),

    reconcile: (body: ReconciliationBody) => $fetch<{ ok: true }>('/api/reconciliation', { method: 'POST', body }),
    crossCheck: (periodStart: string, periodEnd: string) =>
      $fetch<CrossCheckDto>('/api/reconciliation/cross-check', { query: { periodStart, periodEnd } }),
  }
}
