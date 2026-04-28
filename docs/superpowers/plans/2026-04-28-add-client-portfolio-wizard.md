# Add Client Portfolio Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the Add Client page into a two-step wizard — Step 1 saves the client, Step 2 lets the user optionally set up a task portfolio (multiple services + team members → generate tasks immediately), then navigates to the client's profile page.

**Architecture:** A new `PortfolioBuilder` component handles all Step 2 logic (fetch services/team members, build a service list, generate tasks via existing endpoints). `AddClientPage` gains a MUI `Stepper`, advances to Step 2 on successful client save passing the new `clientCode`, and navigates to `/clients/:clientCode/profile` after Step 2 completes.

**Tech Stack:** React 18, MUI v6, dayjs, `@tanstack/react-query` (not used here — plain fetch to match existing patterns), React Router v7, React Testing Library.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| **Create** | `client/src/components/PortfolioBuilder.js` | Self-contained Step 2 UI: service row form, added-services table, generate/skip actions |
| **Create** | `client/src/components/PortfolioBuilder.test.js` | RTL unit tests for PortfolioBuilder |
| **Modify** | `client/src/pages/AddClientPage.js` | Add MUI Stepper, `activeStep`/`savedClientCode` state, render PortfolioBuilder in Step 2 |

---

## Task 1: Create PortfolioBuilder component

**Files:**
- Create: `client/src/components/PortfolioBuilder.js`
- Create: `client/src/components/PortfolioBuilder.test.js`

---

- [ ] **Step 1.1: Write the failing tests**

Create `client/src/components/PortfolioBuilder.test.js`:

```js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import PortfolioBuilder from './PortfolioBuilder';

// Wrap with required providers
const renderBuilder = (props = {}) =>
  render(
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <PortfolioBuilder clientCode="TEST01" onDone={jest.fn()} {...props} />
    </LocalizationProvider>
  );

// Mock fetch globally
beforeEach(() => {
  global.fetch = jest.fn();
  localStorage.setItem('token', 'test-token');
});
afterEach(() => jest.clearAllMocks());

const mockServices = [
  { serviceCode: 'GST', serviceName: 'GST Filing', frequency: 'Monthly', priority: 'High' },
];
const mockTeam = [
  { teamMemberId: 'TM1', name: 'Alice' },
];

function setupFetchMocks() {
  global.fetch.mockImplementation((url) => {
    if (url.includes('/tasks/services')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockServices) });
    }
    if (url.includes('/teams')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTeam) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ tasks: [], tasksCreated: 1, message: 'ok' }) });
  });
}

test('renders loading state then shows form fields', async () => {
  setupFetchMocks();
  renderBuilder();
  // After fetch, dropdowns should appear
  await waitFor(() => expect(screen.getByText(/Task Portfolio Setup/i)).toBeInTheDocument());
});

test('"Add to List" is disabled when service or team member not selected', async () => {
  setupFetchMocks();
  renderBuilder();
  await waitFor(() => screen.getByText(/Task Portfolio Setup/i));
  const addBtn = screen.getByRole('button', { name: /Add to List/i });
  expect(addBtn).toBeDisabled();
});

test('"Generate Tasks" is disabled when no services added', async () => {
  setupFetchMocks();
  renderBuilder();
  await waitFor(() => screen.getByText(/Task Portfolio Setup/i));
  const generateBtn = screen.getByRole('button', { name: /Generate Tasks/i });
  expect(generateBtn).toBeDisabled();
});

test('"Skip for now" calls onDone with "skipped"', async () => {
  setupFetchMocks();
  const onDone = jest.fn();
  renderBuilder({ onDone });
  await waitFor(() => screen.getByText(/Task Portfolio Setup/i));
  fireEvent.click(screen.getByRole('button', { name: /Skip for now/i }));
  expect(onDone).toHaveBeenCalledWith('skipped');
});
```

- [ ] **Step 1.2: Run tests to confirm they fail**

```bash
cd C:/Users/User/GodsOffice/client
npx react-scripts test --watchAll=false --testPathPattern=PortfolioBuilder --verbose 2>&1 | tail -20
```

Expected: FAIL — `Cannot find module './PortfolioBuilder'`

- [ ] **Step 1.3: Implement PortfolioBuilder**

Create `client/src/components/PortfolioBuilder.js`:

