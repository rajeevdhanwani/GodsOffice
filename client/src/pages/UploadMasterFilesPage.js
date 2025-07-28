import React, { useState, useEffect, useRef } from "react";
import {
  Container,
  Typography,
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Alert,
  TextField,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TableFooter,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import Lock from "@mui/icons-material/Lock";
import LockOpen from "@mui/icons-material/LockOpen";
import Papa from "papaparse";
import "../styles/UploadMasterFilesPage.css";

// Styled components
const ProfessionalCard = styled(Box)(({ theme }) => ({
  borderRadius: 16,
  background: "rgba(255, 255, 255, 0.98)",
  backdropFilter: "blur(20px)",
  border: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(4),
  boxShadow: theme.shadows[3],
  transition: theme.transitions.create(["transform", "box-shadow"]),
  "&:hover": {
    transform: "translateY(-4px)",
    boxShadow: theme.shadows[5],
  },
}));

const StyledButton = styled(Button)(({ theme }) => ({
  borderRadius: 12,
  fontWeight: 600,
  textTransform: "none",
  padding: "12px 24px",
  transition: theme.transitions.create(["transform", "box-shadow"]),
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: theme.shadows[4],
  },
}));

const validateTeamCSV = (file, callback) => {
  const errors = [];
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (result) => {
      const requiredFields = ["teamMemberId", "name", "role", "contact"];
      const data = result.data;
      data.forEach((row, index) => {
        requiredFields.forEach((field) => {
          if (!row[field] || row[field].trim() === "") {
            errors.push(`Row ${index + 2}: Missing or empty ${field}`);
          }
        });
        if (row.contact && !/^\d{10}$/.test(row.contact)) {
          errors.push(`Row ${index + 2}: Invalid contact (must be 10 digits)`);
        }
        if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
          errors.push(`Row ${index + 2}: Invalid email format`);
        }
      });
      callback(errors);
    },
    error: (err) => {
      errors.push(`Failed to parse CSV: ${err.message}`);
      callback(errors);
    },
  });
};

const validateClientCSV = (file, callback) => {
  const errors = [];
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (result) => {
      const requiredFields = [
        "clientCode",
        "clientName",
        "firmName",
        "contact",
      ];
      const data = result.data;
      data.forEach((row, index) => {
        requiredFields.forEach((field) => {
          if (!row[field] || row[field].trim() === "") {
            errors.push(`Row ${index + 2}: Missing or empty ${field}`);
          }
        });
        if (row.contact && !/^\d{10}$/.test(row.contact)) {
          errors.push(`Row ${index + 2}: Invalid contact (must be 10 digits)`);
        }
        if (row.gstin && !/^[A-Z0-9]{15}$/.test(row.gstin)) {
          errors.push(
            `Row ${
              index + 2
            }: Invalid GSTIN (must be 15 alphanumeric characters)`
          );
        }
        if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
          errors.push(`Row ${index + 2}: Invalid email format`);
        }
        if (row.withUsSince && isNaN(new Date(row.withUsSince).getTime())) {
          errors.push(
            `Row ${index + 2}: Invalid withUsSince date (use YYYY-MM-DD)`
          );
        }
      });
      callback(errors);
    },
    error: (err) => {
      errors.push(`Failed to parse CSV: ${err.message}`);
      callback(errors);
    },
  });
};

const validateServiceCSV = (file, callback) => {
  const errors = [];
  const validFrequencies = [
    "Yearly",
    "Quarterly",
    "Monthly",
    "Weekly",
    "On Demand",
  ];
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (result) => {
      const requiredFields = [
        "serviceCode",
        "serviceName",
        "frequency",
        "assignmentDates",
        "dueDate",
        "shiftNextPeriod",
        "repetitive",
      ];
      const data = result.data;
      data.forEach((row, index) => {
        requiredFields.forEach((field) => {
          if (!row[field] || row[field].trim() === "") {
            errors.push(`Row ${index + 2}: Missing or empty ${field}`);
          }
        });
        if (!validFrequencies.includes(row.frequency)) {
          errors.push(
            `Row ${
              index + 2
            }: Invalid frequency (must be one of ${validFrequencies.join(
              ", "
            )})`
          );
        }
        const assignmentDates =
          row.assignmentDates?.split(",").map((d) => d.trim()) || [];
        if (assignmentDates.length === 0) {
          errors.push(
            `Row ${index + 2}: At least one assignment date is required`
          );
        } else if (row.frequency === "Yearly") {
          if (
            assignmentDates.length !== 1 ||
            !assignmentDates[0]?.match(/^\d{1,2}-[A-Za-z]{3}$/)
          ) {
            errors.push(
              `Row ${
                index + 2
              }: Invalid assignmentDates (use single dd-MMM, e.g., 01-Jun)`
            );
          }
        } else if (
          row.frequency === "Monthly" ||
          row.frequency === "Quarterly"
        ) {
          if (
            assignmentDates.length !== 1 ||
            isNaN(parseInt(assignmentDates[0])) ||
            parseInt(assignmentDates[0]) < 1 ||
            parseInt(assignmentDates[0]) > 31
          ) {
            errors.push(
              `Row ${
                index + 2
              }: Invalid assignmentDates (must be single day 1-31)`
            );
          }
        } else if (row.frequency === "Weekly") {
          if (
            assignmentDates.some(
              (d) => isNaN(parseInt(d)) || parseInt(d) < 1 || parseInt(d) > 31
            )
          ) {
            errors.push(
              `Row ${
                index + 2
              }: Invalid assignmentDates (must be comma-separated days 1-31)`
            );
          }
        } else if (
          row.frequency === "On Demand" &&
          row.assignmentDates !== "On Task Generation"
        ) {
          errors.push(
            `Row ${
              index + 2
            }: assignmentDates for On Demand must be 'On Task Generation'`
          );
        }
        if (row.dueDate) {
          if (
            row.frequency === "Yearly" &&
            !row.dueDate.match(/^\d{1,2}-[A-Za-z]{3}$/)
          ) {
            errors.push(
              `Row ${index + 2}: Invalid dueDate (use dd-MMM, e.g., 31-Jul)`
            );
          } else if (
            (row.frequency === "Monthly" || row.frequency === "Quarterly") &&
            (isNaN(parseInt(row.dueDate)) ||
              parseInt(row.dueDate) < 1 ||
              parseInt(row.dueDate) > 31)
          ) {
            errors.push(
              `Row ${index + 2}: dueDate must be a day number (1-31)`
            );
          } else if (
            (row.frequency === "Weekly" || row.frequency === "On Demand") &&
            !row.dueDate.match(/^\d+ days$/)
          ) {
            errors.push(
              `Row ${
                index + 2
              }: dueDate must be in 'N days' format (e.g., 7 days)`
            );
          }
        }
        if (!["Yes", "No"].includes(row.shiftNextPeriod)) {
          errors.push(`Row ${index + 2}: Invalid shiftNextPeriod (use Yes/No)`);
        }
        if (!["Yes", "No"].includes(row.repetitive)) {
          errors.push(`Row ${index + 2}: Invalid repetitive (use Yes/No)`);
        }
        if (row.frequency === "Weekly" && row.shiftNextPeriod === "Yes") {
          errors.push(
            `Row ${index + 2}: Weekly services cannot shift to next period`
          );
        }
        if (row.frequency === "On Demand" && row.shiftNextPeriod === "Yes") {
          errors.push(
            `Row ${index + 2}: On-Demand services cannot shift to next period`
          );
        }
        if (row.sacCode && !/^\d{6}$/.test(row.sacCode)) {
          errors.push(`Row ${index + 2}: Invalid sacCode (must be 6 digits)`);
        }
        if (
          row.priority &&
          !["Low", "Medium", "High", "Critical"].includes(row.priority)
        ) {
          errors.push(
            `Row ${
              index + 2
            }: Invalid priority (must be Low, Medium, High, or Critical)`
          );
        }
      });
      callback(errors);
    },
    error: (err) => {
      errors.push(`Failed to parse CSV: ${err.message}`);
      callback(errors);
    },
  });
};

