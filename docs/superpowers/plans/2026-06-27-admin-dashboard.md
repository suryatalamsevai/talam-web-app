# Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Design the Admin Dashboard in Paper (Page 3) — mobile (390px) and desktop (1440px) artboards — using extracted design tokens and components from Phase 1 & 2.

**Architecture:** Each artboard is built section-by-section using `write_html` calls (one visual group per call), verified with `get_screenshot` after each meaningful addition, then finished with `finish_working_on_nodes`. Mobile artboard is completed first, then desktop.

**Tech Stack:** Paper Design MCP (`mcp__plugin_paper-desktop_paper__*` tools), inline-styled HTML, SVG icons, design tokens from Phase 1.

## Global Constraints

- Mobile artboard: 390px wide, height: fit-content
- Desktop artboard: 1440px wide, height: fit-content
- Font family: system-ui (admin uses system sans-serif, not Playfair/DM Sans)
- Spacing base: 4px unit
- Brand primary: `#4F3FF0`, bg: `#F9FAFB`, surface: `#fff`, fg: `#111827`, muted: `#6B7280`, border: `#E5E7EB`
- Success: `#10B981`, danger: `#EF4444`, warning: `#F59E0B`, info: `#3B82F6`
- All stat values are sample/representative data — not real
- Frame naming convention: `[Screen] / [Viewport] / [State]`
- Touch targets: min 44×44px on all interactive elements
- Take `get_screenshot` after every task to verify before proceeding

---

### Task 1: Setup — Load guide, navigate to Page 3, create artboards

**Paper actions:**
- Call: `get_guide({ topic: "paper-mcp-instructions" })`
- Call: `get_basic_info()` — note existing pages and artboard IDs from Phase 1 & 2
- Call: `get_font_family_info()` — confirm system-ui available
- Navigate to or create Page 3 named "Admin Dashboard"
- Create two artboards on Page 3

- [ ] **Step 1: Load the Paper guide**
  ```
  get_guide({ topic: "paper-mcp-instructions" })
  ```
  Expected: full Paper MCP instructions loaded. Read before proceeding.

- [ ] **Step 2: Get current file state**
  ```
  get_basic_info()
  ```
  Expected: list of pages including Page 1 (Design System) and Page 2 (Component Library) from Phases 1 & 2. Note the file ID.

- [ ] **Step 3: Check font families**
  ```
  get_font_family_info()
  ```
  Expected: system-ui confirmed available.

- [ ] **Step 4: Open or create Page 3**

  If Page 3 "Admin Dashboard" doesn't exist:
  ```
  create_page({ name: "Admin Dashboard" })
  ```
  If it exists, navigate to it:
  ```
  open_page({ pageId: "<page-3-id>" })
  ```

- [ ] **Step 5: Create mobile artboard (390px)**
  ```
  create_artboard({
    name: "Admin Dashboard / Mobile",
    width: 390,
    height: 900,
    x: 0,
    y: 0
  })
  ```
  Save the returned nodeId as `MOBILE_ID`.

- [ ] **Step 6: Create desktop artboard (1440px)**
  ```
  create_artboard({
    name: "Admin Dashboard / Desktop",
    width: 1440,
    height: 1200,
    x: 440,
    y: 0
  })
  ```
  Save the returned nodeId as `DESKTOP_ID`.

- [ ] **Step 7: Set both artboards to fit-content height**
  ```
  update_styles({ nodeId: MOBILE_ID, styles: { height: "fit-content" } })
  update_styles({ nodeId: DESKTOP_ID, styles: { height: "fit-content" } })
  ```

- [ ] **Step 8: Screenshot to verify artboards exist**
  ```
  get_screenshot({ nodeId: MOBILE_ID })
  ```
  Expected: empty 390px white artboard.

---

### Task 2: Mobile — Header + Time Filter Row

**Files:** writes HTML into `MOBILE_ID`

- [ ] **Step 1: Write Header + Time Filter as one group**
  ```
  write_html({
    nodeId: MOBILE_ID,
    html: `
  <div style="width:390px;font-family:system-ui;">
    <!-- Header -->
    <div style="width:390px;height:60px;background:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 16px;border-bottom:1px solid #E5E7EB;box-sizing:border-box;">
      <div style="font-size:20px;font-weight:700;color:#111827;">talam<span style="color:#4F3FF0">.</span></div>
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111827" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
          <div style="position:absolute;top:6px;right:6px;width:8px;height:8px;background:#EF4444;border-radius:50%;border:1.5px solid #fff;"></div>
        </div>
        <div style="width:32px;height:32px;border-radius:50%;background:#4F3FF0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:600;">S</div>
      </div>
    </div>
    <!-- Time Filter Row -->
    <div style="padding:12px 16px;background:#fff;display:flex;gap:8px;border-bottom:1px solid #E5E7EB;box-sizing:border-box;">
      <button style="padding:6px 14px;background:#4F3FF0;color:#fff;border:none;border-radius:999px;font-size:12px;font-weight:700;cursor:pointer;">Today</button>
      <button style="padding:6px 14px;background:#fff;color:#6B7280;border:1.5px solid #E5E7EB;border-radius:999px;font-size:12px;font-weight:500;cursor:pointer;">Yesterday</button>
      <button style="padding:6px 14px;background:#fff;color:#6B7280;border:1.5px solid #E5E7EB;border-radius:999px;font-size:12px;font-weight:500;cursor:pointer;">This Week</button>
      <button style="padding:6px 14px;background:#fff;color:#6B7280;border:1.5px solid #E5E7EB;border-radius:999px;font-size:12px;font-weight:500;cursor:pointer;">This Month</button>
    </div>
  </div>
    `
  })
  ```

- [ ] **Step 2: Screenshot to verify**
  ```
  get_screenshot({ nodeId: MOBILE_ID })
  ```
  Expected: Header with "talam." logo, bell icon with red dot, avatar, and 4 pill tabs below with "Today" in brand purple.

