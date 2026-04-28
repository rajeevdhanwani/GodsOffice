# Design: Services Tab — Team Member Name Fix + Add Service Redesign

**Date:** 2026-04-28
**File:** `client/src/pages/reports/ClientIntelligencePage.js`

---

## Problem

Two issues on the Services tab of the Client Intelligence page:

1. **Team member name shows as ID** — `loadServiceFormData` normalises the `/teams` response with `Array.isArray(d) ? d : d.teamMembers || []`. The API returns `{ data: [...] }`, so both branches miss and `teamMembers` is `[]`. `teamMemberMap` is empty and every cell falls back to showing the raw `teamMemberId` string.

2. **Add Service is single-service only, no task generation** — the existing dialog calls `POST /client-services/assign` (assignment-only). It does not generate tasks and only accepts one service at a time — inconsistent with PortfolioBuilder.

---

## Solution

### Fix 1: Team member name normalisation

One-line change in `loadServiceFormData` (line ~778):

```js
// Before
setTeamMembers(Array.isArray(d) ? d : d.teamMembers || []);

// After
setTeamMembers(Array.isArray(d.data) ? d.data : Array.isArray(d) ? d : d.teamMembers || []);
```

This matches the guard already used in `PortfolioBuilder.js` and correctly handles `{ data: [...] }`.

---

### Fix 2: Replace Add Service dialog with inline collapsible PortfolioBuilder panel

**Remove entirely:**
- State: `addOpen`, `addForm`, `addBusy`, `addError`
- Handler: `handleAddService`
- JSX: the Add Service `Dialog` (the one calling `POST /client-services/assign`)
- The `allServiceMasters` state and its fetch in `loadServiceFormData` (only used by the old dialog — PortfolioBuilder fetches its own services)

**Add:**
- State: `addPanelOpen` (boolean, default `false`)

**Button behaviour (currently at line ~2663):**
- "Add Service" button toggles `addPanelOpen`
- When `addPanelOpen` is true, button label changes to "Close" with a close icon

**Panel placement:**
- A MUI `Collapse` wrapping a `Paper variant="outlined"` inserted **above** the services table, directly below the toolbar row containing the "Add Service" button and FY filter
- Inside the Paper: `<PortfolioBuilder clientCode={clientCode} onDone={handlePortfolioDone} />`

**`handlePortfolioDone`:**
```js
const handlePortfolioDone = () => {
  setAddPanelOpen(false);
  loadServices();
};
```

Called for both `'generated'` and `'partial'` outcomes from PortfolioBuilder (no navigation needed — user is already on the client page).

---

## File Changes

| Action | File |
|--------|------|
| **Modify** | `client/src/pages/reports/ClientIntelligencePage.js` |

`PortfolioBuilder` is already built and exported — imported from `../../components/PortfolioBuilder`.

---

## Out of Scope

- Any changes to `PortfolioBuilder` itself
- The deactivate / delete dialogs (unchanged)
- The FY filter / services table columns (unchanged)
- `loadServiceFormData` team-members fetch is still needed for `teamMemberMap` display — only `allServiceMasters` fetch and its state can be removed
