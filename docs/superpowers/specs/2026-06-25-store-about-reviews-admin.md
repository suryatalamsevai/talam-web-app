# Talam — Store About Page, Product Reviews & Admin Gap Resolution

**Date:** 2026-06-25
**Status:** Awaiting approval
**Author:** Surya Prakash
**Scope:** Three interrelated features + gap resolutions derived from reviewing product, checkout, and admin HTML designs against the v1.1 design doc.

---

## 1. Overview

This spec covers:

1. **Store About Page** — A customer-facing `/about` route per tenant showing owner story, social links, trust stats, and branch locations.
2. **Product Reviews** — 5-star ratings + optional text comments on product pages, with verified purchase badges, report mechanism, and owner moderation.
3. **Product Page Gap Resolution** — Underdefined behaviours identified in the product page mockup.
4. **Checkout Page Gap Resolution** — Underdefined behaviours identified in the checkout mockup.
5. **Admin Pages Gap Resolution** — Gaps from reviewing all 5 admin HTML designs (dashboard, onboarding, orders, products, settings).

---

## 2. Schema Changes

### 2.1 New columns on `tenants`

```sql
-- Identity & contact
tagline text                          -- "Handpicked Indian Fashion for Every Occasion"
                                      --   shown on storefront hero + /about header
contact_phone text                    -- public store phone (separate from whatsapp_number)
contact_email text                    -- public store email; shown on /about only
show_whatsapp_button boolean DEFAULT true
notify_email_on_order boolean DEFAULT true

-- Delivery & trust
free_delivery_above numeric           -- NULL = shipping_fee always applies
shipping_fee numeric DEFAULT 0        -- flat fee when order doesn't qualify
delivery_estimate_text text           -- "5–7 business days"
return_window_days int                -- NULL = no return policy shown
trust_badge_text text                 -- custom line e.g. "100% authentic, handpicked by Meena"
size_guide_url text                   -- Cloudinary URL; NULL = platform fallback chart

-- Lifecycle
deleted_at timestamptz                -- soft delete; NULL = active; hard-delete after 30 days
```

### 2.2 New table: `store_about`

```sql
store_about
  id uuid PK
  tenant_id uuid FK → tenants UNIQUE   -- one row per store
  story_title text                     -- "Our Story", "About D'Mystique"
  description text                     -- long-form markdown / plain text
  owner_photo_url text                 -- Cloudinary URL, nullable
  instagram_url text
  facebook_url text
  youtube_url text
  google_business_url text
  created_at timestamptz
  updated_at timestamptz
```

### 2.3 New table: `store_branches`

```sql
store_branches
  id uuid PK
  tenant_id uuid FK → tenants
  name text                            -- "Main Store", "Anna Nagar Branch"
  address text
  city text
  phone text
  maps_url text                        -- Google Maps link
  sort_order int
  created_at timestamptz
```

### 2.4 New table: `product_reviews`

```sql
product_reviews
  id uuid PK
  tenant_id uuid FK → tenants
  product_id uuid FK → products
  customer_id uuid FK → customers
  rating int NOT NULL                  -- 1–5
  comment text                         -- nullable
  is_verified_purchase boolean         -- set at write time: check order_items
  is_deleted boolean DEFAULT false     -- soft delete by owner
  created_at timestamptz
  ── UNIQUE(tenant_id, product_id, customer_id)
```

### 2.5 New table: `review_reports`

```sql
review_reports
  id uuid PK
  tenant_id uuid FK → tenants
  review_id uuid FK → product_reviews
  reporter_id uuid FK → customers
  reason enum('spam','inappropriate','fake','other')
  created_at timestamptz
  ── UNIQUE(tenant_id, review_id, reporter_id)   -- one report per person per review
```

### 2.6 RLS

All new tables follow the existing `tenant_isolation` pattern:

