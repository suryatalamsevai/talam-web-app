# Talam v1.1 Design Spec Update — Summary

**Date:** 2026-06-25  
**Status:** ✅ Approved & Consolidated  

---

## What Changed

The v1.1 design spec has been consolidated with the gap resolution (2026-06-25) into a single authoritative document. This resolves 6 major discrepancies that were identified during design review.

### Files Updated
- ✅ `docs/2026-06-23-talam-design.md` — Updated to v1.1 Final, includes all features, schema, and routing

### Files to Update Next (separate tasks)
- `docs/2026-06-23-talam-oss-design.md` — OSS design spec needs component library + page updates for reviews, about page, trust badges
- Design files (Figma/Penpot) — Product reviews UI, store about page, trust badge components

---

## Key Updates Summary

### 🎯 New Features in V1.1 Final

| Feature | Routes | Tables | Status |
|---------|--------|--------|--------|
| Store About Page | `/about`, `/admin/about` | `store_about`, `store_branches` | ✅ Spec'd |
| Product Reviews | `/admin/reviews` | `product_reviews`, `review_reports` | ✅ Spec'd |
| Trust Badges | (product page feature) | (tenants columns) | ✅ Spec'd |
| Delivery Checks | (product + checkout) | (tenants columns) | ✅ Spec'd |
| Admin Settings Hub | `/admin/settings/*` (13 sub-routes) | — | ✅ Spec'd |

### 📊 Database Additions

**New tables (4):**
- `store_about` — Store identity, social links
- `store_branches` — Physical branch locations
- `product_reviews` — 5-star ratings with verified purchase badges
- `review_reports` — Review moderation mechanism

**New columns on `tenants` (13):**
- Identity: `tagline`, `contact_phone`, `contact_email`
- Trust: `free_delivery_above`, `shipping_fee`, `delivery_estimate_text`, `return_window_days`, `trust_badge_text`, `size_guide_url`
- Visibility: `show_whatsapp_button`, `notify_email_on_order`
- Lifecycle: `deleted_at` (soft-delete)

### 🛣️ Routing Changes

**Storefront additions:**
- `GET /{store}/about` — Store about page (ISR, 1hr revalidation)

**Admin additions:**
- `GET/POST /{store}/admin/about` — Store story + branches management
- `GET/POST /{store}/admin/reviews` — Review moderation (all + reported)
- Settings hub: `/admin/settings/store`, `/admin/settings/brand`, `/admin/settings/payment`, `/admin/settings/whatsapp`, `/admin/settings/delivery`, `/admin/settings/notifications`

**Admin navigation restructure:**
- Old: Separate routes for categories, customers, promotions, payouts, billing
- New: All nested under `/admin/settings/*` via hub page
- Bottom nav: Dashboard → Products → Orders → Settings (4 items, down from 10)

### 🏗️ Architecture Updates

**Onboarding:** 6 steps → 5 steps
- Step 1: Store name (slug, store type)
- Step 2: Brand (logo, color)
- Step 3: Product (skippable) — *now optional*
- Step 4: Payment (gateway config)
- Step 5: Go Live (share links, WhatsApp compose)
- Categories moved to post-onboarding `/admin/categories` (not in wizard)

**Payment providers (V1 scope):**
- UPI Manual (0%)
- Instamojo (2% + ₹3) — recommended
- Razorpay (2%)
- ~~PhonePe~~ → V2

### ⏱️ Timeline Adjustment

**From:** 8 weeks (Aug 18 target)  
**To:** 9 weeks (Sept 1 target)

New features add ~5 days of work:
- Store About + branches: +1-2 days
- Product reviews CRUD: +2-3 days
- Trust badges + delivery: +1-2 days
- Admin hub restructure: +1-2 days

---

## Implementation Checklist

### Phase 1: Database & Core (Week 1)
- [ ] Add 4 new tables with RLS policies
- [ ] Add 13 columns to `tenants` table
- [ ] Create migrations

### Phase 2: Storefront (Weeks 2–4)
- [ ] `/about` route with trust stats, branches, social links
- [ ] Product page reviews section (aggregate + cards + write form)
- [ ] Review reporting mechanism
- [ ] Trust badges on product page
- [ ] Pincode delivery checker
- [ ] Size guide modal

### Phase 3: Admin (Weeks 5–6)
- [ ] Dashboard: trial banner, notifications bell, trends
- [ ] `/admin/about` CRUD (story, social, branches)
- [ ] `/admin/reviews` moderation (all + reported tabs)
- [ ] Settings hub with 13 sub-routes
- [ ] Delivery & Trust section in settings

### Phase 4: Onboarding & Polish (Weeks 7–9)
- [ ] Reduce wizard to 5 steps, move categories to admin
- [ ] Payment encryption note
- [ ] WhatsApp share on Go Live step
- [ ] QA, Lighthouse, security headers

---

## Design Spec Dependencies

### For Developers
- **Reference:** `/docs/2026-06-23-talam-design.md` — Single source of truth
- No need to cross-reference gap resolution spec anymore
- All decisions consolidated into main spec

### For Designers (separate work)
- **Still TODO:** Update `/docs/2026-06-23-talam-oss-design.md` with:
  - New components (ReviewCard, ReviewAggregate, ReviewForm, TrustBadges, SizeGuideModal, PincodeChecker)
  - `/about` page design specs
  - `/admin/about`, `/admin/reviews` page designs
  - Settings hub navigation
  - Updated onboarding 5-step flow
- **Status:** Flagged as out-of-sync; recommend creating separate design update task

---

## Decisions Locked In

✅ **Payment providers V1:** UPI Manual + Instamojo + Razorpay (PhonePe → V2)  
✅ **Review system:** Simple 5-star + optional text, no nested replies or upvotes (V2)  
✅ **Admin structure:** Settings hub with sub-navigation (vs. 10 separate 1st-class routes)  
✅ **Onboarding:** 5 steps with categories post-onboarding (vs. in-wizard)  
✅ **Soft delete:** Stores soft-delete on removal, hard-delete after 30 days  
✅ **Trust badges:** Dynamic based on tenant config (free delivery, return window, custom text)  

---

## Next Steps

1. **Approve this consolidation** — Confirm no further changes needed
2. **Update OSS design spec** — Create separate task for design doc sync (not blocking development)
3. **Begin Phase 1 (database setup)** — Can start immediately
4. **Assign weeks 1–9** — Confirm team capacity for 9-week timeline vs. original 8 weeks

---

**Spec Status:** 🟢 Ready for development  
**Design Status:** 🟡 OSS spec needs update (non-blocking)  
**Timeline:** 9 weeks from June 23 = September 1, 2026 launch target