```js
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, CircularProgress, Alert, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Autocomplete, TextField, Chip,
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon, Bolt as BoltIcon } from '@mui/icons-material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

// ---------- helpers ----------

const getFinancialYear = (date) => {
  const d = dayjs(date);
  const year = d.year();
  const month = d.month(); // 0 = Jan
  if (month < 3) {
    return `FY ${year - 1}-${String(year % 100).padStart(2, '0')}`;
  }
  return `FY ${year}-${String((year + 1) % 100).padStart(2, '0')}`;
};

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

// ---------- component ----------

const PortfolioBuilder = ({ clientCode, onDone }) => {
  const [services, setServices] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // row form
  const [selectedService, setSelectedService] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [startDate, setStartDate] = useState(dayjs());

  // list
  const [addedRows, setAddedRows] = useState([]);
  const [rowError, setRowError] = useState('');

  // generation
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [genErrors, setGenErrors] = useState([]);
  const [genSuccess, setGenSuccess] = useState('');

  // Fetch services + team members on mount
  useEffect(() => {
    const load = async () => {
      setFetchLoading(true);
      setFetchError('');
      try {
        const [svcRes, teamRes] = await Promise.all([
          fetch(`${process.env.REACT_APP_API_URL}/tasks/services`, { headers: authHeader() }),
          fetch(`${process.env.REACT_APP_API_URL}/teams`, { headers: authHeader() }),
        ]);
        if (!svcRes.ok) throw new Error('Failed to load services');
        if (!teamRes.ok) throw new Error('Failed to load team members');
        const [svcData, teamData] = await Promise.all([svcRes.json(), teamRes.json()]);
        setServices(svcData || []);
        setTeamMembers(teamData.data || teamData || []);
      } catch (err) {
        setFetchError(err.message || 'Failed to load data');
      } finally {
        setFetchLoading(false);
      }
    };
    load();
  }, []);

  const handleAddRow = () => {
    setRowError('');
    if (!selectedService || !selectedMember || !startDate || !dayjs(startDate).isValid()) {
      setRowError('Please select a service, team member, and valid start date.');
      return;
    }
    // Duplicate check within already-added rows
    if (addedRows.some(
      (r) => r.serviceCode === selectedService.serviceCode &&
             getFinancialYear(r.startDate) === getFinancialYear(startDate)
    )) {
      setRowError('This service is already added for the same financial year.');
      return;
    }
    setAddedRows((prev) => [
      ...prev,
      {
        id: Date.now(),
        serviceCode: selectedService.serviceCode,
        serviceName: selectedService.serviceName,
        frequency: selectedService.frequency,
        teamMemberId: selectedMember.teamMemberId,
        teamMemberName: selectedMember.name,
        startDate,
      },
    ]);
    // Reset row form
    setSelectedService(null);
    setSelectedMember(null);
    setStartDate(dayjs());
  };

  const handleRemoveRow = (id) => setAddedRows((prev) => prev.filter((r) => r.id !== id));

  const handleGenerate = async () => {
    setGenerating(true);
    setProgress(0);
    setGenErrors([]);
    setGenSuccess('');

    const errors = [];
    let totalCreated = 0;

    for (let i = 0; i < addedRows.length; i++) {
      const row = addedRows[i];
      const fy = getFinancialYear(row.startDate);
      const startISO = dayjs(row.startDate).toISOString();

      // 1. Generate tasks
      const genRes = await fetch(`${process.env.REACT_APP_API_URL}/tasks/generate-new`, {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({
          clientCode,
          serviceCode: row.serviceCode,
          teamMemberId: row.teamMemberId,
          startDate: startISO,
          financialYear: fy,
        }),
      });
      const genData = await genRes.json();
      if (genRes.ok) {
        totalCreated += genData.tasksCreated || (genData.tasks || []).length || 0;
        // 2. Create ClientService record
        const csRes = await fetch(`${process.env.REACT_APP_API_URL}/tasks/clientservices`, {
          method: 'POST',
          headers: authHeader(),
          body: JSON.stringify({
            clientCode,
            serviceCode: row.serviceCode,
            teamMemberId: row.teamMemberId,
            startDate: startISO,
            financialYear: fy,
          }),
        });
        if (!csRes.ok && csRes.status !== 400) {
          const csData = await csRes.json();
          errors.push(`ClientService for ${row.serviceCode}: ${csData.message}`);
        }
      } else {
        errors.push(`${row.serviceCode}: ${genData.message || 'Failed to generate tasks'}`);
      }

      setProgress(Math.round(((i + 1) / addedRows.length) * 100));
    }

    setGenerating(false);
    setGenErrors(errors);

    if (errors.length === 0) {
      setGenSuccess(`${totalCreated} task(s) generated for ${addedRows.length} service(s).`);
      setTimeout(() => onDone('generated'), 1200);
    } else {
      setGenSuccess(
        totalCreated > 0
          ? `${totalCreated} task(s) generated. Some services had errors — see below.`
          : ''
      );
      // Still call onDone after partial success so user isn't stuck
      setTimeout(() => onDone('generated'), 2000);
    }
  };

  const handleSkip = () => onDone('skipped');

  if (fetchLoading) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }} color="text.secondary">Loading services…</Typography>
      </Box>
    );
  }

  if (fetchError) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {fetchError}
        <Button size="small" sx={{ ml: 2 }} onClick={handleSkip}>Skip portfolio setup</Button>
      </Alert>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          Task Portfolio Setup
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Add the services this client is subscribed to. Tasks will be generated immediately.
          You can also skip this and set up the portfolio later from Task Management.
        </Typography>

        {/* Row form */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <Autocomplete
              options={services}
              value={selectedService}
              onChange={(_, v) => setSelectedService(v)}
              getOptionLabel={(o) => `${o.serviceCode} — ${o.serviceName}`}
              isOptionEqualToValue={(a, b) => a.serviceCode === b.serviceCode}
              sx={{ minWidth: 260 }}
              renderInput={(params) => <TextField {...params} label="Service" size="small" />}
              renderOption={(props, option) => {
                const { key, ...rest } = props;
                return (
                  <li key={key} {...rest}>
                    {option.serviceCode} — {option.serviceName}
                    <Chip label={option.frequency} size="small" sx={{ ml: 1 }} />
                  </li>
                );
              }}
            />
            <Autocomplete
              options={teamMembers}
              value={selectedMember}
              onChange={(_, v) => setSelectedMember(v)}
              getOptionLabel={(o) => o.name}
              isOptionEqualToValue={(a, b) => a.teamMemberId === b.teamMemberId}
              sx={{ minWidth: 200 }}
              renderInput={(params) => <TextField {...params} label="Team Member" size="small" />}
            />
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={(v) => setStartDate(v)}
              slotProps={{ textField: { size: 'small', sx: { width: 160 } } }}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddRow}
              disabled={!selectedService || !selectedMember || !startDate}
              sx={{ mt: 0.5 }}
            >
              Add to List
            </Button>
          </Box>
          {rowError && <Alert severity="error" sx={{ mt: 1 }}>{rowError}</Alert>}
        </Paper>

        {/* Added services table */}
        {addedRows.length > 0 ? (
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Service</TableCell>
                  <TableCell>Frequency</TableCell>
                  <TableCell>Assignee</TableCell>
                  <TableCell>Start Date</TableCell>
                  <TableCell>FY</TableCell>
                  <TableCell align="center">Remove</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {addedRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.serviceCode} — {row.serviceName}</TableCell>
                    <TableCell><Chip label={row.frequency} size="small" /></TableCell>
                    <TableCell>{row.teamMemberName}</TableCell>
                    <TableCell>{dayjs(row.startDate).format('DD-MMM-YYYY')}</TableCell>
                    <TableCell>{getFinancialYear(row.startDate)}</TableCell>
                    <TableCell align="center">
                      <IconButton size="small" color="error" onClick={() => handleRemoveRow(row.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic' }}>
            No services added yet.
          </Typography>
        )}

        {/* Generation progress */}
        {generating && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress variant="determinate" value={progress} sx={{ mb: 1, borderRadius: 1 }} />
            <Typography variant="caption" color="text.secondary">
              Generating tasks… {progress}%
            </Typography>
          </Box>
        )}

        {genSuccess && <Alert severity="success" sx={{ mb: 2 }}>{genSuccess}</Alert>}

        {genErrors.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>Some errors occurred:</strong>
            <ul style={{ margin: '4px 0 0 0', paddingLeft: 16 }}>
              {genErrors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </Alert>
        )}

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
          <Button
            variant="contained"
            startIcon={generating ? <CircularProgress size={18} color="inherit" /> : <BoltIcon />}
            onClick={handleGenerate}
            disabled={addedRows.length === 0 || generating}
          >
            {generating ? 'Generating…' : 'Generate Tasks'}
          </Button>
          <Button variant="outlined" onClick={handleSkip} disabled={generating}>
            Skip for now
          </Button>
        </Box>
      </Box>
    </LocalizationProvider>
  );
};

export default PortfolioBuilder;
```