```sql
CREATE POLICY "tenant_isolation" ON {table}
USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

---

## 3. Feature A: Store About Page

### 3.1 Storefront — `/about`

**Rendering:** ISR, revalidate 3600s. On-demand revalidation triggered when owner saves `/admin/about`.

**Page layout (top to bottom):**
1. **Hero** — owner photo (if set) + story title + tagline (from `tenants.tagline`)
2. **Story** — `store_about.description` rendered as plain text / markdown
3. **Social & contact row** — icon links shown only for non-null fields: Instagram, Facebook, YouTube, Google Business, WhatsApp (`tenants.whatsapp_number`), Contact Phone, Contact Email
4. **Trust stat cards** — auto-computed at render time:

   | Stat | Source |
   |---|---|
   | Member since | `tenants.created_at` formatted as "June 2026" |
   | Products | `COUNT(products) WHERE is_active = true` |
   | Orders fulfilled | `COUNT(orders) WHERE status = 'delivered'` |
   | Categories | `COUNT(product_categories)` |

   Numbers rounded down to nearest milestone: < 10 = exact, 10–99 = round to nearest 10, 100–999 = round to nearest 100, 1000+ = round to nearest 1000. Examples: 523 → "500+", 47 → "40+", 8 → "8".

5. **Branch locations** — cards per `store_branches` row, ordered by `sort_order`. Each card: name, address, city, phone (if set), "Get Directions" link (if `maps_url` set). Hidden section if no branches.

**Data fetching:** 6 queries via `withTenant` — `store_about`, `store_branches`, `tenants` (for tagline/whatsapp/contact fields), plus 3 aggregate COUNT queries (active products, delivered orders, categories).

### 3.2 Admin — `/admin/about`

**Rendering:** SSR dynamic.

**Sections:**
- **Your Story** — story title input, description textarea, owner photo upload (Cloudinary)
- **Social & Business Links** — Instagram URL, Facebook URL, YouTube URL, Google Business URL (all optional)
- **Branches** — list of branch cards with add/edit/delete/reorder. Each branch form: name, address, city, phone, Google Maps URL.

**Server Actions:**
- `upsertStoreAbout(data)` — creates or updates the single `store_about` row; triggers `/api/revalidate` for `/about`
- `createBranch(data)` / `updateBranch(id, data)` / `deleteBranch(id)` / `reorderBranches(ids[])` — CRUD on `store_branches`; each triggers `/api/revalidate` for `/about`

**Access:** `/admin/about` is linked from the Settings hub page.

---

## 4. Feature B: Product Reviews

### 4.1 Storefront — `/product/[slug]` (extended)

**Reviews section** renders below the product description accordion. Data fetched in the same ISR pass plus a dynamic layer for reviews.

**Review aggregate block:**
- Average rating (1 decimal, e.g. ★ 4.3)
- Total count ("128 reviews")
- Distribution bar: 5★ to 1★ counts shown as horizontal bars

**Review cards:**
- Customer first name + last initial ("Priya R.")
- Star display (filled/empty)
- "Verified Purchase" badge if `is_verified_purchase = true`
- Comment text (if present)
- Date (relative: "3 days ago")
- "Report" link — only shown to logged-in users; opens a reason picker sheet

**Write a Review:**
- Button shown only to logged-in customers
- Opens inline form: star picker (required) + optional text box + Submit
- If customer has a delivered order containing this product → `is_verified_purchase = true` set server-side
- If not a buyer → can still review, no badge
- `UNIQUE` constraint prevents duplicate reviews; shows "Edit your review" if one already exists

**Server Actions:**
- `createReview(productId, rating, comment?)` — verifies session, checks `order_items`, inserts review, calls `/api/revalidate` for `/product/[slug]`
- `updateReview(reviewId, rating, comment?)` — owner's own review only
- `reportReview(reviewId, reason)` — inserts `review_reports` row (UNIQUE prevents duplicate)

### 4.2 Admin — `/admin/reviews`

**Rendering:** SSR dynamic. Linked from Settings hub.

**Tabs:** All Reviews | Reported

- **All Reviews** — paginated list of all non-deleted reviews: product name, customer, rating, comment snippet, verified badge, date. Owner can delete (soft-delete: `is_deleted = true` + ISR revalidation).
- **Reported** — reviews with ≥ 1 report. Shows reporter count and reasons. Owner can delete or dismiss (clear reports without deleting the review).

---

## 5. Product Page Gap Resolution

### 5.1 Store name header
- Shown above product title: e.g. "MEENA SILKS"
- Links to `/{subdomain}/about` → `/about`

### 5.2 Image gallery
- Carousel with dot indicators (swipe on mobile)
- Thumbnail strip below (up to 5 thumbnails matching `products.images[]`)
- Share button top-right of image: Web Share API on mobile, copy-link fallback on desktop

### 5.3 Discount display
- "X% OFF" badge on image: `Math.round((1 - price/compare_price) * 100)` — only shown when `compare_price > price`
- "You save ₹X" line below price: `compare_price - price`
- "Inclusive of all taxes" line: **removed** — ICP sellers are below GST threshold; no tax in V1

### 5.4 Out-of-stock sizes
- `stock_by_size[size] === 0` → size button rendered crossed-out + `pointer-events: none`
- Add to Cart blocked until a valid in-stock size is selected
- No schema change — pure UI logic on existing `stock_by_size jsonb`

### 5.5 Size Guide
- "Size Guide" link opens a modal
- Shows `tenants.size_guide_url` image if set
- Platform fallback: 3 static images on Cloudinary — women's, men's, kids' — defaulting to women's for `store_type = ethnic_wear`
- Owner uploads size guide in Settings (new field `size_guide_url`)

### 5.6 Pincode delivery check
- Input on product page: validates via `GET https://api.postalpincode.in/pincode/{pincode}` (free, no auth)
- On valid pincode: shows `tenants.delivery_estimate_text` (e.g. "Delivers in 5–7 business days")
- On checkout: same API auto-fills City + State when pincode is entered
- No real-time courier serviceability in V1

