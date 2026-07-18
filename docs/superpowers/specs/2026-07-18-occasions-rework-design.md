# Occasions rework — design

## Why

Occasion management currently lives buried in Admin → Settings → "Occasions" tab: creation is a bare name+emoji inline row, theme/layout/products are a separate "Configure" step afterward, only Diwali and Pongal exist as platform defaults, and there's no way to hide an occasion from the storefront without deleting it. This rework gives occasions their own admin page, a single create flow, more Tamil Nadu festival defaults, and an on/off switch.

## Scope

1. Move occasion management from the Settings tab to a dedicated `/admin/occasions` page.
2. Add-occasion becomes one modal: name, emoji, theme, layout, and product picker — requires ≥1 product before it can be submitted.
3. Add 7 more platform-default Tamil Nadu festivals (on top of existing Diwali, Pongal).
4. Add an on/off toggle per occasion, reusing the existing draft/published `status` field directly (not the site-wide publish batch).
5. Visual rework to match the reworked Products admin page's card/list + modal patterns.

Out of scope: per-tenant image/logo uploads for occasion banners (still platform-curated gradients, per existing `lib/occasion-themes.ts` note), any change to the site-wide "Publish changes" workflow for products/about/etc.

## Data model

No schema change. Reuses `ProductTag` fields already in place: `isDefault`, `themeKey`, `layout`, `status` (`PublishStatus`), `sortOrder`.

The on/off toggle sets `status` directly to `published`/`draft` for that one occasion, via a new action — distinct from `updateOccasionSettings`, which forces `status: 'draft'` (that one is for the tenant-wide draft/publish review flow triggered by editing theme/layout/products). Turning "on" is rejected (client + server) if the occasion has 0 assigned products.

## New/changed files

- `components/admin/admin-nav-shell.tsx` — add "Occasions" to `NAV` and `MOBILE_NAV` (icon: `PartyPopper`), positioned between Products and Customers.
- `app/admin/occasions/page.tsx` — new server component: `requireOwnerTenant`, `listOccasions`, renders client.
- `app/admin/occasions/occasions-client.tsx` — new client component: search bar, card list (theme swatch, emoji, name, product count, live/off badge, Configure/on-off/delete actions), FAB "+" to open the add modal. Visual pattern matches `app/admin/products/products-client.tsx` (same `Dialog` shell, same button/badge styling).
- `app/admin/occasions/actions.ts` — replaces `app/admin/settings/occasions/actions.ts` (moved). Adds:
  - `createOccasionAction({ name, emoji?, themeKey, layout, productIds })` — creates the occasion and assigns theme/layout/products in one call; rejects if `productIds.length === 0`.
  - `setOccasionStatusAction(occasionId, enabled: boolean)` — sets `status` to `published`/`draft` directly; rejects turning on an occasion with 0 products.
  - Keeps `deleteOccasion`, `setOccasionProducts`, `setOccasionSettings` as-is (used by the edit path).
- `lib/data/occasions.ts` — add `listActiveProductsForPicker(tenantId)` (all active products, no tag filter — used by the create modal, which has no occasion id yet to filter tag assignments against).
- `app/admin/settings/page.tsx` — remove the "Occasions" tab entirely: drop `'Occasions'` from `TABS`, delete `OccasionsTab`, `OccasionSettingsPanel`, `ThemePicker`, `LayoutToggle`, `OccasionRow`, `PickerProduct`, and their imports from `./occasions/actions` and `@/lib/occasion-themes`.
- `lib/occasion-themes.ts` — add 7 new `themeKey` entries (gradient + headline) for the new default festivals.
- `prisma/seed.ts` — upsert 7 new `ProductTag` rows per tenant (`isDefault: true`, `status: 'draft'`, 0 products, idempotent so it backfills existing tenants like `silk`).

## New default occasions

Puthandu (Tamil New Year), Aadi Perukku (Aadi Sale), Navaratri, Karthigai Deepam, Vinayagar Chaturthi, Akshaya Tritiya, Christmas & New Year — chosen as the Tamil Nadu festivals with the strongest online-shopping behavior for a sarees/handicrafts storefront. Each ships with 0 products and `status: draft`; the owner assigns products and flips it on.

## Add/Edit modal

One `OccasionEditor` component (mirrors `ProductEditor`'s add/edit pattern):
- **Add**: empty name/emoji, default theme = first selectable theme, default layout = grid, product picker sourced from `listActiveProductsForPicker`, all unchecked. Submit disabled until ≥1 product is checked.
- **Edit**: prefilled from the occasion + `getOccasionProductPicker(occasionId)` (existing function, unchanged), same validation.
- Submit calls `createOccasionAction` (add) or `setOccasionProducts` + `setOccasionSettings` (edit, as today).

## On/off toggle

A `Toggle` (same look as Settings' existing private `Toggle`, copied locally into `occasions-client.tsx` since it isn't exported) next to each card. Calls `setOccasionStatusAction`. Disabled with a tooltip/message ("Add a product first") when the occasion has 0 products and is currently off.

## Testing

- `app/admin/actions.test.ts` pattern extended (or a sibling `app/admin/occasions/actions.test.ts`) covering: create rejects 0 products, status toggle rejects turning on with 0 products, default occasions can be toggled but not deleted.