- [ ] **Step 1.4: Run tests to confirm they pass**

```bash
cd C:/Users/User/GodsOffice/client
npx react-scripts test --watchAll=false --testPathPattern=PortfolioBuilder --verbose 2>&1 | tail -30
```

Expected: All 4 tests PASS.

- [ ] **Step 1.5: Commit**

```bash
cd C:/Users/User/GodsOffice
git add client/src/components/PortfolioBuilder.js client/src/components/PortfolioBuilder.test.js
git commit -m "feat: add PortfolioBuilder component for task portfolio setup"
```

---

## Task 2: Wire AddClientPage with two-step stepper

**Files:**
- Modify: `client/src/pages/AddClientPage.js`

---

- [ ] **Step 2.1: Add state and stepper imports**

At the top of `AddClientPage.js`, add to the existing MUI import block:

```js
import {
  // ... existing imports ...
  Stepper,
  Step,
  StepLabel,
} from "@mui/material";
```

Add the PortfolioBuilder import after the existing imports:

```js
import PortfolioBuilder from "../components/PortfolioBuilder";
```

- [ ] **Step 2.2: Add activeStep and savedClientCode state**

Inside the `AddClientPage` component, after the existing state declarations (around line 128), add:

```js
const [activeStep, setActiveStep] = useState(0);
const [savedClientCode, setSavedClientCode] = useState("");
```