### 5.7 Trust badges
Rendered on product page when non-null:

| Badge | Source |
|---|---|
| "Free delivery above ₹{X}" | `tenants.free_delivery_above` |
| "Easy {X}-day returns" | `tenants.return_window_days` |
| Custom line | `tenants.trust_badge_text` |
| "Secure Pay" | Always shown |

Bottom trust bar: "{X}-day Returns · ✓ 100% Genuine · 🔒 Secure Pay" — return_window_days drives the first item; hidden if null.

### 5.8 Wishlist button
- Heart icon on product page; Starter/Pro tiers only
- Trial tier: shows upgrade prompt instead of functional heart

### 5.9 Product Details accordion
- Expandable section showing `products.description`
- Collapsed by default on mobile

---

## 6. Checkout Page Gap Resolution

### 6.1 Auth at checkout
- Logged-in users: skip OTP step, go directly to address
- Non-logged-in users: phone OTP inline (not redirect to `/auth`); creates/links customer record on verification

### 6.2 Three-step flow
1. **OTP verification** (skipped if already logged in)
2. **Delivery address** — Full Name\*, Phone\*, Address Line 1\*, Address Line 2 (optional), City\*, Pincode\*, State\* (dropdown)
3. **Payment** — gateway-specific UI

Progress indicator shown across all steps. "Secure Checkout" lock icon in simplified header (no main nav during checkout).

### 6.3 Pincode auto-fill
`api.postalpincode.in` called when pincode field blurs → auto-fills City and State.

### 6.4 Order summary panel
- Product thumbnail + name + size (hidden if `sizes[] = []`) + qty per item
- Subtotal
- "Discount (MRP)" line — shown when any cart item has `compare_price > price`; value = `SUM((compare_price - price) × qty)`. Labeled "Discount (MRP)".
- Delivery — "Free" if `order_subtotal >= tenants.free_delivery_above`; else `tenants.shipping_fee` (shown as "₹{X}")
- **Total**

### 6.5 Address storage
`orders.shipping_address jsonb` stores: `{ fullName, phone, line1, line2, city, pincode, state }`.

---

## 7. Admin Pages Gap Resolution

### 7.1 Dashboard

| Item | Spec |
|---|---|
| Visitors stat | PostHog Query API server-side; shows `-` on API failure |
| Notifications bell | New orders since last dashboard visit; clicking opens `/admin/orders` |
| Top Products this week | Aggregate on `order_items`: `SUM(qty)` + `SUM(unit_price × qty)` grouped by `product_id`, last 7 days |
| Revenue/Orders trends | Compare today's total vs yesterday's total; shown as "+X% vs yesterday" |
| Trial banner | Shown on all admin pages during trial; links to `/admin/billing` |
| Bottom nav | 4 items only: Dashboard, Products, Orders, Settings. Settings is a hub linking to: Categories, Customers, Promotions, Payouts, Billing, About, Delivery & Trust |
| Avatar | Links to `/admin/settings` |

### 7.2 Onboarding

