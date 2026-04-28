# Design: Two-Step Add Client Wizard with Task Portfolio Setup

**Date:** 2026-04-28  
**Feature:** Inline two-step wizard on the Add Client page — Step 1 saves the client, Step 2 optionally sets up their task portfolio (services + team members → generate tasks immediately).

---

## Problem

Currently, adding a new client requires two separate workflows:
1. Add the client on the Add Client page.
2. Navigate to Task Management → New Task page → select the client → add services → generate tasks.

This creates unnecessary friction for a common onboarding flow where a new client is added along with their compliance services.

---

## Solution

Convert `AddClientPage` into a linear two-step MUI `Stepper`:
- **Step 1: Client Details** — existing form, unchanged.
- **Step 2: Task Portfolio** — new portfolio builder, only unlocked after Step 1 saves successfully.

After Step 2 (generate or skip), navigate to the client's profile page (`/clients/:clientCode`).

---

## Page Structure

### Stepper Header
A MUI `Stepper` with two steps rendered at the top of the page:
- Step 1: "Client Details"
- Step 2: "Task Portfolio"

Step 2 is visually disabled until Step 1 succeeds. On successful save, the page scrolls to top and auto-advances to Step 2. The saved `clientCode` is held in component state.

---

## Step 1: Client Details

No changes to the existing form. Behavior on submit:
- On success: stores the new `clientCode` in state, advances stepper to Step 2.
- On error: shows existing error handling (unchanged).

The success banner from the existing form is suppressed in favor of advancing the stepper (the stepper advancement itself communicates success).

---

## Step 2: Task Portfolio (`PortfolioBuilder` component)

A new standalone component: `client/src/components/PortfolioBuilder.js`

### Props
| Prop | Type | Description |
|------|------|-------------|
| `clientCode` | `string` | The newly created client's code |
| `onDone` | `(result: 'generated' \| 'skipped') => void` | Callback after user completes or skips |

### UI Layout
1. **Service row form** (above the table):
   - Service dropdown — all firm services (`GET /api/services`)
   - Team Member dropdown — all team members (`GET /api/teams` or users endpoint)
   - Start Date picker (defaults to today)
   - "Add to List" button — appends the row to the table below

2. **Services table** (populated as user adds rows):
   - Columns: Service Name, Assignee, Start Date, Remove (icon button)
   - Empty state: "No services added yet."

3. **Action buttons** (bottom):
   - **"Generate Tasks"** (primary) — disabled if table is empty; calls `POST /api/tasks/generate-new` for each row sequentially, shows a `LinearProgress` bar during generation, then shows a success summary (e.g., "3 services set up, tasks generated.")
   - **"Skip for now"** (outlined) — bypasses portfolio setup, calls `onDone('skipped')` immediately

### Task Generation
- Iterates over the added services list.
- For each service, calls `POST /api/tasks/generate-new` with `{ clientCode, serviceCode, teamMemberId, startDate }`.
- Errors per service are collected and shown in an `Alert` after generation completes (non-blocking — partial success is allowed).
- On completion, calls `onDone('generated')`.

---

## Component Architecture

### New file
`client/src/components/PortfolioBuilder.js` — self-contained, accepts `clientCode` + `onDone` callback.

### Modified file
`client/src/pages/AddClientPage.js`:
- Add MUI `Stepper` at the top.
- Add `activeStep` and `savedClientCode` state.
- On Step 1 success: set `savedClientCode`, advance `activeStep` to 1.
- Render `<PortfolioBuilder>` when `activeStep === 1`.
- `onDone` callback: `navigate(`/clients/${savedClientCode}`)`.

### Unchanged
`client/src/pages/NewTaskPage.js` — no changes. `PortfolioBuilder` is new code.

---

## Backend

No new endpoints required. Step 2 reuses:

| Endpoint | Purpose |
|----------|---------|
| `GET /api/services` | Fetch all firm services for the dropdown |
| `GET /api/teams` | Fetch team members for assignee dropdown |
| `POST /api/tasks/generate-new` | Generate tasks per service (existing) |

---

## Navigation After Step 2

After `onDone` is called (generate or skip):
```
navigate(`/clients/${savedClientCode}/profile`)
```
This lands the user on the client's dedicated profile page (`ClientProfilePage`), showing the full client record and their newly generated tasks.

---

## Out of Scope

- Editing services added in Step 2 (use the existing Task Management page for that).
- Refactoring `NewTaskPage` to use `PortfolioBuilder` (can be done as a follow-up).
- Description or manual due date on tasks generated in Step 2 (uses service defaults).