---

### Task 3: Mobile — Stats Grid (2×2)

- [ ] **Step 1: Write Stats Grid**
  ```
  write_html({
    nodeId: MOBILE_ID,
    html: `
  <div style="padding:16px;background:#F9FAFB;display:grid;grid-template-columns:1fr 1fr;gap:10px;box-sizing:border-box;">
    <!-- Revenue -->
    <div style="background:rgba(79,63,240,0.04);border:1.5px solid #4F3FF0;border-radius:10px;padding:14px;">
      <div style="font-size:12px;color:#6B7280;margin-bottom:4px;">Revenue</div>
      <div style="font-size:24px;font-weight:700;color:#4F3FF0;">₹24,500</div>
      <div style="font-size:11px;font-weight:700;color:#10B981;margin-top:4px;">↑ +18% vs yesterday</div>
    </div>
    <!-- Orders -->
    <div style="background:#fff;border:1.5px solid #E5E7EB;border-radius:10px;padding:14px;">
      <div style="font-size:12px;color:#6B7280;margin-bottom:4px;">Orders</div>
      <div style="font-size:24px;font-weight:700;color:#111827;">38</div>
      <div style="font-size:11px;font-weight:700;color:#EF4444;margin-top:4px;">↓ -5% vs yesterday</div>
    </div>
    <!-- Customers -->
    <div style="background:#fff;border:1.5px solid #E5E7EB;border-radius:10px;padding:14px;">
      <div style="font-size:12px;color:#6B7280;margin-bottom:4px;">Customers</div>
      <div style="font-size:24px;font-weight:700;color:#111827;">142</div>
      <div style="font-size:11px;font-weight:700;color:#10B981;margin-top:4px;">↑ +3 new today</div>
    </div>
    <!-- Avg Order Value -->
    <div style="background:#fff;border:1.5px solid #E5E7EB;border-radius:10px;padding:14px;">
      <div style="font-size:12px;color:#6B7280;margin-bottom:4px;">Avg Order Value</div>
      <div style="font-size:24px;font-weight:700;color:#111827;">₹645</div>
      <div style="font-size:11px;font-weight:700;color:#10B981;margin-top:4px;">↑ +₹120 vs yesterday</div>
    </div>
  </div>
    `
  })
  ```

- [ ] **Step 2: Screenshot to verify**
  ```
  get_screenshot({ nodeId: MOBILE_ID })
  ```
  Expected: 2×2 grid. Revenue card has purple border and bg tint. All 4 cards show value + trend (green ↑ or red ↓).

---

### Task 4: Mobile — Chart + Metric Toggle

- [ ] **Step 1: Write Chart section**
  ```
  write_html({
    nodeId: MOBILE_ID,
    html: `
  <div style="background:#fff;padding:16px;border-bottom:8px solid #F9FAFB;box-sizing:border-box;">
    <!-- Metric toggle -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
      <div style="font-size:13px;font-weight:600;color:#111827;">Revenue Trend</div>
      <div style="display:flex;gap:6px;">
        <button style="padding:4px 10px;background:#4F3FF0;color:#fff;border:none;border-radius:999px;font-size:11px;font-weight:600;cursor:pointer;">Revenue</button>
        <button style="padding:4px 10px;background:#fff;color:#6B7280;border:1.5px solid #E5E7EB;border-radius:999px;font-size:11px;cursor:pointer;">Orders</button>
        <button style="padding:4px 10px;background:#fff;color:#6B7280;border:1.5px solid #E5E7EB;border-radius:999px;font-size:11px;cursor:pointer;">Customers</button>
      </div>
    </div>
    <!-- Line chart SVG (This Week / Revenue state) -->
    <svg width="358" height="160" viewBox="0 0 358 160" xmlns="http://www.w3.org/2000/svg">
      <line x1="28" y1="20" x2="358" y2="20" stroke="#E5E7EB" stroke-width="1"/>
      <line x1="28" y1="55" x2="358" y2="55" stroke="#E5E7EB" stroke-width="1"/>
      <line x1="28" y1="90" x2="358" y2="90" stroke="#E5E7EB" stroke-width="1"/>
      <line x1="28" y1="125" x2="358" y2="125" stroke="#E5E7EB" stroke-width="1"/>
      <text x="0" y="23" font-size="9" fill="#6B7280" font-family="system-ui">30k</text>
      <text x="0" y="58" font-size="9" fill="#6B7280" font-family="system-ui">20k</text>
      <text x="0" y="93" font-size="9" fill="#6B7280" font-family="system-ui">10k</text>
      <text x="0" y="128" font-size="9" fill="#6B7280" font-family="system-ui">0</text>
      <path d="M48,110 C80,95 105,58 140,65 C175,72 205,35 240,42 C275,49 310,72 340,58 L340,125 L48,125 Z" fill="rgba(79,63,240,0.08)"/>
      <path d="M48,110 C80,95 105,58 140,65 C175,72 205,35 240,42 C275,49 310,72 340,58" fill="none" stroke="#4F3FF0" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="48" cy="110" r="3.5" fill="#4F3FF0"/>
      <circle cx="94" cy="88" r="3.5" fill="#4F3FF0"/>
      <circle cx="140" cy="65" r="3.5" fill="#4F3FF0"/>
      <circle cx="192" cy="50" r="3.5" fill="#4F3FF0"/>
      <circle cx="240" cy="42" r="3.5" fill="#4F3FF0"/>
      <circle cx="290" cy="68" r="3.5" fill="#4F3FF0"/>
      <circle cx="340" cy="58" r="5" fill="#4F3FF0" stroke="#fff" stroke-width="2"/>
      <text x="48" y="150" font-size="10" fill="#6B7280" font-family="system-ui" text-anchor="middle">Mon</text>
      <text x="94" y="150" font-size="10" fill="#6B7280" font-family="system-ui" text-anchor="middle">Tue</text>
      <text x="140" y="150" font-size="10" fill="#6B7280" font-family="system-ui" text-anchor="middle">Wed</text>
      <text x="192" y="150" font-size="10" fill="#6B7280" font-family="system-ui" text-anchor="middle">Thu</text>
      <text x="240" y="150" font-size="10" fill="#6B7280" font-family="system-ui" text-anchor="middle">Fri</text>
      <text x="290" y="150" font-size="10" fill="#6B7280" font-family="system-ui" text-anchor="middle">Sat</text>
      <text x="340" y="150" font-size="10" fill="#6B7280" font-family="system-ui" text-anchor="middle">Sun</text>
    </svg>
  </div>
    `
  })
  ```