| Item | Spec |
|---|---|
| Domain in URL preview | Fix `talam.app` → `mytalam.com` throughout all design files |
| 5-step flow | Store → Brand → Product *(skippable)* → Payment → Go Live |
| Store type labels | Display: Fashion, Food, Beauty, Handmade, Other → map to schema: `ethnic_wear`, `bakery`, `salon`, `handicrafts`, `other` |
| PhonePe | Dropped from V1; UPI + Instamojo + Razorpay only |
| WhatsApp share on Go Live | Pre-composed `wa.me` link with store URL shown on step 5 |
| Live preview in brand step | Product card preview updates in real-time with selected brand color |
| Encryption note | Show "Your API keys are encrypted and stored securely" below payment fields |

### 7.3 Orders

| Item | Spec |
|---|---|
| Status bottom sheet | Options: Confirm order, Mark as Shipped, Mark as Delivered, Mark as Returned, Cancel order |
| Tabs | All, Pending, Confirmed, Shipped, Delivered, Returned, Cancelled |
| Search | Client-side filter on customer name + order ID; appears when search icon tapped |

### 7.4 Products

| Item | Spec |
|---|---|
| Low Stock badge | Total stock across all sizes ≤ 5 |
| Image count | 5 photos max everywhere (onboarding + product editor) |
| Zero stock UX | Product stays visible; "Add to Cart" → "Out of Stock" disabled button; `is_active` unchanged |
| Delete product | Red "Delete Product" button at bottom of edit modal; confirmation dialog required |
| Auto-slug | Generated from product name (lowercase, hyphenated); collision: append `-2`, `-3` etc. |
| Category dropdown | Dynamically loaded from `product_categories` table (not hardcoded) |

### 7.5 Settings

| Item | Spec |
|---|---|
| Sections | Store Details (name, tagline, contact phone, contact email), Brand, Payment, WhatsApp, Delivery & Trust *(new)*, Notifications, Danger Zone |
| "About Your Store" textarea | Removed from Settings; full story in `/admin/about` |
| Tagline | `tenants.tagline` — shown in Settings; renders on storefront hero + `/about` header |
| Contact Phone | `tenants.contact_phone` — shown on `/about` page |
| Contact Email | `tenants.contact_email` — shown on `/about` page |
| Delivery & Trust section | Fields: Free delivery above (₹), Flat shipping fee (₹), Delivery estimate text, Return window (days), Custom trust badge text, Size guide image upload |
| Delete Store | Soft delete (`tenants.deleted_at`); store goes offline immediately; 30-day recovery window; hard-delete after 30 days via cron |

---

## 8. Route Table Updates

**New storefront routes:**
```
/about    Store about page — ISR 1hr
```

**New tenant admin routes:**
```
/admin/about      Store story, social links, branch locations
/admin/reviews    Product reviews moderation
```

**Updated rendering table:**

| Page | Strategy | Revalidation |
|---|---|---|
| `/about` | ISR | 1 hour (on-demand on admin save) |
| `/product/[slug]` | ISR + on-demand | On product edit OR new review |
| `/admin/about` | SSR dynamic | Every request |
| `/admin/reviews` | SSR dynamic | Every request |

---

## 9. Settings Hub — Sub-navigation

`/admin/settings` becomes a hub with a list of sub-routes:

```
Settings
  ├── Store Details       (name, tagline, contact phone/email)
  ├── Brand               (logo, color)
  ├── Payment             (gateway config)
  ├── WhatsApp            (number, show button toggle)
  ├── Delivery & Trust    (shipping, trust badges, size guide)
  ├── Notifications       (email toggle)
  ├── About Your Store →  /admin/about
  ├── Reviews         →   /admin/reviews
  ├── Categories      →   /admin/categories
  ├── Customers       →   /admin/customers
  ├── Promotions      →   /admin/promotions
  ├── Payouts         →   /admin/payouts
  └── Billing         →   /admin/billing
```

---

## 10. GST — V1 Decision

No GST calculation in V1. ICP sellers are below the ₹40L/year threshold. Product prices are MRP as entered. "Inclusive of all taxes" copy removed from all storefront pages. GST-compliant invoice PDF generation added to V2 backlog.

---

## 11. V2 Backlog Additions

- PostHog analytics dashboard page (`/admin/analytics`) — beyond dashboard stat cards
- GST-compliant invoice PDF for sellers who register
- `Returned` stock restoration — when order marked Returned, prompt owner to restock sizes
- Review response by store owner — owner can reply to a review
- Review helpfulness voting ("Was this helpful?")
- PhonePe PG payment option
