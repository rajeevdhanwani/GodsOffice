# Services Tab: Team Member Fix + Add Service Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix team member names showing as IDs on the Services tab, and replace the single-service Add Service dialog with an inline collapsible `PortfolioBuilder` panel that generates tasks immediately.

**Architecture:** Both changes are in one file — `ClientIntelligencePage.js`. Task 1 is a one-line normalisation fix. Task 2 removes the old dialog + its state/handler and adds a `Collapse`-wrapped `PortfolioBuilder` toggled by the existing "Add Service" button. `PortfolioBuilder` already exists and is reused without modification.

**Tech Stack:** React 18, MUI v6, dayjs, plain fetch.

---

## File Map

| Action | File | What changes |
|--------|------|-------------|
| **Modify** | `client/src/pages/reports/ClientIntelligencePage.js` | Fix `/teams` response normalisation; remove old add-service dialog state/handler/JSX; add `addPanelOpen` state + `Collapse` panel with `PortfolioBuilder` |

---

## Task 1: Fix team member name normalisation

**Files:**
- Modify: `client/src/pages/reports/ClientIntelligencePage.js` (line ~778)

---

- [ ] **Step 1.1: Apply the one-line fix**

In `loadServiceFormData` (around line 768), find:

```js
if (tmRes.ok) {
  const d = await tmRes.json();
  setTeamMembers(Array.isArray(d) ? d : d.teamMembers || []);
}
```

Replace with:

```js
if (tmRes.ok) {
  const d = await tmRes.json();
  setTeamMembers(Array.isArray(d.data) ? d.data : Array.isArray(d) ? d : d.teamMembers || []);
}
```

- [ ] **Step 1.2: Manual smoke test**

1. Start the dev server: `cd C:/Users/User/GodsOffice/client && npm start`
2. Navigate to any client's Services tab: `http://localhost:3000/clients/intelligence/<clientCode>?tab=services`
3. Confirm the Assignee column shows team member **names** (e.g. "Rajesh Kumar") instead of IDs (e.g. "TM-001")

- [ ] **Step 1.3: Commit**

```bash
cd C:/Users/User/GodsOffice/client && git add src/pages/reports/ClientIntelligencePage.js && git commit -m "fix: normalise /teams response shape in loadServiceFormData"
cd C:/Users/User/GodsOffice && git add client && git commit -m "fix: update client submodule (team member name normalisation)"
```

---

## Task 2: Replace Add Service dialog with inline PortfolioBuilder panel

**Files:**
- Modify: `client/src/pages/reports/ClientIntelligencePage.js`

---

- [ ] **Step 2.1: Update MUI import — add `Collapse`, remove `TextField` and `MenuItem`**

Find the existing `@mui/material` import block (lines 20-46). It currently ends with `TextField, MenuItem`. Make two changes:
- Add `Collapse` to the list
- Remove `TextField` and `MenuItem` (only used by the old dialog)

The updated import block:

```js
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  Tab,
  Tabs,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  Snackbar,
  IconButton,
} from "@mui/material";
```

- [ ] **Step 2.2: Add `Close` icon and `PortfolioBuilder` import**

In the `@mui/icons-material` import block (lines 51-68), add `Close as CloseIcon`:

```js
import {
  ArrowBack,
  AssignmentTurnedIn,
  CheckCircle,
  Close as CloseIcon,
  Edit,
  ErrorOutline,
  OpenInNew,
  ReceiptLong,
  Schedule,
  TrendingUp,
  WarningAmber,
  MiscellaneousServices as ServicesIcon,
  Psychology as IntelIcon,
  Person as ProfileIcon,
  PauseCircle as DeactivateIcon,
  DeleteForever as DeleteIcon,
  AddCircleOutline as AddIcon,
} from "@mui/icons-material";
```

After all existing imports, add:

```js
import PortfolioBuilder from "../../components/PortfolioBuilder";
```

- [ ] **Step 2.3: Remove old add-service state**

Find the "Add service dialog" state block (lines 712-720):

```js
// Add service dialog
const [addOpen, setAddOpen] = useState(false);
const [addForm, setAddForm] = useState({
  serviceCode: "",
  teamMemberId: "",
  startDate: dayjs(),
});
const [addBusy, setAddBusy] = useState(false);
const [addError, setAddError] = useState("");
```

Replace it entirely with:

```js
// Add service panel
const [addPanelOpen, setAddPanelOpen] = useState(false);
```

Also remove the `allServiceMasters` state declaration (line 699):

```js
const [allServiceMasters, setAllServiceMasters] = useState([]);
```

Delete that line entirely.

- [ ] **Step 2.4: Remove `handleAddService` function**

Find and delete the entire `handleAddService` function (lines 860-903):

