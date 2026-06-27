# Talam — Wireframe Design Plan
**Date:** 2026-06-27  
**Status:** Design Phase Kickoff  
**Tool:** Paper Design MCP  
**Reference:** `docs/2026-06-23-talam-oss-design.md` (v1.1)

---

## Overview

This document outlines the design schedule for Talam's UI/UX wireframes across **Storefront** and **Tenant Admin** surfaces, prioritized by conversion impact and user frequency.

**Design Approach:**
- Mobile-first (390px target viewport)
- Paper Design tool (SVG-based, component-driven)
- Organized by page sections and states
- Responsive annotations for desktop (1200px max)

---

## Priority Tier 1: Highest Conversion Impact

### 1. Storefront — Product Detail (`/product/[slug]`)
**Why:** Highest conversion impact. Core buying experience.

**Screens to design:**
- [ ] **Product Detail — Mobile** (390px)
  - Image gallery (swipeable, 2:3 aspect, dot indicators)
  - Product info (name, rating, price with discount badge)
  - Pincode delivery check
  - Size selector (pill buttons)
  - Description (collapsible)
  - Delivery info icons
  - Sticky bottom bar (wishlist + Add to Cart)
  - Reviews section (rating breakdown, filter chips, individual review cards)
- [ ] **Product Detail — Desktop** (1200px)
  - 2-column layout (gallery left, info right)
  - Gallery sticky on scroll
  - Thumbnail strip below main image
  - All sections visible on right (no sticky bottom bar)
  - Reviews full-width below
- [ ] **Out-of-Stock State**
  - Size pills greyed out, strikethrough
  - "Notify Me" button (if partial OOS) or disabled state
- [ ] **Report Review Modal**
  - Bottom sheet (mobile) / centered modal (desktop)
  - Reason radio buttons, optional details textarea

**Components referenced:**
- ProductCard, ImageGallery, SizeSelector, ReviewCard, ReviewForm, ReviewRatingBreakdown, ReportReviewModal

---

### 2. Tenant Admin — Dashboard (`/admin/dashboard`)
**Why:** Most-used screen by store owners (mobile-first, 10pm usage).

**Screens to design:**
- [ ] **Dashboard — Mobile** (390px)
  - Trial banner (sticky top, if applicable)
  - Header (logo, notification bell, avatar)
  - Stat grid (2-column: Revenue, Orders, Customers, Revenue %)
  - Divider
  - Recent orders (3–5 cards)
  - "View all orders" button
  - Bottom nav (fixed, 4 items: Dashboard, Products, Orders, Settings)
- [ ] **Dashboard — Desktop** (1200px)
  - Same sections, centered, max-width 960px
  - Stat grid 4-column
  - Larger card layout
  - No bottom nav (sidebar/top nav instead)
- [ ] **Trial Banner State** (if on free trial)
  - "X days left" + "Upgrade" button (sticky, brand bg)
- [ ] **Order Cards** (3 variants)
  - Pending (amber status badge)
  - Confirmed (green status badge)
  - Shipped (blue status badge)

**Components referenced:**
- StatCard, OrderCard, TrialBanner, OrderStatusBadge, BottomNav

---

## Priority Tier 2: First Experience & Trust

### 3. Tenant Admin — Onboarding Wizard (6-step)
**Why:** First experience — sets expectations for ease of use.

**Screens to design:**
- [ ] **Step Indicator** (horizontal, 6 dots, connecting lines)
  - Unfilled (light gray), Active (brand), Done (filled + checkmark)
- [ ] **Step 1: Name Your Store**
  - Store name input
  - URL preview (slug format: `[name].talam.app`)
  - Category dropdown
- [ ] **Step 2: Brand Your Store**
  - Logo upload (drag-drop area)
  - Colour swatches (6 presets)
  - Hex input + live preview
- [ ] **Step 3: Add Your First Product**
  - Product name, price, category
  - Image upload
  - Size checkboxes
  - "Skip" option