- [ ] **Step 2.3: Modify handleSubmit success branch**

In `handleSubmit`, replace the success branch (the `if (response.ok)` block, currently lines 393–430 of the original file) with:

```js
if (response.ok) {
  // Store the new client's code and advance to Step 2
  setSavedClientCode(data.client.clientCode);
  setActiveStep(1);
  window.scrollTo({ top: 0, behavior: "smooth" });
} else {
```

Remove the old `setSuccess`, form reset, and `setTimeout` that was inside `if (response.ok)` — they are replaced by the stepper advancement. The reset is no longer needed because the form won't be revisited in the same session.

- [ ] **Step 2.4: Add the Stepper and conditional render**

In the JSX, **replace** the existing page header block (the `<Box>` containing "Add New Client" heading and navigation buttons) with the following — it adds the stepper above the existing header:

```jsx
{/* Two-step progress indicator */}
<Stepper activeStep={activeStep} sx={{ mb: 3 }}>
  <Step completed={activeStep > 0}>
    <StepLabel>Client Details</StepLabel>
  </Step>
  <Step>
    <StepLabel>Task Portfolio</StepLabel>
  </Step>
</Stepper>

{/* Header with navigation */}
<Box
  sx={{
    display: "flex",
    flexDirection: { xs: "column", sm: "row" },
    justifyContent: { xs: "flex-start", sm: "space-between" },
    alignItems: { xs: "flex-start", sm: "center" },
    gap: { xs: 2, sm: 0 },
    mb: 3,
  }}
>
  <Typography variant="h4" sx={{ fontWeight: 800 }}>
    {activeStep === 0 ? "Add New Client" : "Set Up Task Portfolio"}
  </Typography>

  <Box sx={{ display: "flex", gap: 1.5 }}>
    <Button
      startIcon={<ArrowBackIcon />}
      onClick={() => navigate("/clients")}
      variant="outlined"
      size="small"
    >
      Back to Clients
    </Button>
    <Button
      startIcon={<DashboardIcon />}
      onClick={() => navigate("/dashboard")}
      variant="contained"
      color="primary"
      size="small"
    >
      Dashboard
    </Button>
  </Box>
</Box>
```

- [ ] **Step 2.5: Add Step 2 body**

At the very bottom of the JSX, just before the closing `</Container>`, add the Step 2 conditional render:

```jsx
{/* Step 2: Portfolio setup */}
{activeStep === 1 && (
  <Paper variant="outlined" sx={{ p: 3, mt: 2 }}>
    <PortfolioBuilder
      clientCode={savedClientCode}
      onDone={() => navigate(`/clients/${savedClientCode}/profile`)}
    />
  </Paper>
)}
```

Also wrap the existing Step 1 form `<Box component="form" ...>` so it hides in Step 2. Find the opening of the form box and change it:

```jsx
{/* Step 1: Client details form */}
{activeStep === 0 && (
  <Box component="form" onSubmit={handleSubmit}>
    {/* ... all existing form JSX unchanged ... */}
  </Box>
)}
```

> Note: The subtitle text (`"Enter client details, assign group (optional), and set start date."`) and any `success`/`errors.server` alerts inside the form are unchanged — they remain inside the `activeStep === 0` block.

- [ ] **Step 2.6: Manual smoke test**

1. Run the dev server: `cd C:/Users/User/GodsOffice/client && npm start`
2. Navigate to Add Client page — confirm the stepper shows "Client Details" as active.
3. Fill in required fields (clientCode, clientName, firmName, address) and submit.
4. Confirm the stepper advances to "Task Portfolio" and the `PortfolioBuilder` form appears.
5. Add one or two services and click "Generate Tasks" — confirm tasks are generated and the page navigates to the client profile.
6. Repeat test using "Skip for now" — confirm navigation to client profile occurs immediately.

- [ ] **Step 2.7: Commit**

```bash
cd C:/Users/User/GodsOffice
git add client/src/pages/AddClientPage.js
git commit -m "feat: convert AddClientPage to two-step wizard with portfolio setup"
```