- [ ] **Step 2: Screenshot to verify**
  ```
  get_screenshot({ nodeId: MOBILE_ID })
  ```
  Expected: Section with "Revenue Trend" label, 3 metric pills (Revenue active in purple), SVG line chart with smooth curve, area fill, and Mon–Sun x-axis.

---

### Task 5: Mobile — Action Required Strip

- [ ] **Step 1: Write Action Required section**
  ```
  write_html({
    nodeId: MOBILE_ID,
    html: `
  <div style="background:#fff;border-bottom:8px solid #F9FAFB;font-family:system-ui;">
    <div style="padding:16px 16px 8px;">
      <span style="font-size:11px;font-weight:700;color:#EF4444;letter-spacing:0.05em;text-transform:uppercase;">Action Required</span>
    </div>
    <div style="padding:0 16px 16px;display:flex;flex-direction:column;gap:8px;">
      <!-- Pending orders -->
      <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:rgba(245,158,11,0.06);border-left:3px solid #F59E0B;border-radius:8px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:600;color:#111827;">3 orders awaiting confirmation</div>
          <div style="font-size:12px;color:#6B7280;margin-top:1px;">Pending for over 2 hours</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2" style="flex-shrink:0;"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
      <!-- Low stock -->
      <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:rgba(245,158,11,0.06);border-left:3px solid #F59E0B;border-radius:8px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" style="flex-shrink:0;"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:600;color:#111827;">2 items running low</div>
          <div style="font-size:12px;color:#6B7280;margin-top:1px;">Less than 5 units remaining</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2" style="flex-shrink:0;"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
      <!-- Failed payment -->
      <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:rgba(239,68,68,0.06);border-left:3px solid #EF4444;border-radius:8px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" style="flex-shrink:0;"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:600;color:#111827;">1 payment failed — Razorpay</div>
          <div style="font-size:12px;color:#6B7280;margin-top:1px;">Order #1042 · ₹1,850</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2" style="flex-shrink:0;"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
      <!-- New review -->
      <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:rgba(59,130,246,0.06);border-left:3px solid #3B82F6;border-radius:8px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2" style="flex-shrink:0;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:600;color:#111827;">2 new reviews need response</div>
          <div style="font-size:12px;color:#6B7280;margin-top:1px;">Cotton Kurta Set · Silk Saree</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2" style="flex-shrink:0;"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
    </div>
  </div>
    `
  })
  ```

- [ ] **Step 2: Screenshot to verify**
  ```
  get_screenshot({ nodeId: MOBILE_ID })
  ```
  Expected: "ACTION REQUIRED" label in red, 4 alert cards — 2 amber (pending/low stock), 1 red (payment), 1 blue (review) — each with icon, text, subtext, and chevron.

---

### Task 6: Mobile — Quick Actions Row

- [ ] **Step 1: Write Quick Actions section**
  ```
  write_html({
    nodeId: MOBILE_ID,
    html: `
  <div style="background:#fff;border-bottom:8px solid #F9FAFB;font-family:system-ui;">
    <div style="padding:16px 16px 8px;">
      <span style="font-size:11px;font-weight:700;color:#6B7280;letter-spacing:0.05em;text-transform:uppercase;">Quick Actions</span>
    </div>
    <div style="padding:0 16px 16px;display:flex;gap:10px;">
      <!-- Add Product -->
      <div style="width:72px;border:1.5px solid #E5E7EB;border-radius:10px;padding:14px 8px;display:flex;flex-direction:column;align-items:center;gap:6px;background:#fff;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4F3FF0" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
        <span style="font-size:11px;font-weight:500;color:#111827;text-align:center;line-height:1.3;">Add Product</span>
      </div>
      <!-- View Orders -->
      <div style="width:72px;border:1.5px solid #E5E7EB;border-radius:10px;padding:14px 8px;display:flex;flex-direction:column;align-items:center;gap:6px;background:#fff;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4F3FF0" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        <span style="font-size:11px;font-weight:500;color:#111827;text-align:center;line-height:1.3;">View Orders</span>
      </div>
      <!-- View Store -->
      <div style="width:72px;border:1.5px solid #E5E7EB;border-radius:10px;padding:14px 8px;display:flex;flex-direction:column;align-items:center;gap:6px;background:#fff;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4F3FF0" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        <span style="font-size:11px;font-weight:500;color:#111827;text-align:center;line-height:1.3;">View Store</span>
      </div>
      <!-- Share Link -->
      <div style="width:72px;border:1.5px solid #E5E7EB;border-radius:10px;padding:14px 8px;display:flex;flex-direction:column;align-items:center;gap:6px;background:#fff;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4F3FF0" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        <span style="font-size:11px;font-weight:500;color:#111827;text-align:center;line-height:1.3;">Share Link</span>
      </div>
    </div>
  </div>
    `
  })
  ```

- [ ] **Step 2: Screenshot to verify**
  ```
  get_screenshot({ nodeId: MOBILE_ID })
  ```
  Expected: "QUICK ACTIONS" label, 4 equal-width tiles in a row — each with a purple stroke icon and label centered below.