const validateClientServiceCSV = (file, callback) => {
  const errors = [];
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (result) => {
      const requiredFields = [
        "clientCode",
        "clientName",
        "servicesGiven",
        "teamMemberName",
        "financialYear",
      ];
      const data = result.data;
      const seen = new Set();
      data.forEach((row, index) => {
        console.log(`Row ${index + 2} data:`, row);
        requiredFields.forEach((field) => {
          if (!row[field] || row[field].trim() === "") {
            errors.push(`Row ${index + 2}: Missing or empty ${field}`);
          }
        });
        if (row.financialYear && !/^FY \d{4}-\d{2}$/.test(row.financialYear)) {
          errors.push(
            `Row ${index + 2}: Invalid financialYear (use FY YYYY-YY)`
          );
        }
        if (row.startDate && !/^\d{4}-\d{2}-\d{2}$/.test(row.startDate)) {
          errors.push(`Row ${index + 2}: Invalid startDate (use YYYY-MM-DD)`);
        }
        const key = `${row.clientCode}-${row.servicesGiven}-${row.financialYear}`;
        if (seen.has(key)) {
          errors.push(
            `Row ${index + 2}: Duplicate clientCode ${
              row.clientCode
            }, servicesGiven ${row.servicesGiven}, financialYear ${
              row.financialYear
            }`
          );
        } else {
          seen.add(key);
        }
      });
      callback(errors);
    },
    error: (err) => {
      errors.push(`Failed to parse CSV: ${err.message}`);
      callback(errors);
    },
  });
};

