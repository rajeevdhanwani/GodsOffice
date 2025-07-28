// client/src/App.js - CORRECTED VERSION WITH PROPER THEMING
import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import WelcomePage from "./pages/WelcomePage";
import LoginPage from "./pages/LoginPage";
import ClientManagementPage from "./pages/ClientManagementPage";
import AddClientPage from "./pages/AddClientPage";
import UpdateClientPage from "./pages/UpdateClientPage";
import ClientInfoPage from "./pages/ClientInfoPage";
import AdminAreaPage from "./pages/AdminAreaPage";
import UserManagementPage from "./pages/UserManagementPage";
import UploadMasterFilesPage from "./pages/UploadMasterFilesPage";
import TaskManagementPage from "./pages/TaskManagementPage";
import NewTaskPage from "./pages/NewTaskPage";
import TaskMasterPage from "./pages/TaskMasterPage";
import ManageServiceOptionsPage from "./pages/ManageServiceOptionsPage";
import InwardRecordsPage from "./pages/InwardRecordsPage";
import AdminStages from "./pages/AdminStages";
import RecordsManagementPage from "./pages/RecordsManagementPage";
import OutwardRecordsPage from "./pages/OutwardRecordsPage";
import AdminPanelPage from "./pages/AdminPanelPage";
import InvoiceManagementPage from "./pages/InvoiceManagementPage";
import NewInvoicePage from "./pages/NewInvoicePage";
import InvoiceDetailsPage from "./pages/InvoiceDetailsPage";
import InvoiceSettingsPage from "./pages/InvoiceSettingsPage";
import EditInvoicePage from "./pages/EditInvoicePage";
import ReportsManagementPage from "./pages/ReportsManagementPage";

// Theme imports - MOVED TO TOP LEVEL
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { muiTheme } from "./theme/muiTheme";
import "./styles/animations.css";
import "./App.css";

function App() {
  return (
    // ✅ FIXED: ThemeProvider now wraps the entire application
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <Router>
        <div className="App">
          <Routes>
            {/* Main Pages */}
            <Route path="/" element={<WelcomePage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Client Management */}
            <Route path="/clients" element={<ClientManagementPage />} />
            <Route path="/clients/add" element={<AddClientPage />} />
            <Route path="/clients/update" element={<UpdateClientPage />} />
            <Route path="/clients/info" element={<ClientInfoPage />} />

            {/* Main Admin Area (Global App Settings) */}
            <Route path="/admin" element={<AdminAreaPage />} />
            <Route path="/admin/users" element={<UserManagementPage />} />
            <Route path="/admin/upload" element={<UploadMasterFilesPage />} />
            <Route
              path="/admin/services"
              element={<ManageServiceOptionsPage />}
            />
            <Route path="/admin/stages" element={<AdminStages />} />
            <Route path="/admin/settings" element={<InvoiceSettingsPage />} />

            {/* Task Management */}
            <Route path="/tasks" element={<TaskManagementPage />} />
            <Route path="/tasks/new" element={<NewTaskPage />} />
            <Route path="/tasks/master" element={<TaskMasterPage />} />

            {/* Records Management */}
            <Route path="/records" element={<RecordsManagementPage />} />
            <Route path="/records/inward" element={<InwardRecordsPage />} />
            <Route path="/records/outward" element={<OutwardRecordsPage />} />
            <Route path="/records/admin" element={<AdminPanelPage />} />

            {/* ✅ FIXED: Invoice Management - Clean routing without nested ThemeProvider */}
            <Route path="/invoices" element={<InvoiceManagementPage />} />
            <Route path="/invoices/new" element={<NewInvoicePage />} />
            <Route path="/invoices/:id/edit" element={<EditInvoicePage />} />
            <Route path="/invoices/:id" element={<InvoiceDetailsPage />} />

            {/* Reports Management */}
            <Route path="/reports" element={<ReportsManagementPage />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