---

### Task 7: Mobile — Recent Orders

- [ ] **Step 1: Write Recent Orders section**
  ```
  write_html({
    nodeId: MOBILE_ID,
    html: `
  <div style="background:#fff;border-bottom:8px solid #F9FAFB;font-family:system-ui;">
    <div style="padding:16px 16px 8px;display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:11px;font-weight:700;color:#6B7280;letter-spacing:0.05em;text-transform:uppercase;">Recent Orders</span>
      <span style="font-size:12px;color:#4F3FF0;font-weight:500;">View all</span>
    </div>
    <div style="padding:0 16px;display:flex;flex-direction:column;gap:8px;">
      <!-- Order 1: Pending (amber urgency — >2h) -->
      <div style="border:1.5px solid #E5E7EB;border-radius:10px;padding:14px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="font-size:12px;font-weight:600;color:#6B7280;">#1045</span>
          <span style="font-size:12px;color:#F59E0B;font-weight:600;">⏱ 3h ago</span>
        </div>
        <div style="font-size:14px;font-weight:700;color:#111827;margin-bottom:2px;">Priya Sharma</div>
        <div style="font-size:13px;color:#6B7280;margin-bottom:10px;">2× Kurta Set, 1× Dupatta</div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:15px;font-weight:700;color:#111827;">₹1,850</span>
          <span style="font-size:12px;font-weight:600;color:#B45309;background:#FEF3C7;padding:4px 10px;border-radius:999px;">Pending</span>
        </div>
      </div>
      <!-- Order 2: Confirmed -->
      <div style="border:1.5px solid #E5E7EB;border-radius:10px;padding:14px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="font-size:12px;font-weight:600;color:#6B7280;">#1044</span>
          <span style="font-size:12px;color:#6B7280;">1h ago</span>
        </div>
        <div style="font-size:14px;font-weight:700;color:#111827;margin-bottom:2px;">Rahul Verma</div>
        <div style="font-size:13px;color:#6B7280;margin-bottom:10px;">1× Silk Banarasi Saree</div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:15px;font-weight:700;color:#111827;">₹3,200</span>
          <span style="font-size:12px;font-weight:600;color:#1D4ED8;background:#DBEAFE;padding:4px 10px;border-radius:999px;">Confirmed</span>
        </div>
      </div>
      <!-- Order 3: Delivered -->
      <div style="border:1.5px solid #E5E7EB;border-radius:10px;padding:14px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="font-size:12px;font-weight:600;color:#6B7280;">#1043</span>
          <span style="font-size:12px;color:#6B7280;">Yesterday</span>
        </div>
        <div style="font-size:14px;font-weight:700;color:#111827;margin-bottom:2px;">Ananya Patel</div>
        <div style="font-size:13px;color:#6B7280;margin-bottom:10px;">3× Cotton Kurta</div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:15px;font-weight:700;color:#111827;">₹2,100</span>
          <span style="font-size:12px;font-weight:600;color:#065F46;background:#D1FAE5;padding:4px 10px;border-radius:999px;">Delivered</span>
        </div>
      </div>
    </div>
    <!-- View all button -->
    <div style="padding:16px;text-align:center;">
      <button style="border:1.5px solid #4F3FF0;border-radius:8px;padding:10px 24px;color:#4F3FF0;font-size:13px;font-weight:600;background:#fff;cursor:pointer;">View all orders</button>
    </div>
  </div>
    `
  })
  ```

- [ ] **Step 2: Screenshot to verify**
  ```
  get_screenshot({ nodeId: MOBILE_ID })
  ```
  Expected: 3 order cards. #1045 shows amber "⏱ 3h ago" timestamp and amber "Pending" badge. #1044 shows blue "Confirmed". #1043 shows green "Delivered". "View all orders" button at bottom.

---

### Task 8: Mobile — Top Products + Bottom Nav