- [ ] **Step 4: Connect Payments**
  - Radio card options (UPI, Instamojo, Razorpay)
  - Payment-specific fields (UPI ID, API keys)
- [ ] **Step 5: Go Live**
  - Confetti animation area
  - Store link (copyable URL)
  - WhatsApp share button
  - "View your store" CTA
- [ ] **Footer Navigation**
  - Back, Next (disabled until valid), Skip buttons

**Components referenced:**
- OnboardingWizard, StepIndicator, ThemePicker, PaymentSelector, ProductEditor

---

### 4. Storefront — Checkout (`/checkout`)
**Why:** Trust = conversion. Multi-step form with security cues.

**Screens to design:**
- [ ] **Checkout Header**
  - Back arrow, store name (with brand-colored dot)
  - "Secure Checkout" badge + lock icon
- [ ] **Step Indicator** (horizontal: Details → Address → Payment)
  - Progress bar with dots
- [ ] **Step 1: OTP Login**
  - Phone input
  - OTP input (4 boxes, 48×52px)
  - Verified state (green bg, checkmark)
- [ ] **Step 2: Address**
  - Form grid (2-col on desktop, full-width on mobile)
  - Fields: Name, Email, Phone, Address line 1, Pincode, City, State
  - Focus states (brand border) + error states (red border)
  - Custom dropdown arrow icons
- [ ] **Step 3: Payment**
  - Payment option cards (border-radius 10px, radio + icon + name + desc)
  - **UPI Payment** (expanded state)
    - QR placeholder (120×120px repeating pattern)
    - UPI ID + UTR input field
  - **Instamojo / Razorpay** (expanded state)
    - Logo badges + description
- [ ] **Order Summary** (mobile: toggle collapse, desktop: fixed 360px sidebar)
  - Item list with thumbnails
  - Subtotal, Delivery, Discount rows
  - **Total** (bold, border-top)
- [ ] **Sticky Pay Bar** (mobile only)
  - Total amount + "Place Order" CTA

**Components referenced:**
- CartDrawer, PaymentSelector, UPIQRCode, StepIndicator, OrderSummary

---

## Priority Tier 3: Polish & Acquisition

### 5. Storefront — Home Page (`/`)
**Screens to design:**
- [ ] **Header** (sticky, 60px mobile / 72px desktop)
  - Logo (store name with brand dot), nav links (desktop), icons (search, wishlist, cart, account)
- [ ] **Sale Banner** (if active, dismissable)
  - Countdown timer, dark bg, white text
