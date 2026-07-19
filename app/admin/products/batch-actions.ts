// Extensible registry for the Products page's batch-selection toolbar. Adding a new batch
// action later means appending one entry here — the toolbar (products-client.tsx) renders
// whatever is in this array and dispatches by `kind`, never needs its own redesign.
export type BatchActionKind = 'occasion-picker' | 'category-picker' | 'confirm' | 'immediate'

export type BatchAction = {
  id: string
  label: string
  variant?: 'default' | 'danger'
  kind: BatchActionKind
  confirmText?: { title: string; body: string } // required when kind === 'confirm'
}

export const BATCH_ACTIONS: BatchAction[] = [
  { id: 'assign-occasion', label: 'Assign to Occasion', kind: 'occasion-picker' },
  { id: 'change-category', label: 'Change Category', kind: 'category-picker' },
  { id: 'set-active', label: 'Mark Active', kind: 'immediate' },
  { id: 'set-inactive', label: 'Mark Inactive', kind: 'immediate' },
  {
    id: 'reset-default',
    label: 'Reset to Default',
    kind: 'confirm',
    confirmText: { title: 'Reset selected products?', body: 'Removes occasion and offer associations for the selected products. Name, price, images, and category are unaffected.' },
  },
  {
    id: 'delete',
    label: 'Delete',
    variant: 'danger',
    kind: 'confirm',
    confirmText: { title: 'Delete selected products?', body: 'Deleted products are hidden from your storefront and admin list immediately. This can be undone by contacting support.' },
  },
]