- [ ] **Step 1: Write Top Products + Bottom Nav**
  ```
  write_html({
    nodeId: MOBILE_ID,
    html: `
  <div style="font-family:system-ui;">
    <!-- Top Products -->
    <div style="background:#fff;padding-bottom:16px;">
      <div style="padding:16px 16px 8px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:11px;font-weight:700;color:#6B7280;letter-spacing:0.05em;text-transform:uppercase;">Top Products</span>
        <span style="font-size:12px;color:#4F3FF0;font-weight:500;">View all</span>
      </div>
      <div style="padding:0 16px;display:flex;gap:10px;overflow-x:auto;">
        <!-- Product 1 -->
        <div style="min-width:120px;border:1.5px solid #E5E7EB;border-radius:10px;background:#fff;overflow:hidden;">
          <div style="width:120px;height:80px;background:#F3F0FF;display:flex;align-items:center;justify-content:center;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4F3FF0" stroke-width="1.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          </div>
          <div style="padding:8px;">
            <div style="font-size:12px;font-weight:700;color:#111827;line-height:1.3;margin-bottom:3px;">Cotton Kurta Set</div>
            <div style="font-size:11px;color:#6B7280;margin-bottom:2px;">24 sold</div>
            <div style="font-size:11px;color:#10B981;font-weight:600;">In stock</div>
          </div>
        </div>
        <!-- Product 2 -->
        <div style="min-width:120px;border:1.5px solid #E5E7EB;border-radius:10px;background:#fff;overflow:hidden;">
          <div style="width:120px;height:80px;background:#FFF7ED;display:flex;align-items:center;justify-content:center;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="1.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          </div>
          <div style="padding:8px;">
            <div style="font-size:12px;font-weight:700;color:#111827;line-height:1.3;margin-bottom:3px;">Silk Banarasi Saree</div>
            <div style="font-size:11px;color:#6B7280;margin-bottom:2px;">18 sold</div>
            <div style="font-size:11px;color:#F59E0B;font-weight:600;">Low (3 left)</div>
          </div>
        </div>
        <!-- Product 3 -->
        <div style="min-width:120px;border:1.5px solid #E5E7EB;border-radius:10px;background:#fff;overflow:hidden;">
          <div style="width:120px;height:80px;background:#F0FDF4;display:flex;align-items:center;justify-content:center;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="1.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          </div>
          <div style="padding:8px;">
            <div style="font-size:12px;font-weight:700;color:#111827;line-height:1.3;margin-bottom:3px;">Anarkali Suit</div>
            <div style="font-size:11px;color:#6B7280;margin-bottom:2px;">15 sold</div>
            <div style="font-size:11px;color:#10B981;font-weight:600;">In stock</div>
          </div>
        </div>
      </div>
    </div>
    <!-- Bottom Nav -->
    <div style="width:390px;height:64px;background:#fff;border-top:1px solid #E5E7EB;display:flex;align-items:center;justify-content:space-around;padding:0 8px;box-sizing:border-box;">
      <!-- Dashboard (active) -->
      <div style="display:flex;flex-direction:column;align-items:center;gap:3px;min-width:44px;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4F3FF0" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        <span style="font-size:10px;font-weight:600;color:#4F3FF0;">Dashboard</span>
      </div>
      <!-- Products -->
      <div style="display:flex;flex-direction:column;align-items:center;gap:3px;min-width:44px;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
        <span style="font-size:10px;font-weight:500;color:#6B7280;">Products</span>
      </div>
      <!-- Orders -->
      <div style="display:flex;flex-direction:column;align-items:center;gap:3px;min-width:44px;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        <span style="font-size:10px;font-weight:500;color:#6B7280;">Orders</span>
      </div>
      <!-- Settings -->
      <div style="display:flex;flex-direction:column;align-items:center;gap:3px;min-width:44px;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
        <span style="font-size:10px;font-weight:500;color:#6B7280;">Settings</span>
      </div>
    </div>
  </div>
    `
  })
  ```

- [ ] **Step 2: Screenshot full mobile artboard**
  ```
  get_screenshot({ nodeId: MOBILE_ID })
  ```
  Expected: Top Products section with 3 horizontal scroll cards (purple/amber/green color-coded image placeholders, stock indicators). Bottom nav with Dashboard active in purple, other 3 items in muted grey.

- [ ] **Step 3: Finish working on mobile artboard**
  ```
  finish_working_on_nodes({ nodeIds: [MOBILE_ID] })
  ```

---

### Task 9: Desktop — Header + Time Filter + Stats Grid (4-col)

- [ ] **Step 1: Write desktop header + filter + stats**
  ```
  write_html({
    nodeId: DESKTOP_ID,
    html: `
  <div style="width:1440px;font-family:system-ui;background:#F9FAFB;">
    <!-- Header -->
    <div style="width:1440px;height:72px;background:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 40px;border-bottom:1px solid #E5E7EB;box-sizing:border-box;">
      <div style="font-size:22px;font-weight:700;color:#111827;">talam<span style="color:#4F3FF0">.</span></div>
      <div style="display:flex;align-items:center;gap:14px;">
        <div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111827" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
          <div style="position:absolute;top:8px;right:8px;width:8px;height:8px;background:#EF4444;border-radius:50%;border:1.5px solid #fff;"></div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:36px;height:36px;border-radius:50%;background:#4F3FF0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;font-weight:600;">S</div>
          <span style="font-size:14px;font-weight:500;color:#111827;">Surya's Store</span>
        </div>
      </div>
    </div>
    <!-- Content wrapper -->
    <div style="max-width:1200px;margin:0 auto;padding:32px;">
      <!-- Time Filter Row -->
      <div style="margin-bottom:24px;display:flex;gap:8px;">
        <button style="padding:8px 18px;background:#4F3FF0;color:#fff;border:none;border-radius:999px;font-size:13px;font-weight:700;cursor:pointer;">Today</button>
        <button style="padding:8px 18px;background:#fff;color:#6B7280;border:1.5px solid #E5E7EB;border-radius:999px;font-size:13px;font-weight:500;cursor:pointer;">Yesterday</button>
        <button style="padding:8px 18px;background:#fff;color:#6B7280;border:1.5px solid #E5E7EB;border-radius:999px;font-size:13px;font-weight:500;cursor:pointer;">This Week</button>
        <button style="padding:8px 18px;background:#fff;color:#6B7280;border:1.5px solid #E5E7EB;border-radius:999px;font-size:13px;font-weight:500;cursor:pointer;">This Month</button>
      </div>
      <!-- Stats Grid: 4-column -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px;">
        <div style="background:rgba(79,63,240,0.04);border:1.5px solid #4F3FF0;border-radius:10px;padding:20px;">
          <div style="font-size:13px;color:#6B7280;margin-bottom:6px;">Revenue</div>
          <div style="font-size:28px;font-weight:700;color:#4F3FF0;">₹24,500</div>
          <div style="font-size:12px;font-weight:700;color:#10B981;margin-top:6px;">↑ +18% vs yesterday</div>
        </div>
        <div style="background:#fff;border:1.5px solid #E5E7EB;border-radius:10px;padding:20px;">
          <div style="font-size:13px;color:#6B7280;margin-bottom:6px;">Orders</div>
          <div style="font-size:28px;font-weight:700;color:#111827;">38</div>
          <div style="font-size:12px;font-weight:700;color:#EF4444;margin-top:6px;">↓ -5% vs yesterday</div>
        </div>
        <div style="background:#fff;border:1.5px solid #E5E7EB;border-radius:10px;padding:20px;">
          <div style="font-size:13px;color:#6B7280;margin-bottom:6px;">Customers</div>
          <div style="font-size:28px;font-weight:700;color:#111827;">142</div>
          <div style="font-size:12px;font-weight:700;color:#10B981;margin-top:6px;">↑ +3 new today</div>
        </div>
        <div style="background:#fff;border:1.5px solid #E5E7EB;border-radius:10px;padding:20px;">
          <div style="font-size:13px;color:#6B7280;margin-bottom:6px;">Avg Order Value</div>
          <div style="font-size:28px;font-weight:700;color:#111827;">₹645</div>
          <div style="font-size:12px;font-weight:700;color:#10B981;margin-top:6px;">↑ +₹120 vs yesterday</div>
        </div>
      </div>
    </div>
  </div>
    `
  })
  ```