- [ ] **Hero Section**
  - Dark gradient bg (#5C1230 → #2d1b69) + warm overlay glow
  - Eyebrow (amber, uppercase), headline (clamp 26–48px), description, CTA
  - Desktop: model illustration on right
- [ ] **Chip Rail** (category filters, horizontal scroll)
  - Active chip: filled store primary + white text
- [ ] **Category Section** ("Shop by Category")
  - Horizontal scroll cards with images + label overlay
- [ ] **New Arrivals Grid** (2-col mobile, 4-col desktop)
  - ProductCard layout (image, badges, wishlist heart, name, price, rating)
- [ ] **Editorial Section** ("Festival Edit")
  - Warm bg, title, "Shop the Edit →" link
- [ ] **About Section** (dark bg, warm text)
  - Eyebrow (amber), headline, paragraph
- [ ] **Footer**
  - Links, "Powered by Talam" badge
- [ ] **WhatsApp FAB** (green, fixed bottom-right, always visible above bottom nav)
- [ ] **Bottom Navigation** (mobile only, 5 items)
  - Home | Shop | Wishlist | Orders | Account

**Components referenced:**
- ProductCard, FilterSheet, SaleBanner, BottomNav

---

### 6. Storefront — Shop (`/shop` + `/shop/[categorySlug]`)
**Screens to design:**
- [ ] **Shop Header** (sticky, 60px)
  - Back arrow, "Shop" title, search icon
- [ ] **Filter Bar** (horizontal scroll chips)
  - Filter chip (icon + count badge on left)
  - Category chips (Kurtis, Sarees, Tops, etc.)
  - Sort chip (right-aligned)
- [ ] **Results Bar**
  - "Showing X products" + filter summary
- [ ] **Product Grid** (2-col mobile, 3-col desktop)
  - ProductCard layout
  - 1px gap between cards
- [ ] **Filter Sheet** (mobile, bottom sheet)
  - Handle bar, title, "Reset all" button
  - Sections: Category (buttons), Size (buttons), Price (min/max inputs), Sort (buttons)
  - "Show X products" apply button
- [ ] **Filter Sidebar** (desktop, 240px left sidebar)
  - Checkboxes for category, size
  - Price range inputs
  - Sort radio options

**Components referenced:**
- ProductCard, FilterSheet, FilterSidebar

---

### 7. Storefront — About (`/about`)
**Screens to design:**
- [ ] **Header** (sticky, back arrow, store name + tagline, share icon)
- [ ] **Owner Section**
  - Owner photo (120×120px circle, brand border)
  - Name (18px bold), title/role (13px muted)
- [ ] **Story Section**
  - "Our Story" heading, long-form text (14px, line-height 1.6)
- [ ] **Trust Stats** (3-column grid mobile, wrap on small screens)
  - Stat cards: large number + muted label
- [ ] **Social Links Section**
  - "Follow Us" / "Connect" heading
  - 40×40px circle buttons (Instagram, Facebook, YouTube, Google Business)
- [ ] **Branch Locations Section**
  - "Visit Us" heading
  - StoreBranchCard layout (name, address, phone, maps link)
  - 2-column grid on desktop for 2+ branches
- [ ] **Footer**
  - "Powered by Talam" badge

**Components referenced:**
- StoreAboutSection, StoreBranchCard, SocialLinkInput

---

### 8. Tenant Admin — Products (`/admin/products`)
**Screens to design:**
- [ ] **Header** (sticky, "Products" title)
- [ ] **Search Bar** (flex row, search input + filter button)
- [ ] **Results Bar** (N products + filter summary)
- [ ] **Product List**
  - Each row: thumbnail (52×52), name, price, stock badge (Green/Amber/Red), toggle switch (visible/hidden), edit icon
- [ ] **Product Editor Modal** (mobile: bottom sheet, desktop: centered modal)
  - Image upload (drag-drop)
  - Form fields: name, price, category, description
  - Size checkboxes
  - Stock inputs (per size)
  - Visible toggle
  - Cancel + Save buttons
- [ ] **FAB** (floating action button, "Add Product")
  - Fixed bottom-right (80px from bottom on mobile for nav clearance)

**Components referenced:**
- ProductEditor, ProductCard (as row), StatusToggle

---

### 9. Tenant Admin — Categories (`/admin/categories`)
**Screens to design:**
- [ ] **Header** (sticky, "Categories" title)
- [ ] **Empty State**
  - Icon, heading, paragraph, "Add Category" CTA
- [ ] **Category List**
  - Each row: drag handle (left), category name (editable on tap), delete button (right)
  - Inline edit mode: name becomes input field
- [ ] **Add Category Bottom Sheet**
  - Handle bar, title, close button
  - Category name input
  - Cancel + Save buttons
- [ ] **Delete Confirmation Dialog**
  - Message: "X products use this category. Reassign before deleting."
  - Cancel | Delete (red) buttons

**Components referenced:**
- CategoryList, DialogConfirm

---

### 10. Tenant Admin — Orders (`/admin/orders`)
**Screens to design:**
- [ ] **Header** (sticky, "Orders" title, search button)
- [ ] **Filter Tabs** (sticky, horizontal scroll)
  - All | Pending | Confirmed | Shipped | Delivered | Cancelled
  - Count badges on each tab
- [ ] **Order Cards** (list of cards)
  - Order ID (12px bold muted) | time (right-aligned)
  - Customer name (15px bold)
  - Items (13px muted)
  - Amount (16px bold) | status button (with chevron) | tracking input
  - Status button colors: Pending (amber), Confirmed (green), Shipped (blue), Delivered (light green)
- [ ] **Status Update Sheet** (mobile: bottom sheet, desktop: centered modal)
  - Status option cards (Pending, Confirmed, Shipped, Delivered, Cancelled)
  - Active option highlighted
  - Cancel button
- [ ] **Tracking Input** (shown for Shipped status)
  - Input + Save button

**Components referenced:**
- OrderCard, OrderStatusBadge

---

### 11. Tenant Admin — Settings (`/admin/settings`)
**Screens to design:**
- [ ] **Header** (sticky, back button, "Settings", "Save" button right)
- [ ] **Store Details Section**
  - Fields: Store name, Tagline, About (textarea), Contact phone, Contact email
- [ ] **Brand Section**
  - Logo upload + preview (56×56 circle)
  - Colour swatches (6 presets)
  - "Preview" button (shows live action button colors)
- [ ] **Payment Gateways Section**
  - Each gateway: icon, name, status (green "Connected"), "Change" button
- [ ] **Notifications Section**
  - Toggle rows: Email on order, SMS on shipment, etc.
- [ ] **Danger Zone**
  - "Delete Store" button (red, 100% width)

**Components referenced:**
- ThemePicker, PaymentSelector, ToggleSwitch

---

### 12. Tenant Admin — Store About (`/admin/about`)
**Screens to design:**
- [ ] **Header** (sticky, "Store About" title, "Save" button right, disabled until changes)
- [ ] **Store Story Section**
  - Textarea (min-height 120px)
  - Character counter (right-aligned, e.g. "245/1000")
  - Markdown/rich text support hints
- [ ] **Owner Photo Section**
  - Upload area (dashed border if empty, or preview with "Change"/"Remove")
  - 120×120px circle, brand border
- [ ] **Social Links Section**
  - Rows: platform icon (18px) + URL input
  - Platforms: Instagram, Facebook, YouTube, Google Business
  - Add more links button (optional)
- [ ] **Branch Locations Section**
  - List of branches (drag-reorderable, editable inline)
  - Each branch: name, address, phone, maps link (edit/delete icons)
  - "Add Location" button (dashed border, + icon)
- [ ] **Branch Editor Modal** (mobile: bottom sheet, desktop: centered modal)
  - Fields: Name, Address, City, Phone, Maps URL
  - Maps preview / "View on Maps" link
  - Cancel + Save buttons
- [ ] **Save/Cancel Buttons** (sticky bottom mobile, static desktop)

**Components referenced:**
- StoreBranchEditor, SocialLinkInput, StoreBranchCard

---

### 13. Tenant Admin — Reviews (`/admin/reviews`)
**Screens to design:**
- [ ] **Header** (sticky, "Reviews" title, unread count badge right)
- [ ] **Filter Tabs** (sticky, horizontal scroll)
  - All Reviews | Reported (with count) | Pending (V2)
- [ ] **Review Cards**
  - Header: rating (★★★★ 4) | reviewer name (12px bold) | date (11px muted right)
  - "Verified Purchase" badge (green, if applicable)
  - Product: "Reviewed on: [Product Name]" (12px muted, clickable)
  - Review title (13px bold, optional)
  - Review text (13px, max 300px before truncation)
  - "Read more" link if longer
  - Images (64×64 grid, 4px gap)
  - "X found helpful" + thumb icon
  - Action menu (⋯)
- [ ] **Reported Review Card** (same as above, plus)
  - Red left border indicator (4px)
  - Report section: "Reported X times" (red text)
  - Reason breakdown: "Spam (3), Inappropriate (2)"
  - "Dismiss" + "Delete" buttons
- [ ] **Action Menu** (dropdown or bottom sheet)
  - Hide from public (toggle)
  - Delete review
  - Mark as verified purchase
  - Pin to top
  - Contact reviewer (V2)
- [ ] **Empty State**
  - Icon, "No reviews yet", "Reviews will appear here once customers rate"

**Components referenced:**
- ReviewCard, ReviewRatingBreakdown, ReviewActionMenu

---

## Priority Tier 4: Customer Journeys

### 14. Storefront — Cart (`/cart` or CartDrawer)
- [ ] CartDrawer (slides from right, 380px max width)
- [ ] Cart Page (full-page fallback)

### 15. Storefront — Wishlist (`/wishlist`)
- [ ] Wishlist grid (2-col mobile, 4-col desktop)
- [ ] ProductCard with filled heart
- [ ] Add to Cart actions + Remove options

### 16. Storefront — Orders (`/orders` + `/orders/[id]`)
- [ ] Order list with status badges
- [ ] Order detail with timeline, tracking, items, payment, address

---

## Priority Tier 5: Polish & Marketing

### 17. Empty States (all screens)
- [ ] Shop (no products)
- [ ] Wishlist (empty)
- [ ] Orders (no orders)
- [ ] Admin Products (none)
- [ ] Admin Orders (none)
- [ ] Search (no results)
- [ ] Admin Reviews (no reviews)

### 18. Illustrations (reusable set)
- [ ] Empty state illustrations (cart, wishlist, orders, products, etc.)
- [ ] Success screen illustrations (order confirmed, review posted, etc.)
- [ ] Onboarding hero illustrations

---

## Design System Reference

**Dimensions:**
- Mobile viewport: 390px (target)
- Tablet: 768px
- Desktop: 1200px max-width (centered)
- Touch targets: min 44×44px

**Spacing (4px base):**
```
4px, 6px, 8px, 10px, 12px, 14px, 16px, 20px, 24px, 32px, 40px
```

**Border Radius:**
```
4px (minimal), 6px, 8px, 10px, 12px, 16px, 20px, 999px (pills)
```

**Typography (mobile-first, px):**
```
12px labels/captions (600–700)
13px button text / filter labels (500–600)
14px body text (400–500)
15px input text / card headings (500–600)
16px body default / section headings (400–600)
18px page titles mobile (600)
20px product names (600–700)
24px modal/section headings (600–700)
26px+ hero titles (700, clamp on mobile)
```

**Font Families:**
- Admin: system fonts (SF Pro Text, Inter, Segoe UI, Roboto)
- Storefront: Playfair Display (headings), DM Sans (body)

---

## Next Steps

1. **Load existing Paper design file** (if any) — check current progress
2. **Create design pages** in order of priority:
   - Page 1: Product Detail (mobile + desktop)
   - Page 2: Admin Dashboard (mobile + desktop)
   - Page 3: Onboarding Wizard (all 5 steps)
   - ... etc
3. **Build component library** as pages are designed
4. **Export frames to Figma** (or keep in Paper) for developer handoff
5. **Update this plan** as designs are completed

---

## Design Guidelines

**Mobile-first approach:**
- Design 390px frame first
- Expand to desktop (1200px) as second step
- Verify responsive breakpoints at 768px

**Component consistency:**
- Use Paper components for reusable UI elements
- Name frames with pattern: `[Section] / [Page] / [State]`
- Store color variables for theming (brand, store-primary, etc.)

**Handoff format:**
- SVG export per page
- JSX code generation (Paper → HTML/Tailwind)
- Design tokens file (colors, typography, spacing)

---

**Revised:** 2026-06-27  
**Status:** Ready for design Phase 1  
**Capacity:** Design 2–3 complete screens per session