```js
// ── Add new service ───────────────────────────────────────────────────────
const handleAddService = async () => {
  if (!addForm.serviceCode || !addForm.teamMemberId) {
    ...
  }
  ...
};
```

Delete from the `// ── Add new service` comment through the closing `};`.

- [ ] **Step 2.5: Remove `allServiceMasters` fetch from `loadServiceFormData`**

In `loadServiceFormData` (around line 768), find and remove the services fetch entirely. The function currently fetches both teams and services masters in parallel:

```js
const loadServiceFormData = useCallback(async () => {
  const token = localStorage.getItem("token");
  const [tmRes, svcRes] = await Promise.all([
    fetch(`${API}/teams`, { headers: { Authorization: `Bearer ${token}` } }),
    fetch(`${API}/services`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  ]);
  if (tmRes.ok) {
    const d = await tmRes.json();
    setTeamMembers(Array.isArray(d.data) ? d.data : Array.isArray(d) ? d : d.teamMembers || []);
  }
  if (svcRes.ok) {
    const d = await svcRes.json();
    setAllServiceMasters(Array.isArray(d) ? d : d.services || []);
  }
}, []);
```

Replace with (team members only — `allServiceMasters` is no longer needed):

```js
const loadServiceFormData = useCallback(async () => {
  const token = localStorage.getItem("token");
  const tmRes = await fetch(`${API}/teams`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (tmRes.ok) {
    const d = await tmRes.json();
    setTeamMembers(Array.isArray(d.data) ? d.data : Array.isArray(d) ? d : d.teamMembers || []);
  }
}, []);
```

- [ ] **Step 2.6: Replace the "Add Service" button**

Find the "Add Service" button (lines 2659-2675):

```jsx
<Button
  variant="contained"
  startIcon={<AddIcon />}
  onClick={() => {
    setAddOpen(true);
    setAddError("");
  }}
  size="small"
  sx={{
    background: C.accentGrad,
    textTransform: "none",
    fontWeight: 600,
    borderRadius: "10px",
  }}
>
  Add Service
</Button>
```

Replace with:

```jsx
<Button
  variant={addPanelOpen ? "outlined" : "contained"}
  startIcon={addPanelOpen ? <CloseIcon /> : <AddIcon />}
  onClick={() => setAddPanelOpen((prev) => !prev)}
  size="small"
  sx={{
    background: addPanelOpen ? "transparent" : C.accentGrad,
    textTransform: "none",
    fontWeight: 600,
    borderRadius: "10px",
  }}
>
  {addPanelOpen ? "Close" : "Add Service"}
</Button>
```

- [ ] **Step 2.7: Add the collapsible PortfolioBuilder panel**

Directly after the closing `</Box>` of the header row (after line 2676, before the `{servicesError && ...}` block), insert:

```jsx
{/* ── Inline add-service panel ─────────────────────────────────────── */}
<Collapse in={addPanelOpen} unmountOnExit>
  <Paper
    variant="outlined"
    sx={{ p: 3, mb: 2.5, borderRadius: "12px", borderColor: C.borderBlue }}
  >
    <PortfolioBuilder
      clientCode={clientCode}
      onDone={() => {
        setAddPanelOpen(false);
        loadServices();
      }}
    />
  </Paper>
</Collapse>
```

- [ ] **Step 2.8: Remove the old Add Service dialog**

Find and delete the entire old Add Service dialog block (lines ~2988-3070):

```jsx
{/* ── Add service dialog ────────────────────────────────────────── */}
<Dialog
  open={addOpen}
  onClose={() => setAddOpen(false)}
  maxWidth="xs"
  fullWidth
>
  ...
</Dialog>
```

Delete from the `{/* ── Add service dialog */}` comment through the closing `</Dialog>` tag.

- [ ] **Step 2.9: Manual smoke test**

1. Navigate to `http://localhost:3000/clients/intelligence/<clientCode>?tab=services`
2. Confirm the "Add Service" button is visible
3. Click it — confirm the panel expands with the PortfolioBuilder form (service dropdown, team member dropdown, start date, "Add to List")
4. Confirm the button now shows "Close" with an X icon
5. Click "Close" — confirm the panel collapses
6. Re-open, add one or more services, click "Generate Tasks" — confirm tasks are generated and the panel collapses and the services table refreshes
7. Test "Skip for now" — confirm the panel collapses and table refreshes

- [ ] **Step 2.10: Commit**

```bash
cd C:/Users/User/GodsOffice/client && git add src/pages/reports/ClientIntelligencePage.js && git commit -m "feat: replace add-service dialog with inline PortfolioBuilder panel"
cd C:/Users/User/GodsOffice && git add client && git commit -m "feat: update client submodule (add-service panel redesign)"
```