- [ ] **Step 2: Screenshot to verify**
  ```
  get_screenshot({ nodeId: DESKTOP_ID })
  ```
  Expected: Full-width header (72px) with store name and avatar. Content area centered at 1200px. 4 filter pills. 4-column stats grid with Revenue card in purple.

---

### Task 10: Desktop — Chart + Action Required (side by side)

- [ ] **Step 1: Write 2-column row: Chart left, Action Required right**
  ```
  write_html({
    nodeId: DESKTOP_ID,
    html: `
  <div style="max-width:1200px;margin:0 auto;padding:0 32px 24px;font-family:system-ui;">
    <div style="display:grid;grid-template-columns:1fr 360px;gap:24px;align-items:start;">
      <!-- Chart column -->
      <div style="background:#fff;border-radius:12px;border:1px solid #E5E7EB;padding:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div style="font-size:14px;font-weight:600;color:#111827;">Revenue Trend</div>
          <div style="display:flex;gap:6px;">
            <button style="padding:5px 12px;background:#4F3FF0;color:#fff;border:none;border-radius:999px;font-size:12px;font-weight:600;cursor:pointer;">Revenue</button>
            <button style="padding:5px 12px;background:#fff;color:#6B7280;border:1.5px solid #E5E7EB;border-radius:999px;font-size:12px;cursor:pointer;">Orders</button>
            <button style="padding:5px 12px;background:#fff;color:#6B7280;border:1.5px solid #E5E7EB;border-radius:999px;font-size:12px;cursor:pointer;">Customers</button>
          </div>
        </div>
        <svg width="100%" height="200" viewBox="0 0 700 200" xmlns="http://www.w3.org/2000/svg" style="display:block;">
          <line x1="40" y1="20" x2="700" y2="20" stroke="#E5E7EB" stroke-width="1"/>
          <line x1="40" y1="65" x2="700" y2="65" stroke="#E5E7EB" stroke-width="1"/>
          <line x1="40" y1="110" x2="700" y2="110" stroke="#E5E7EB" stroke-width="1"/>
          <line x1="40" y1="155" x2="700" y2="155" stroke="#E5E7EB" stroke-width="1"/>
          <text x="0" y="23" font-size="10" fill="#6B7280" font-family="system-ui">30k</text>
          <text x="0" y="68" font-size="10" fill="#6B7280" font-family="system-ui">20k</text>
          <text x="0" y="113" font-size="10" fill="#6B7280" font-family="system-ui">10k</text>
          <text x="8" y="158" font-size="10" fill="#6B7280" font-family="system-ui">0</text>
          <path d="M80,150 C140,130 200,80 280,90 C360,100 420,45 500,55 C560,63 620,95 660,75 L660,155 L80,155 Z" fill="rgba(79,63,240,0.08)"/>
          <path d="M80,150 C140,130 200,80 280,90 C360,100 420,45 500,55 C560,63 620,95 660,75" fill="none" stroke="#4F3FF0" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="80" cy="150" r="4" fill="#4F3FF0"/>
          <circle cx="180" cy="110" r="4" fill="#4F3FF0"/>
          <circle cx="280" cy="90" r="4" fill="#4F3FF0"/>
          <circle cx="380" cy="68" r="4" fill="#4F3FF0"/>
          <circle cx="500" cy="55" r="4" fill="#4F3FF0"/>
          <circle cx="580" cy="80" r="4" fill="#4F3FF0"/>
          <circle cx="660" cy="75" r="5.5" fill="#4F3FF0" stroke="#fff" stroke-width="2.5"/>
          <text x="80" y="185" font-size="11" fill="#6B7280" font-family="system-ui" text-anchor="middle">Mon</text>
          <text x="180" y="185" font-size="11" fill="#6B7280" font-family="system-ui" text-anchor="middle">Tue</text>
          <text x="280" y="185" font-size="11" fill="#6B7280" font-family="system-ui" text-anchor="middle">Wed</text>
          <text x="380" y="185" font-size="11" fill="#6B7280" font-family="system-ui" text-anchor="middle">Thu</text>
          <text x="500" y="185" font-size="11" fill="#6B7280" font-family="system-ui" text-anchor="middle">Fri</text>
          <text x="580" y="185" font-size="11" fill="#6B7280" font-family="system-ui" text-anchor="middle">Sat</text>
          <text x="660" y="185" font-size="11" fill="#6B7280" font-family="system-ui" text-anchor="middle">Sun</text>
        </svg>
      </div>
      <!-- Action Required column -->
      <div style="background:#fff;border-radius:12px;border:1px solid #E5E7EB;padding:20px;">
        <div style="margin-bottom:12px;">
          <span style="font-size:11px;font-weight:700;color:#EF4444;letter-spacing:0.05em;text-transform:uppercase;">Action Required</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:rgba(245,158,11,0.06);border-left:3px solid #F59E0B;border-radius:8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <div style="flex:1;">
              <div style="font-size:13px;font-weight:600;color:#111827;">3 orders awaiting confirmation</div>
              <div style="font-size:12px;color:#6B7280;">Pending for over 2 hours</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
          <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:rgba(245,158,11,0.06);border-left:3px solid #F59E0B;border-radius:8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" style="flex-shrink:0;"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
            <div style="flex:1;">
              <div style="font-size:13px;font-weight:600;color:#111827;">2 items running low</div>
              <div style="font-size:12px;color:#6B7280;">Less than 5 units remaining</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
          <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:rgba(239,68,68,0.06);border-left:3px solid #EF4444;border-radius:8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" style="flex-shrink:0;"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <div style="flex:1;">
              <div style="font-size:13px;font-weight:600;color:#111827;">1 payment failed — Razorpay</div>
              <div style="font-size:12px;color:#6B7280;">Order #1042 · ₹1,850</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
          <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:rgba(59,130,246,0.06);border-left:3px solid #3B82F6;border-radius:8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2" style="flex-shrink:0;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <div style="flex:1;">
              <div style="font-size:13px;font-weight:600;color:#111827;">2 new reviews need response</div>
              <div style="font-size:12px;color:#6B7280;">Cotton Kurta Set · Silk Saree</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </div>
      </div>
    </div>
  </div>
    `
  })
  ```