const UploadMasterFilesPage = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [teamFile, setTeamFile] = useState(null);
  const [clientFile, setClientFile] = useState(null);
  const [serviceFile, setServiceFile] = useState(null);
  const [clientServiceFile, setClientServiceFile] = useState(null);
  const [imported, setImported] = useState({
    teams: false,
    clients: false,
    services: false,
    clientservices: false,
    tasks: false,
  });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState([]);
  const [success, setSuccess] = useState("");
  const [taskGenerationResults, setTaskGenerationResults] = useState([]);
  const [taskGenerationErrors, setTaskGenerationErrors] = useState([]);
  const [failedTasks, setFailedTasks] = useState([]);
  const [taskSummary, setTaskSummary] = useState({});
  const [isImportLocked, setIsImportLocked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [clientValidationErrors, setClientValidationErrors] = useState([]);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [lockDialogOpen, setLockDialogOpen] = useState(false);
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [lockDetails, setLockDetails] = useState({});
  const [uploadProgress, setUploadProgress] = useState(0);

  const teamFileRef = useRef(null);
  const clientFileRef = useRef(null);
  const serviceFileRef = useRef(null);
  const clientServiceFileRef = useRef(null);

  const navigate = useNavigate();

  const steps = [
    "Upload Teams",
    "Upload Clients",
    "Upload Services",
    "Upload Client Services",
    "Generate Tasks",
    "Review",
  ];

  useEffect(() => {
    if (error.length > 0) {
      const timer = setTimeout(() => setError([]), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const checkCollectionStatus = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(
        "http://localhost:5000/api/tasks/upload/status",
        {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        }
      );
      const data = await response.json();
      if (response.ok) {
        const newImported = {
          teams: data.teams > 0,
          clients: data.clients > 0,
          services: data.services > 0,
          clientservices: data.clientservices > 0,
          tasks: data.tasks > 0,
        };
        setImported(newImported);
        if (newImported.tasks) {
          setActiveStep(5);
        } else if (newImported.clientservices) {
          setActiveStep(4);
        } else if (newImported.services) {
          setActiveStep(3);
        } else if (newImported.clients) {
          setActiveStep(2);
        } else if (newImported.teams) {
          setActiveStep(1);
        } else {
          setActiveStep(0);
        }
      } else {
        setError([data.message || "Failed to check collection status"]);
      }
    } catch (err) {
      setError(["Server error: " + err.message]);
    }
  };

  useEffect(() => {
    const fetchLockStatus = async () => {
      const token = localStorage.getItem("token");
      try {
        const response = await fetch(
          "http://localhost:5000/api/imports/import-lock",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await response.json();
        if (response.ok) {
          setIsImportLocked(data.isLocked || false);
          setLockDetails({
            lockedBy: data.lockedBy || "Unknown",
            lockedAt: data.lastUpdate || null,
          });
        } else {
          setError([data.message || "Failed to fetch lock status"]);
        }
      } catch (err) {
        setError(["Server error: " + err.message]);
      }
    };

    const fetchUserDetails = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setError(["Please log in to access this page"]);
        navigate("/login");
        return;
      }
      try {
        const response = await fetch("http://localhost:5000/api/auth/user", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok) {
          setIsAdmin(data.isAdmin || false);
          localStorage.setItem("username", data.username || "Unknown");
        } else {
          if (
            data.message === "Invalid token" ||
            data.message.includes("expired")
          ) {
            localStorage.removeItem("token");
            setError(["Your session has expired. Please log in again."]);
            navigate("/login");
          } else {
            setError([data.message || "Failed to fetch user details"]);
          }
        }
      } catch (err) {
        setError(["Server error: " + err.message]);
        if (err.message.includes("jwt expired")) {
          localStorage.removeItem("token");
          setError(["Your session has expired. Please log in again."]);
          navigate("/login");
        }
      }
    };

    fetchLockStatus();
    fetchUserDetails();
    checkCollectionStatus();
  }, [navigate]);

  const handleDownloadErrorCSV = (errors, filename) => {
    const csvRows = ["Row,Message"];
    errors.forEach((err, index) => {
      const row = err.row || index + 2;
      const message = String(err.message || err || "Unknown error");
      csvRows.push(`${row},"${message.replace(/"/g, '""')}"`);
    });
    const csv = csvRows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadDetailedCSV = (timestamp = "") => {
    const csvRows = [
      "ClientCode,ClientName,ServiceCode,ServiceName,TeamMemberName,FinancialYear,ServicePeriod,AssignmentDates,Status,Message",
    ];
    taskGenerationResults.forEach((result) => {
      const row = [
        result.clientCode || "N/A",
        result.clientName || "N/A",
        result.serviceCode || "N/A",
        result.serviceName || "N/A",
        result.teamMemberName || "N/A",
        result.financialYear || "N/A",
        result.servicePeriod || "N/A",
        result.assignmentDates || "N/A",
        result.status || "N/A",
        result.message || "N/A",
      ].map((field) => `"${field.replace(/"/g, '""')}"`);
      csvRows.push(row.join(","));
    });
    const csv = csvRows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `detailed_task_results${timestamp ? "_" + timestamp : ""}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadSummaryCSV = (timestamp = "") => {
    const csvRows = ["ServiceCode,ServiceName,TaskCount,ClientCount"];
    Object.values(taskSummary)
      .filter((entry) => entry.serviceCode)
      .forEach((entry) => {
        const row = [
          entry.serviceCode,
          entry.serviceName,
          entry.taskCount,
          entry.clientCount,
        ].map((field) => `"${field.replace(/"/g, '""')}"`);
        csvRows.push(row.join(","));
      });
    csvRows.push(`"Generated on: ${taskSummary.timestamp || "N/A"}"`);
    const csv = csvRows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `task_summary${timestamp ? "_" + timestamp : ""}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleFileChange = (setFileFunc, fileRef, validator) => (event) => {
    const selectedFile = event.target.files[0];
    setClientValidationErrors([]);
    setError([]);
    setSuccess("");
    if (!selectedFile) {
      setFileFunc(null);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    if (
      selectedFile.type !== "text/csv" &&
      !selectedFile.name.endsWith(".csv")
    ) {
      setError(["Please upload a valid CSV file"]);
      setClientValidationErrors([]);
      setFileFunc(null);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    if (selectedFile.size === 0) {
      setError(["File is empty"]);
      setClientValidationErrors([]);
      setFileFunc(null);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    validator(selectedFile, (errors) => {
      setClientValidationErrors(errors);
      if (errors.length === 0) {
        setFileFunc(selectedFile);
        setError([]);
        setSuccess("");
      } else {
        setFileFunc(null);
        if (fileRef.current) fileRef.current.value = "";
      }
    });
  };

  const handleSubmit =
    (file, endpoint, setFileFunc, fileRef) => async (event) => {
      event.preventDefault();
      if (!file) {
        setError(["No file selected"]);
        return;
      }
      setUploading(true);
      setError([]);
      setSuccess("");
      setUploadProgress(0);
      const token = localStorage.getItem("token");
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (result) => {
          const chunkSize = 100;
          let totalImported = 0;
          let totalAlreadyExist = 0;
          for (let i = 0; i < result.data.length; i += chunkSize) {
            const chunk = result.data.slice(i, i + chunkSize);
            const formData = new FormData();
            formData.append(
              "file",
              new Blob([Papa.unparse(chunk)], { type: "text/csv" })
            );
            try {
              const response = await fetch(
                `http://localhost:5000/api/imports/${endpoint}`,
                {
                  method: "POST",
                  body: formData,
                  headers: { Authorization: `Bearer ${token}` },
                }
              );
              const data = await response.json();
              if (!response.ok) {
                setError(
                  data.errors
                    ? data.errors.map(
                        (err) => `Row ${err.row + i}: ${err.message}`
                      )
                    : [data.message || "Upload failed"]
                );
                setUploading(false);
                return;
              }
              totalImported += data.results ? data.results.length : 0;
              totalAlreadyExist += data.alreadyExists
                ? data.alreadyExists.length
                : 0;
              setUploadProgress(((i + chunkSize) / result.data.length) * 100);
            } catch (err) {
              setError(["Server error: " + err.message]);
              setUploading(false);
              return;
            }
          }
          const entity = endpoint.split("/")[0];
          const entityName =
            {
              teams: "team members",
              clients: "clients",
              services: "services",
              clientservices: "client-service mappings",
            }[entity] || entity;
          setSuccess(
            `${totalImported} ${entityName} uploaded, ${totalAlreadyExist} already exist`
          );
          setImported((prev) => ({ ...prev, [entity]: true }));
          setFileFunc(null);
          if (fileRef.current) fileRef.current.value = "";
          setActiveStep((prev) => prev + 1);
          setUploading(false);
          setUploadProgress(0);
        },
        error: (err) => {
          setError(["Failed to parse CSV: " + err.message]);
          setUploading(false);
        },
      });
    };

  const handleSkipStep = () => {
    setActiveStep((prev) => prev + 1);
    setError([]);
    setSuccess("");
    setClientValidationErrors([]);
  };

  const handleGenerateTasks = async () => {
    setUploading(true);
    setError([]);
    setSuccess("");
    setTaskGenerationErrors([]);
    setFailedTasks([]);
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(
        "http://localhost:5000/api/tasks/generate-existing",
        {
          method: "POST",
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        }
      );
      const data = await response.json();
      if (response.ok) {
        setSuccess(
          `${data.message}. Review the summary below or generate tasks again.`
        );
        setTaskGenerationResults(data.results || []);
        setTaskGenerationErrors(data.errors || []);
        setFailedTasks(data.errors || []);
        if (data.summary && Object.keys(data.summary).length > 0) {
          setTaskSummary({
            ...data.summary,
            timestamp: new Date().toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            }),
          });
        }
        setImported((prev) => ({ ...prev, tasks: true }));
        setActiveStep(5);
      } else {
        setError(
          data.errors
            ? data.errors.map(
                (err) =>
                  `Row ${err.row}: ${err.message} (Client: ${err.clientCode}, Service: ${err.serviceCode})`
              )
            : [data.message || "Task generation failed"]
        );
        setTaskGenerationErrors(data.errors || []);
        setFailedTasks(data.errors || []);
      }
    } catch (err) {
      setError(["Server error: " + err.message]);
    } finally {
      setUploading(false);
    }
  };

  const handleRetryFailedTasks = async () => {
    setUploading(true);
    setError([]);
    setSuccess("");
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(
        "http://localhost:5000/api/tasks/generate-existing",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ failedTasks }),
        }
      );
      const data = await response.json();
      if (response.ok) {
        setSuccess(`${data.message}. Review the updated summary below.`);
        setTaskGenerationResults([
          ...taskGenerationResults,
          ...(data.results || []),
        ]);
        setTaskGenerationErrors(data.errors || []);
        setFailedTasks(data.errors || []);
        if (data.summary && Object.keys(data.summary).length > 0) {
          setTaskSummary({
            ...data.summary,
            timestamp: new Date().toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            }),
          });
        }
      } else {
        setError(
          data.errors
            ? data.errors.map(
                (err) =>
                  `Row ${err.row}: ${err.message} (Client: ${err.clientCode}, Service: ${err.serviceCode})`
              )
            : [data.message || "Task generation failed"]
        );
        setTaskGenerationErrors(data.errors || []);
        setFailedTasks(data.errors || []);
      }
    } catch (err) {
      setError(["Server error: " + err.message]);
    } finally {
      setUploading(false);
    }
  };

  const handleResetCollections = async () => {
    setUploading(true);
    setError([]);
    setSuccess("");
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(
        "http://localhost:5000/api/imports/reset-collections",
        {
          method: "DELETE",
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        }
      );
      const data = await response.json();
      if (response.ok) {
        setSuccess(
          "All collections have been reset successfully. You can start uploading new data."
        );
        setImported({
          teams: false,
          clients: false,
          services: false,
          clientservices: false,
          tasks: false,
        });
        setActiveStep(0);
        setTaskGenerationResults([]);
        setTaskGenerationErrors([]);
        setFailedTasks([]);
        setTaskSummary({});
        setIsImportLocked(false);
        setLockDetails({});
      } else {
        setError([data.message || "Failed to reset collections"]);
      }
    } catch (err) {
      setError(["Server error: " + err.message]);
    } finally {
      setUploading(false);
      setResetDialogOpen(false);
    }
  };

  const handleLockImport = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError(["Please log in to perform this action."]);
      navigate("/login");
      return;
    }
    try {
      const client =
        taskGenerationResults.find((r) => r.clientCode && r.clientName) || {};
      const response = await fetch(
        "http://localhost:5000/api/imports/import-lock",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            isLocked: true,
            clientCode: String(client.clientCode ?? "N/A"),
            clientName: String(client.clientName ?? "N/A"),
            lockedBy: localStorage.getItem("username") ?? "Unknown",
            lastUpdate: new Date().toISOString(),
          }),
        }
      );
      const data = await response.json();
      if (response.ok) {
        setIsImportLocked(true);
        setLockDetails({
          lockedBy: localStorage.getItem("username") ?? "Unknown",
          lockedAt: new Date().toISOString(),
        });
        setSuccess("Task importation locked successfully");
        const now = new Date();
        const timestamp = now
          .toISOString()
          .replace(/[-:T.]/g, "")
          .slice(0, 11);
        handleDownloadDetailedCSV(timestamp);
        handleDownloadSummaryCSV(timestamp);
      } else {
        if (response.status === 403) {
          setError(["Admin access required. Please log in as an admin."]);
          localStorage.removeItem("token");
          navigate("/login");
        } else if (
          response.status === 401 &&
          data.message.includes("expired")
        ) {
          localStorage.removeItem("token");
          setError(["Your session has expired. Please log in again."]);
          navigate("//login");
        } else {
          setError([data.message || "Failed to lock importation"]);
        }
      }
    } catch (err) {
      setError(["Server error: " + err.message]);
      if (err.message.includes("jwt expired")) {
        localStorage.removeItem("token");
        setError(["Your session has expired. Please log in again."]);
        navigate("/login");
      }
    } finally {
      setLockDialogOpen(false);
    }
  };

  const handleUnlockImport = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError(["Please log in to perform this action."]);
      navigate("/login");
      return;
    }
    try {
      const client =
        taskGenerationResults.find((r) => r.clientCode && r.clientName) || {};
      const response = await fetch(
        "http://localhost:5000/api/imports/import-lock",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            isLocked: false,
            clientCode: client.clientCode || "N/A",
            clientName: client.clientName || "N/A",
          }),
        }
      );
      const data = await response.json();
      if (response.ok) {
        setIsImportLocked(false);
        setLockDetails({});
        setSuccess("Task importation unlocked successfully");
      } else {
        if (response.status === 403) {
          setError(["Admin access required. Please log in as an admin."]);
          localStorage.removeItem("token");
          navigate("/login");
        } else if (
          response.status === 401 &&
          data.message.includes("expired")
        ) {
          localStorage.removeItem("token");
          setError(["Your session has expired. Please log in again."]);
          navigate("/login");
        } else {
          setError([data.message || "Failed to unlock importation"]);
        }
      }
    } catch (err) {
      setError(["Server error: " + err.message]);
      if (err.message.includes("jwt expired")) {
        localStorage.removeItem("token");
        setError(["Your session has expired. Please log in again."]);
        navigate("/login");
      }
    } finally {
      setUnlockDialogOpen(false);
    }
  };

  const handleDownloadTemplate = (type) => {
    let csvContent = "";
    switch (type) {
      case "teams":
        csvContent = `teamMemberId,name,role,contact,email\nTM001,John Doe,Manager,9876543210,john.doe@example.com`;
        break;
      case "clients":
        csvContent = `clientCode,groupCode,clientName,firmName,address,gstin,contact,email,withUsSince\nCL001,G001,ABC Corp,ABC Enterprises,123 Main St,22AAAAA0000A1Z5,9876543210,abc@example.com,2023-01-01`;
        break;
      case "services":
        csvContent = `serviceCode,serviceName,sacCode,serviceGroup,frequency,assignmentDates,dueDate,shiftNextPeriod,repetitive,priority,remarks\nGT-1,GSTR-1 - MLY,,Tax,Monthly,1,11,Yes,Yes,Medium,Monthly GSTR filing\nIT-4,IT - TDS RETURN,,Tax,Quarterly,1,30,Yes,Yes,High,TDS return filing\nAC-2,ACCT-WLY-3,,Accounting,Weekly,1,8,15,7 days,No,Yes,Low,Weekly accounting tasks\nAC-5,On-Demand Service,,Accounting,On Demand,On Task Generation,7 days,No,No,Medium,On-demand service\nIT-3,Yearly IT Return,,Tax,Yearly,1-Jun,30-Sep,Yes,Yes,High,Yearly IT filing`;
        break;
      case "clientservices":
        csvContent = `clientCode,clientName,servicesGiven,teamMemberName,startDate,financialYear\nCL001,ABC Corp,Yearly IT Return,John Doe,2025-04-01,FY 2025-26`;
        break;
      default:
        return;
    }
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}_master_template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const renderSummaryTable = () => {
    const summaryEntries = Object.values(taskSummary).filter(
      (entry) => entry.serviceCode
    );
    const totalTasks = summaryEntries.reduce(
      (sum, entry) => sum + entry.taskCount,
      0
    );
    return (
      <ProfessionalCard sx={{ mt: 2, mb: 2 }}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell colSpan={4}>Task Generation Summary</TableCell>
              </TableRow>
              <TableRow>
                <TableCell align="center">SL</TableCell>
                <TableCell>Service Name</TableCell>
                <TableCell align="center">Tasks Generated</TableCell>
                <TableCell align="center">Number of Clients</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {summaryEntries.map((entry, index) => (
                <TableRow key={entry.serviceCode}>
                  <TableCell align="center">{index + 1}</TableCell>
                  <TableCell>{entry.serviceName}</TableCell>
                  <TableCell align="center">{entry.taskCount}</TableCell>
                  <TableCell align="center">{entry.clientCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2} align="right">
                  <strong>Total</strong>
                </TableCell>
                <TableCell align="center">
                  <strong>{totalTasks}</strong>
                </TableCell>
                <TableCell />
              </TableRow>
              {taskSummary.timestamp && (
                <TableRow>
                  <TableCell colSpan={4} align="right">
                    Generated on: {taskSummary.timestamp}
                  </TableCell>
                </TableRow>
              )}
            </TableFooter>
          </Table>
        </TableContainer>
        {taskGenerationErrors.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" color="error">
              Task Generation Errors
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Row</TableCell>
                    <TableCell>Client Code</TableCell>
                    <TableCell>Service Code</TableCell>
                    <TableCell>Service Name</TableCell>
                    <TableCell>Financial Year</TableCell>
                    <TableCell>Error Message</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {taskGenerationErrors.map((err, index) => (
                    <TableRow key={index}>
                      <TableCell>{err.row}</TableCell>
                      <TableCell>{err.clientCode}</TableCell>
                      <TableCell>{err.serviceCode}</TableCell>
                      <TableCell>{err.serviceName}</TableCell>
                      <TableCell>{err.financialYear}</TableCell>
                      <TableCell>{err.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <StyledButton
              variant="outlined"
              color="error"
              onClick={() =>
                handleDownloadErrorCSV(
                  taskGenerationErrors,
                  "task_generation_errors.csv"
                )
              }
              sx={{ mt: 2 }}
            >
              Download Error CSV
            </StyledButton>
          </Box>
        )}
        <Box sx={{ display: "flex", gap: 2, mt: 2, flexWrap: "wrap" }}>
          <StyledButton
            variant="outlined"
            color="primary"
            onClick={() => handleDownloadDetailedCSV()}
            disabled={taskGenerationResults.length === 0}
          >
            Download Detailed Task CSV
          </StyledButton>
          <StyledButton
            variant="outlined"
            color="primary"
            onClick={() => handleDownloadSummaryCSV()}
            disabled={Object.keys(taskSummary).length === 0}
          >
            Download Task Summary CSV
          </StyledButton>
          <StyledButton
            variant="contained"
            color="warning"
            onClick={handleRetryFailedTasks}
            disabled={failedTasks.length === 0 || uploading}
          >
            Retry Failed Tasks
          </StyledButton>
          <StyledButton
            variant="contained"
            color="error"
            onClick={() => setResetDialogOpen(true)}
            disabled={uploading}
          >
            Reset All Collections
          </StyledButton>
          <StyledButton
            variant="outlined"
            color="primary"
            component={Link}
            to="/admin"
          >
            Back to Admin Area
          </StyledButton>
        </Box>
      </ProfessionalCard>
    );
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <ProfessionalCard sx={{ p: 2 }}>
            <Typography variant="h6">Upload Teams Master File</Typography>
            <Typography variant="body2" sx={{ mb: 6 }}>
              Upload a CSV file containing team member details (teamMemberId,
              name, role, contact, email).{" "}
              {imported.teams &&
                "Teams data already exists. You can skip this step."}
            </Typography>
            <form
              onSubmit={handleSubmit(
                teamFile,
                "teams/import",
                setTeamFile,
                teamFileRef
              )}
              encType="multipart/form-data"
            >
              <TextField
                type="file"
                label="Team Master"
                inputProps={{ accept: ".csv" }}
                inputRef={teamFileRef}
                onChange={handleFileChange(
                  setTeamFile,
                  teamFileRef,
                  validateTeamCSV
                )}
                fullWidth
                variant="outlined"
                disabled={imported.teams || uploading || isImportLocked}
                sx={{ mb: 2 }}
              />
              {teamFile && (
                <Typography variant="body2">
                  Selected: {teamFile.name}
                </Typography>
              )}
              {clientValidationErrors.length > 0 && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">
                    Validation Errors:
                  </Typography>
                  <List dense>
                    {clientValidationErrors.map((err, index) => (
                      <ListItem key={index}>
                        <ListItemText primary={err} />
                      </ListItem>
                    ))}
                  </List>
                  <StyledButton
                    variant="outlined"
                    color="error"
                    onClick={() =>
                      handleDownloadErrorCSV(
                        clientValidationErrors,
                        "team_errors.csv"
                      )
                    }
                  >
                    Download Error CSV
                  </StyledButton>
                </Alert>
              )}
              <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                <StyledButton
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={
                    imported.teams ||
                    uploading ||
                    clientValidationErrors.length > 0 ||
                    !teamFile ||
                    isImportLocked
                  }
                >
                  Upload Teams
                </StyledButton>
                {imported.teams && (
                  <StyledButton
                    variant="outlined"
                    color="secondary"
                    onClick={handleSkipStep}
                    disabled={uploading || isImportLocked}
                  >
                    Skip
                  </StyledButton>
                )}
                {uploading && <CircularProgress size={24} />}
                {uploading && (
                  <Box sx={{ mt: 2, width: "100%" }}>
                    <Typography variant="body2">
                      Uploading... {Math.round(uploadProgress)}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={uploadProgress}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        "& .MuiLinearProgress-bar": {
                          background:
                            "linear-gradient(45deg, #4CAF50, #66BB6A)",
                        },
                      }}
                    />
                  </Box>
                )}
                <StyledButton
                  variant="outlined"
                  color="primary"
                  onClick={() => handleDownloadTemplate("teams")}
                  disabled={uploading}
                >
                  Download Template
                </StyledButton>
              </Box>
            </form>
          </ProfessionalCard>
        );
      case 1:
        return (
          <ProfessionalCard sx={{ p: 2 }}>
            <Typography variant="h6">Upload Clients Master File</Typography>
            <Typography variant="body2" sx={{ mb: 6 }}>
              Upload a CSV file containing client details (clientCode,
              groupCode, clientName, firmName, address, gstin, contact, email,
              withUsSince).{" "}
              {imported.clients &&
                "Clients data already exists. You can skip this step."}
            </Typography>
            <form
              onSubmit={handleSubmit(
                clientFile,
                "clients/import",
                setClientFile,
                clientFileRef
              )}
              encType="multipart/form-data"
            >
              <TextField
                type="file"
                label="Client Master"
                inputProps={{ accept: ".csv" }}
                inputRef={clientFileRef}
                onChange={handleFileChange(
                  setClientFile,
                  clientFileRef,
                  validateClientCSV
                )}
                fullWidth
                variant="outlined"
                disabled={
                  !imported.teams ||
                  imported.clients ||
                  uploading ||
                  isImportLocked
                }
                sx={{ mb: 2 }}
              />
              {clientFile && (
                <Typography variant="body2">
                  Selected: {clientFile.name}
                </Typography>
              )}
              {clientValidationErrors.length > 0 && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">
                    Validation Errors:
                  </Typography>
                  <List dense>
                    {clientValidationErrors.map((err, index) => (
                      <ListItem key={index}>
                        <ListItemText primary={err} />
                      </ListItem>
                    ))}
                  </List>
                  <StyledButton
                    variant="outlined"
                    color="error"
                    onClick={() =>
                      handleDownloadErrorCSV(
                        clientValidationErrors,
                        "client_errors.csv"
                      )
                    }
                  >
                    Download Error CSV
                  </StyledButton>
                </Alert>
              )}
              <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                <StyledButton
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={
                    !imported.teams ||
                    imported.clients ||
                    uploading ||
                    clientValidationErrors.length > 0 ||
                    !clientFile ||
                    isImportLocked
                  }
                >
                  Upload Clients
                </StyledButton>
                {imported.clients && (
                  <StyledButton
                    variant="outlined"
                    color="secondary"
                    onClick={handleSkipStep}
                    disabled={uploading || isImportLocked}
                  >
                    Skip
                  </StyledButton>
                )}
                {uploading && <CircularProgress size={24} />}
                {uploading && (
                  <Box sx={{ mt: 2, width: "100%" }}>
                    <Typography variant="body2">
                      Uploading... {Math.round(uploadProgress)}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={uploadProgress}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        "& .MuiLinearProgress-bar": {
                          background:
                            "linear-gradient(45deg, #4CAF50, #66BB6A)",
                        },
                      }}
                    />
                  </Box>
                )}
                <StyledButton
                  variant="outlined"
                  color="primary"
                  onClick={() => handleDownloadTemplate("clients")}
                  disabled={uploading}
                >
                  Download Template
                </StyledButton>
              </Box>
            </form>
          </ProfessionalCard>
        );
      case 2:
        return (
          <ProfessionalCard sx={{ p: 2 }}>
            <Typography variant="h6">Upload Services Master File</Typography>
            <Typography variant="body2" sx={{ mb: 6 }}>
              Upload a CSV file containing service details (serviceCode,
              serviceName, sacCode, serviceGroup, frequency, assignmentDates,
              dueDate, shiftNextPeriod, repetitive, priority, remarks).{" "}
              {imported.services &&
                "Services data already exists. You can skip this step."}
            </Typography>
            <form
              onSubmit={handleSubmit(
                serviceFile,
                "services/import",
                setServiceFile,
                serviceFileRef
              )}
              encType="multipart/form-data"
            >
              <TextField
                type="file"
                label="Service Master"
                inputProps={{ accept: ".csv" }}
                inputRef={serviceFileRef}
                onChange={handleFileChange(
                  setServiceFile,
                  serviceFileRef,
                  validateServiceCSV
                )}
                fullWidth
                variant="outlined"
                disabled={
                  !imported.clients ||
                  imported.services ||
                  uploading ||
                  isImportLocked
                }
                sx={{ mb: 2 }}
              />
              {serviceFile && (
                <Typography variant="body2">
                  Selected: {serviceFile.name}
                </Typography>
              )}
              {clientValidationErrors.length > 0 && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">
                    Validation Errors:
                  </Typography>
                  <List dense>
                    {clientValidationErrors.map((err, index) => (
                      <ListItem key={index}>
                        <ListItemText primary={err} />
                      </ListItem>
                    ))}
                  </List>
                  <StyledButton
                    variant="outlined"
                    color="error"
                    onClick={() =>
                      handleDownloadErrorCSV(
                        clientValidationErrors,
                        "service_errors.csv"
                      )
                    }
                  >
                    Download Error CSV
                  </StyledButton>
                </Alert>
              )}
              <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                <StyledButton
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={
                    !imported.clients ||
                    imported.services ||
                    uploading ||
                    clientValidationErrors.length > 0 ||
                    !serviceFile ||
                    isImportLocked
                  }
                >
                  Upload Services
                </StyledButton>
                {imported.services && (
                  <StyledButton
                    variant="outlined"
                    color="secondary"
                    onClick={handleSkipStep}
                    disabled={uploading || isImportLocked}
                  >
                    Skip
                  </StyledButton>
                )}
                {uploading && <CircularProgress size={24} />}
                {uploading && (
                  <Box sx={{ mt: 2, width: "100%" }}>
                    <Typography variant="body2">
                      Uploading... {Math.round(uploadProgress)}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={uploadProgress}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        "& .MuiLinearProgress-bar": {
                          background:
                            "linear-gradient(45deg, #4CAF50, #66BB6A)",
                        },
                      }}
                    />
                  </Box>
                )}
                <StyledButton
                  variant="outlined"
                  color="primary"
                  onClick={() => handleDownloadTemplate("services")}
                  disabled={uploading}
                >
                  Download Template
                </StyledButton>
              </Box>
            </form>
          </ProfessionalCard>
        );
      case 3:
        return (
          <ProfessionalCard sx={{ p: 2 }}>
            <Typography variant="h6">
              Upload Client Services Master File
            </Typography>
            <Typography variant="body2" sx={{ mb: 6 }}>
              Upload a CSV file mapping clients to services (clientCode,
              clientName, servicesGiven, teamMemberName, startDate,
              financialYear).{" "}
              {imported.clientservices &&
                "Client Services data already exists. You can skip this step."}
            </Typography>
            <form
              onSubmit={handleSubmit(
                clientServiceFile,
                "clientservices/import",
                setClientServiceFile,
                clientServiceFileRef
              )}
              encType="multipart/form-data"
            >
              <TextField
                type="file"
                label="Client-Service Master"
                inputProps={{ accept: ".csv" }}
                inputRef={clientServiceFileRef}
                onChange={handleFileChange(
                  setClientServiceFile,
                  clientServiceFileRef,
                  validateClientServiceCSV
                )}
                fullWidth
                variant="outlined"
                disabled={
                  !(imported.teams && imported.clients && imported.services) ||
                  imported.clientservices ||
                  uploading ||
                  isImportLocked
                }
                sx={{ mb: 2 }}
              />
              {clientServiceFile && (
                <Typography variant="body2">
                  Selected: {clientServiceFile.name}
                </Typography>
              )}
              {clientValidationErrors.length > 0 && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">
                    Validation Errors:
                  </Typography>
                  <List dense>
                    {clientValidationErrors.map((err, index) => (
                      <ListItem key={index}>
                        <ListItemText primary={err} />
                      </ListItem>
                    ))}
                  </List>
                  <StyledButton
                    variant="outlined"
                    color="error"
                    onClick={() =>
                      handleDownloadErrorCSV(
                        clientValidationErrors,
                        "clientservice_errors.csv"
                      )
                    }
                  >
                    Download Error CSV
                  </StyledButton>
                </Alert>
              )}
              <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                <StyledButton
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={
                    !(
                      imported.teams &&
                      imported.clients &&
                      imported.services
                    ) ||
                    imported.clientservices ||
                    uploading ||
                    clientValidationErrors.length > 0 ||
                    !clientServiceFile ||
                    isImportLocked
                  }
                >
                  Upload Client Services
                </StyledButton>
                {imported.clientservices && (
                  <StyledButton
                    variant="outlined"
                    color="secondary"
                    onClick={handleSkipStep}
                    disabled={uploading || isImportLocked}
                  >
                    Skip
                  </StyledButton>
                )}
                {uploading && <CircularProgress size={24} />}
                {uploading && (
                  <Box sx={{ mt: 2, width: "100%" }}>
                    <Typography variant="body2">
                      Uploading... {Math.round(uploadProgress)}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={uploadProgress}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        "& .MuiLinearProgress-bar": {
                          background:
                            "linear-gradient(45deg, #4CAF50, #66BB6A)",
                        },
                      }}
                    />
                  </Box>
                )}
                <StyledButton
                  variant="outlined"
                  color="primary"
                  onClick={() => handleDownloadTemplate("clientservices")}
                  disabled={uploading}
                >
                  Download Template
                </StyledButton>
              </Box>
            </form>
          </ProfessionalCard>
        );
      case 4:
        return (
          <ProfessionalCard sx={{ p: 2 }}>
            <Typography variant="h6">Generate Tasks</Typography>
            <Typography variant="body2" sx={{ mb: 6 }}>
              {imported.tasks
                ? "Tasks have been generated. Review the summary below."
                : "All master files have been uploaded. Click below to generate tasks based on the client-service mappings."}
            </Typography>
            {imported.tasks && renderSummaryTable()}
            {!imported.tasks && (
              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <StyledButton
                  variant="contained"
                  color="primary"
                  onClick={handleGenerateTasks}
                  disabled={
                    !imported.clientservices || uploading || isImportLocked
                  }
                >
                  Generate Tasks
                </StyledButton>
                {uploading && <CircularProgress size={24} />}
                <StyledButton
                  variant="contained"
                  color="error"
                  onClick={() => setResetDialogOpen(true)}
                  disabled={uploading}
                >
                  Reset All Collections
                </StyledButton>
                <StyledButton
                  variant="outlined"
                  color="primary"
                  component={Link}
                  to="/"
                  disabled={uploading}
                >
                  Back to Home
                </StyledButton>
              </Box>
            )}
          </ProfessionalCard>
        );
      case 5:
        return (
          <ProfessionalCard sx={{ p: 2 }}>
            <Typography variant="h6">Task Generation Complete</Typography>
            <Typography variant="body2" sx={{ mb: 6 }}>
              Task generation is complete. Review the summary below or generate
              tasks again.
            </Typography>
            {renderSummaryTable()}
            <Box
              sx={{
                display: "flex",
                gap: 2,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <StyledButton
                variant="contained"
                color="primary"
                onClick={handleGenerateTasks}
                disabled={
                  !imported.clientservices || uploading || isImportLocked
                }
              >
                Generate Tasks Again
              </StyledButton>
              {uploading && <CircularProgress size={24} />}
            </Box>
          </ProfessionalCard>
        );
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ padding: "32px 0" }}
      >
        <ProfessionalCard>
          <Typography variant="h5">
            Import Master Data and Generate Tasks
          </Typography>
          <Typography variant="h4">Upload Master Files</Typography>
          <Typography variant="body1" gutterBottom>
            Follow the steps below to upload master files and generate tasks.
          </Typography>
          {isImportLocked && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Task importation is locked by {lockDetails.lockedBy || "Unknown"}{" "}
              on{" "}
              {lockDetails.lockedAt
                ? new Date(lockDetails.lockedAt).toLocaleString("en-IN")
                : "Unknown"}
              . Unlock as an admin to make changes.
            </Alert>
          )}
          <AnimatePresence>
            {error.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error.map((err, index) => (
                    <Typography key={`error-${index}`}>{err}</Typography>
                  ))}
                </Alert>
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Alert severity="success" sx={{ mb: 5 }}>
                  {success}
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Debug: isAdmin={isAdmin.toString()}, isImportLocked=
              {isImportLocked.toString()}, activeStep={activeStep}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Imported State: {JSON.stringify(imported)}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Stepper
              activeStep={activeStep}
              alternativeLabel
              sx={{ flexGrow: 1 }}
            >
              {steps.map((label, index) => (
                <Step
                  key={label}
                  completed={imported[Object.keys(imported)[index]]}
                >
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
            {activeStep >= 0 && (
              <Box sx={{ ml: 2 }}>
                {isImportLocked ? (
                  <Lock sx={{ color: "#d32f2f", fontSize: 24 }} />
                ) : (
                  <LockOpen sx={{ color: "#1976d2", fontSize: 24 }} />
                )}
              </Box>
            )}
          </Box>
          {activeStep === 4 && !imported.tasks && (
            <Typography variant="body1" sx={{ mb: 2 }}>
              All master files have been uploaded. Click below to generate tasks
              based on the client-service mappings.
            </Typography>
          )}
          {isImportLocked && isAdmin && (
            <Box sx={{ mb: 2, textAlign: "center" }}>
              <StyledButton
                variant="contained"
                color="error"
                onClick={() => setUnlockDialogOpen(true)}
                disabled={uploading}
              >
                Unlock Task Importation
              </StyledButton>
            </Box>
          )}
          {activeStep >= 4 && isAdmin && !isImportLocked && (
            <Box sx={{ mb: 2, textAlign: "center" }}>
              <StyledButton
                variant="contained"
                color="primary"
                onClick={() => setLockDialogOpen(true)}
                disabled={!imported.tasks || uploading}
              >
                Lock Task Importation
              </StyledButton>
            </Box>
          )}
          {getStepContent(activeStep)}
        </ProfessionalCard>
        <Dialog
          open={resetDialogOpen}
          onClose={() => setResetDialogOpen(false)}
        >
          <DialogTitle>Confirm Reset</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to reset all collections? This will delete
              all teams, clients, services, client services, and tasks. This
              action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <StyledButton
              onClick={() => setResetDialogOpen(false)}
              color="primary"
            >
              Cancel
            </StyledButton>
            <StyledButton onClick={handleResetCollections} color="error">
              Reset
            </StyledButton>
          </DialogActions>
        </Dialog>
        <Dialog open={lockDialogOpen} onClose={() => setLockDialogOpen(false)}>
          <DialogTitle>Confirm Lock</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to lock task importation? This will prevent
              further uploads and task generation until unlocked. Detailed Task
              and Task Summary CSVs will be downloaded.
            </Typography>
          </DialogContent>
          <DialogActions>
            <StyledButton
              onClick={() => setLockDialogOpen(false)}
              color="primary"
            >
              Cancel
            </StyledButton>
            <StyledButton onClick={handleLockImport} color="primary">
              Lock
            </StyledButton>
          </DialogActions>
        </Dialog>
        <Dialog
          open={unlockDialogOpen}
          onClose={() => setUnlockDialogOpen(false)}
        >
          <DialogTitle>Confirm Unlock</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to unlock task importation? This will allow
              uploads and task generation.
            </Typography>
          </DialogContent>
          <DialogActions>
            <StyledButton
              onClick={() => setUnlockDialogOpen(false)}
              color="primary"
            >
              Cancel
            </StyledButton>
            <StyledButton onClick={handleUnlockImport} color="primary">
              Unlock
            </StyledButton>
          </DialogActions>
        </Dialog>
      </motion.div>
    </Container>
  );
};

export default UploadMasterFilesPage;