- [ ] **Step 2: Screenshot to verify**
  ```
  get_screenshot({ nodeId: DESKTOP_ID })
  ```
  Expected: 2-column row. Left: chart with metric toggle, line chart, Mon–Sun x-axis. Right (360px): Action Required card with 4 alert rows.

---

### Task 11: Desktop — Recent Orders + Top Products (side by side)

- [ ] **Step 1: Write 2-column row: Recent Orders left, Top Products right**
  ```
  write_html({
    nodeId: DESKTOP_ID,
    html: `
  <div style="max-width:1200px;margin:0 auto;padding:0 32px 40px;font-family:system-ui;">
    <div style="display:grid;grid-template-columns:1fr 360px;gap:24px;align-items:start;">
      <!-- Recent Orders column -->
      <div style="background:#fff;border-radius:12px;border:1px solid #E5E7EB;overflow:hidden;">
        <div style="padding:20px 20px 12px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #E5E7EB;">
          <span style="font-size:11px;font-weight:700;color:#6B7280;letter-spacing:0.05em;text-transform:uppercase;">Recent Orders</span>
          <span style="font-size:13px;color:#4F3FF0;font-weight:500;cursor:pointer;">View all</span>
        </div>
        <div style="padding:16px 20px;display:flex;flex-direction:column;gap:10px;">
          <!-- Order 1: Pending (urgent) -->
          <div style="display:flex;align-items:center;gap:16px;padding:14px;border:1.5px solid #E5E7EB;border-radius:10px;">
            <div style="flex:1;">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                <span style="font-size:13px;font-weight:600;color:#6B7280;">#1045</span>
                <span style="font-size:13px;color:#F59E0B;font-weight:600;">⏱ 3h ago</span>
              </div>
              <div style="font-size:15px;font-weight:700;color:#111827;margin-bottom:2px;">Priya Sharma</div>
              <div style="font-size:13px;color:#6B7280;">2× Kurta Set, 1× Dupatta</div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
              <span style="font-size:16px;font-weight:700;color:#111827;">₹1,850</span>
              <span style="font-size:12px;font-weight:600;color:#B45309;background:#FEF3C7;padding:4px 12px;border-radius:999px;">Pending</span>
            </div>
          </div>
          <!-- Order 2: Confirmed -->
          <div style="display:flex;align-items:center;gap:16px;padding:14px;border:1.5px solid #E5E7EB;border-radius:10px;">
            <div style="flex:1;">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                <span style="font-size:13px;font-weight:600;color:#6B7280;">#1044</span>
                <span style="font-size:13px;color:#6B7280;">1h ago</span>
              </div>
              <div style="font-size:15px;font-weight:700;color:#111827;margin-bottom:2px;">Rahul Verma</div>
              <div style="font-size:13px;color:#6B7280;">1× Silk Banarasi Saree</div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
              <span style="font-size:16px;font-weight:700;color:#111827;">₹3,200</span>
              <span style="font-size:12px;font-weight:600;color:#1D4ED8;background:#DBEAFE;padding:4px 12px;border-radius:999px;">Confirmed</span>
            </div>
          </div>
          <!-- Order 3: Shipped -->
          <div style="display:flex;align-items:center;gap:16px;padding:14px;border:1.5px solid #E5E7EB;border-radius:10px;">
            <div style="flex:1;">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                <span style="font-size:13px;font-weight:600;color:#6B7280;">#1043</span>
                <span style="font-size:13px;color:#6B7280;">3h ago</span>
              </div>
              <div style="font-size:15px;font-weight:700;color:#111827;margin-bottom:2px;">Meera Iyer</div>
              <div style="font-size:13px;color:#6B7280;">1× Anarkali Suit, 1× Dupatta</div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
              <span style="font-size:16px;font-weight:700;color:#111827;">₹2,750</span>
              <span style="font-size:12px;font-weight:600;color:#1D4ED8;background:#DBEAFE;padding:4px 12px;border-radius:999px;">Shipped</span>
            </div>
          </div>
          <!-- Order 4: Delivered -->
          <div style="display:flex;align-items:center;gap:16px;padding:14px;border:1.5px solid #E5E7EB;border-radius:10px;">
            <div style="flex:1;">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                <span style="font-size:13px;font-weight:600;color:#6B7280;">#1042</span>
                <span style="font-size:13px;color:#6B7280;">Yesterday</span>
              </div>
              <div style="font-size:15px;font-weight:700;color:#111827;margin-bottom:2px;">Ananya Patel</div>
              <div style="font-size:13px;color:#6B7280;">3× Cotton Kurta</div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
              <span style="font-size:16px;font-weight:700;color:#111827;">₹2,100</span>
              <span style="font-size:12px;font-weight:600;color:#065F46;background:#D1FAE5;padding:4px 12px;border-radius:999px;">Delivered</span>
            </div>
          </div>
        </div>
        <div style="padding:16px;text-align:center;border-top:1px solid #E5E7EB;">
          <button style="border:1.5px solid #4F3FF0;border-radius:8px;padding:10px 28px;color:#4F3FF0;font-size:13px;font-weight:600;background:#fff;cursor:pointer;">View all orders</button>
        </div>
      </div>
      <!-- Top Products column (vertical list) -->
      <div style="background:#fff;border-radius:12px;border:1px solid #E5E7EB;overflow:hidden;">
        <div style="padding:20px 20px 12px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #E5E7EB;">
          <span style="font-size:11px;font-weight:700;color:#6B7280;letter-spacing:0.05em;text-transform:uppercase;">Top Products</span>
          <span style="font-size:13px;color:#4F3FF0;font-weight:500;cursor:pointer;">View all</span>
        </div>
        <div style="padding:16px 20px;display:flex;flex-direction:column;">
          <!-- Product 1 -->
          <div style="display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid #E5E7EB;">
            <div style="width:52px;height:52px;border-radius:8px;background:#F3F0FF;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4F3FF0" stroke-width="1.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
            </div>
            <div style="flex:1;">
              <div style="font-size:13px;font-weight:700;color:#111827;margin-bottom:2px;">Cotton Kurta Set</div>
              <div style="font-size:12px;color:#6B7280;margin-bottom:3px;">24 sold</div>
              <span style="font-size:11px;font-weight:600;color:#10B981;background:#D1FAE5;padding:2px 8px;border-radius:999px;">In stock</span>
            </div>
          </div>
          <!-- Product 2 -->
          <div style="display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid #E5E7EB;">
            <div style="width:52px;height:52px;border-radius:8px;background:#FFF7ED;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="1.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
            </div>
            <div style="flex:1;">
              <div style="font-size:13px;font-weight:700;color:#111827;margin-bottom:2px;">Silk Banarasi Saree</div>
              <div style="font-size:12px;color:#6B7280;margin-bottom:3px;">18 sold</div>
              <span style="font-size:11px;font-weight:600;color:#B45309;background:#FEF3C7;padding:2px 8px;border-radius:999px;">Low (3 left)</span>
            </div>
          </div>
          <!-- Product 3 -->
          <div style="display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid #E5E7EB;">
            <div style="width:52px;height:52px;border-radius:8px;background:#F0FDF4;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="1.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
            </div>
            <div style="flex:1;">
              <div style="font-size:13px;font-weight:700;color:#111827;margin-bottom:2px;">Anarkali Suit</div>
              <div style="font-size:12px;color:#6B7280;margin-bottom:3px;">15 sold</div>
              <span style="font-size:11px;font-weight:600;color:#10B981;background:#D1FAE5;padding:2px 8px;border-radius:999px;">In stock</span>
            </div>
          </div>
          <!-- Product 4 -->
          <div style="display:flex;align-items:center;gap:14px;padding:12px 0;">
            <div style="width:52px;height:52px;border-radius:8px;background:#EEF2FF;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4F3FF0" stroke-width="1.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
            </div>
            <div style="flex:1;">
              <div style="font-size:13px;font-weight:700;color:#111827;margin-bottom:2px;">Embroidered Dupatta</div>
              <div style="font-size:12px;color:#6B7280;margin-bottom:3px;">12 sold</div>
              <span style="font-size:11px;font-weight:600;color:#10B981;background:#D1FAE5;padding:2px 8px;border-radius:999px;">In stock</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
    `
  })
  ```

- [ ] **Step 2: Screenshot full desktop artboard**
  ```
  get_screenshot({ nodeId: DESKTOP_ID })
  ```
  Expected: 2-column bottom row. Left: 4 order cards with status badges (Pending amber, Confirmed blue, Shipped blue, Delivered green) + "View all orders" button. Right (360px): vertical product list with 52×52 thumbnails, name, units sold, stock badges.

- [ ] **Step 3: Finish working on desktop artboard**
  ```
  finish_working_on_nodes({ nodeIds: [DESKTOP_ID] })
  ```

---

### Task 12: Review + Polish

- [ ] **Step 1: Screenshot both artboards for final review**
  ```
  get_screenshot({ nodeId: MOBILE_ID })
  get_screenshot({ nodeId: DESKTOP_ID })
  ```
  Check for:
  - No content clipping at artboard edges
  - Stats grid: 2×2 mobile, 4-col desktop ✓
  - Chart visible and legible ✓
  - Action Required: 4 alert cards, color-coded ✓
  - Quick Actions: 4 tiles, icons purple ✓
  - Recent Orders: amber urgency on #1045, correct badge colors ✓
  - Top Products: horizontal scroll mobile, vertical list desktop ✓
  - Bottom nav: Dashboard active (purple), others muted ✓

- [ ] **Step 2: Fix any clipped content**

  If any artboard is clipping content:
  ```
  update_styles({ nodeId: MOBILE_ID, styles: { height: "fit-content" } })
  update_styles({ nodeId: DESKTOP_ID, styles: { height: "fit-content" } })
  ```

- [ ] **Step 3: Rename artboard frames consistently**
  ```
  rename_nodes([
    { nodeId: MOBILE_ID, name: "Admin Dashboard / Mobile / Default" },
    { nodeId: DESKTOP_ID, name: "Admin Dashboard / Desktop / Default" }
  ])
  ```

- [ ] **Step 4: Final screenshot**
  ```
  get_screenshot({ nodeId: MOBILE_ID })
  get_screenshot({ nodeId: DESKTOP_ID })
  ```
  Expected: Both artboards clean, correctly named, all sections visible without clipping.

- [ ] **Step 5: Finish working on all nodes**
  ```
  finish_working_on_nodes({ nodeIds: [MOBILE_ID, DESKTOP_ID] })
  ```
