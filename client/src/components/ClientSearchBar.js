// Enhanced ClientSearchBar.js with Design System Integration - CONSOLE ERROR FIXED
import React, { useState, useEffect } from "react";
import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  Paper,
  Avatar,
  Chip,
  InputAdornment,
  Fade,
  Zoom,
} from "@mui/material";
import {
  Person as PersonIcon,
  Search as SearchIcon,
  LocationOn as LocationIcon,
  AccountBalance as FirmIcon,
} from "@mui/icons-material";
import { designSystem } from "../theme/designSystem";

const ClientSearchBar = ({
  clients = [],
  onSelect,
  onClientSelect,
  disabled = false,
  className = "",
  value = null,
  selectedClient: externalSelectedClient, // FIXED: Properly destructure selectedClient prop
  autoFocus = false,
  fullWidth = true,
  placeholder = "Search for clients by code, name, or firm...",
  ...props // FIXED: Now safe to spread remaining props
}) => {
  const [inputValue, setInputValue] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleSelection = onClientSelect || onSelect;

  useEffect(() => {
    // FIXED: Handle both value and selectedClient props properly
    const clientToUse = externalSelectedClient || value;
    if (clientToUse) {
      setSelectedClient(clientToUse);
      setInputValue(
        clientToUse.clientCode
          ? `${clientToUse.clientCode} - ${clientToUse.clientName}`
          : clientToUse.clientName || ""
      );
    } else {
      setSelectedClient(null);
      setInputValue("");
    }
  }, [value, externalSelectedClient]); // FIXED: Depend on both props

  const handleChange = (event, newValue) => {
    setSelectedClient(newValue);
    if (handleSelection) {
      handleSelection(newValue);
    }
  };

  const handleInputChange = (event, newInputValue) => {
    setInputValue(newInputValue);
  };

  const filterOptions = (options, { inputValue }) => {
    if (!inputValue) return options.slice(0, 10);

    const searchTerm = inputValue.toLowerCase();
    return options
      .filter((option) => {
        if (!option) return false;
        const searchableText = `
          ${option.clientCode || ""} 
          ${option.clientName || ""} 
          ${option.firmName || ""}
        `.toLowerCase();
        return searchableText.includes(searchTerm);
      })
      .slice(0, 10);
  };

  const getClientGradient = (clientCode) => {
    if (!clientCode) return designSystem.colors.background.primaryGradient;

    const gradients = [
      designSystem.colors.background.primaryGradient,
      designSystem.colors.background.successGradient,
      designSystem.colors.background.warningGradient,
      designSystem.colors.background.errorGradient,
      "linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)",
      "linear-gradient(135deg, #00bcd4 0%, #0097a7 100%)",
      "linear-gradient(135deg, #ff5722 0%, #d84315 100%)",
      "linear-gradient(135deg, #795548 0%, #5d4037 100%)",
      "linear-gradient(135deg, #607d8b 0%, #455a64 100%)",
    ];

    const index = clientCode.charCodeAt(0) % gradients.length;
    return gradients[index];
  };

  useEffect(() => {
    console.log("ClientSearchBar received clients:", clients?.length || 0);
  }, [clients]);

  return (
    <Box sx={{ position: "relative", width: "100%" }}>
      <Autocomplete
        options={disabled ? [] : Array.isArray(clients) ? clients : []}
        value={selectedClient}
        inputValue={inputValue}
        onChange={handleChange}
        onInputChange={handleInputChange}
        onOpen={() => setIsOpen(true)}
        onClose={() => setIsOpen(false)}
        filterOptions={filterOptions}
        disabled={disabled}
        getOptionLabel={(option) => {
          if (!option) return "";
          if (typeof option === "string") return option;
          return option.clientCode
            ? `${option.clientCode} - ${option.clientName || "Unknown"}`
            : option.clientName || "Unknown Client";
        }}
        isOptionEqualToValue={(option, value) => {
          if (!option || !value) return false;
          return (
            option._id === value._id || option.clientCode === value.clientCode
          );
        }}
        renderOption={(props, option) => {
          if (!option) return null;

          return (
            <Zoom in={true} timeout={200}>
              <Box
                component="li"
                {...props}
                sx={{
                  padding: `${designSystem.spacing.md}px ${designSystem.spacing.lg}px`,
                  borderBottom: `1px solid ${designSystem.colors.grey[200]}`,
                  cursor: "pointer",
                  transition: designSystem.transitions.normal,
                  "&:hover": {
                    backgroundColor: `${designSystem.colors.primary.main}08`,
                    transform: "translateX(8px)",
                    borderLeft: `4px solid ${designSystem.colors.primary.main}`,
                    marginLeft: "-4px",
                    paddingLeft: `${designSystem.spacing.lg}px`,
                  },
                  "&:last-child": {
                    borderBottom: "none",
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: designSystem.spacing.md,
                    width: "100%",
                  }}
                >
                  <Avatar
                    sx={{
                      width: 56,
                      height: 56,
                      mr: 2,
                      background: getClientGradient(option.clientCode),
                      fontSize: "18px",
                      fontWeight: "bold",
                      boxShadow: designSystem.shadows.md,
                    }}
                  >
                    {option.clientCode
                      ? option.clientCode.substring(0, 2).toUpperCase()
                      : "CL"}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        color: designSystem.colors.text.primary,
                        fontSize: "16px",
                        lineHeight: 1.3,
                        mb: 0.5,
                      }}
                    >
                      {option.clientCode} - {option.clientName || "Unknown"}
                    </Typography>
                    {option.firmName && (
                      <Box
                        sx={{ display: "flex", alignItems: "center", mb: 0.5 }}
                      >
                        <FirmIcon
                          sx={{
                            fontSize: 16,
                            color: designSystem.colors.primary.main,
                            mr: 0.5,
                          }}
                        />
                        <Typography
                          variant="body2"
                          sx={{
                            color: designSystem.colors.text.secondary,
                            fontSize: "14px",
                          }}
                        >
                          {option.firmName}
                        </Typography>
                      </Box>
                    )}
                    {option.address && (
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <LocationIcon
                          sx={{
                            fontSize: 14,
                            color: designSystem.colors.grey[500],
                            mr: 0.5,
                          }}
                        />
                        <Typography
                          variant="caption"
                          sx={{
                            color: designSystem.colors.text.secondary,
                            fontSize: "12px",
                          }}
                        >
                          {option.address}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  <Chip
                    label="Select"
                    size="small"
                    sx={{
                      background:
                        designSystem.colors.background.primaryGradient,
                      color: "white",
                      fontWeight: "bold",
                      fontSize: "11px",
                      opacity: 0.8,
                      transition: designSystem.transitions.normal,
                      "&:hover": {
                        opacity: 1,
                        transform: "scale(1.05)",
                      },
                    }}
                  />
                </Box>
              </Box>
            </Zoom>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <SearchIcon
                  sx={{
                    mr: 1,
                    fontSize: 20,
                    color: designSystem.colors.primary.main,
                  }}
                />
                <Typography
                  sx={{
                    fontWeight: 600,
                    color: designSystem.colors.text.primary,
                  }}
                >
                  Search Client
                </Typography>
              </Box>
            }
            placeholder={disabled ? "Client selection locked" : placeholder}
            size="medium"
            fullWidth={fullWidth}
            disabled={disabled}
            autoFocus={autoFocus}
            helperText={
              disabled
                ? "🔒 Client selection is locked"
                : `Search by client code, name, or firm name${
                    clients?.length
                      ? ` • ${clients.length} clients available`
                      : ""
                  }`
            }
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon
                    sx={{
                      color: isOpen
                        ? designSystem.colors.primary.main
                        : designSystem.colors.grey[400],
                      transition: designSystem.transitions.normal,
                    }}
                  />
                </InputAdornment>
              ),
              sx: {
                minHeight: "64px",
                fontSize: "16px",
                backgroundColor: disabled
                  ? designSystem.colors.grey[100]
                  : "white",
                borderRadius: designSystem.borderRadius.lg,
                boxShadow: disabled
                  ? "inset 0 2px 4px rgba(0,0,0,0.06)"
                  : designSystem.shadows.sm,
                transition: designSystem.transitions.normal,
                "&.Mui-disabled": {
                  backgroundColor: designSystem.colors.grey[100],
                  color: designSystem.colors.grey[600],
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: designSystem.colors.grey[300],
                    borderStyle: "dashed",
                    borderWidth: "2px",
                  },
                },
                "&:hover:not(.Mui-disabled)": {
                  transform: "translateY(-2px)",
                  boxShadow: designSystem.shadows.md,
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: designSystem.colors.primary.main,
                    borderWidth: "2px",
                  },
                },
                "&.Mui-focused": {
                  transform: "translateY(-2px)",
                  boxShadow: designSystem.shadows.lg,
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: designSystem.colors.primary.main,
                    borderWidth: "2px",
                  },
                },
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: designSystem.colors.grey[300],
                  borderRadius: designSystem.borderRadius.lg,
                },
              },
            }}
            FormHelperTextProps={{
              sx: {
                color: disabled
                  ? designSystem.colors.grey[600]
                  : designSystem.colors.text.secondary,
                fontSize: "14px",
                fontWeight: 500,
                marginTop: "12px",
                marginLeft: "4px",
                display: "flex",
                alignItems: "center",
              },
            }}
            className={className}
            // FIXED: Remove selectedClient from props spread to prevent DOM attribute error
            {...Object.fromEntries(
              Object.entries(props).filter(([key]) => key !== "selectedClient")
            )}
          />
        )}
        PaperComponent={(paperProps) => (
          <Fade in={isOpen}>
            <Paper
              {...paperProps}
              sx={{
                marginTop: "12px",
                borderRadius: designSystem.borderRadius.lg,
                boxShadow: designSystem.shadows.xxl,
                border: `1px solid ${designSystem.colors.grey[200]}`,
                maxHeight: "400px",
                overflow: "hidden",
                background: "linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)",
                "& .MuiAutocomplete-listbox": {
                  padding: 0,
                  "& .MuiAutocomplete-option": {
                    minHeight: "auto",
                  },
                },
              }}
            />
          </Fade>
        )}
        ListboxProps={{
          sx: {
            maxHeight: "350px",
            "&::-webkit-scrollbar": {
              width: "6px",
            },
            "&::-webkit-scrollbar-track": {
              background: designSystem.colors.grey[100],
            },
            "&::-webkit-scrollbar-thumb": {
              background: designSystem.colors.background.primaryGradient,
              borderRadius: "3px",
            },
          },
        }}
        noOptionsText={
          <Box
            sx={{
              textAlign: "center",
              py: 4,
              color: designSystem.colors.text.secondary,
            }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: designSystem.colors.background.primaryGradient,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                opacity: 0.8,
              }}
            >
              <PersonIcon sx={{ fontSize: 40, color: "white" }} />
            </Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                mb: 1,
                color: designSystem.colors.text.primary,
              }}
            >
              {disabled
                ? "Client search is disabled"
                : !clients || clients.length === 0
                ? "No clients available"
                : "No clients found"}
            </Typography>
            {!disabled && (
              <Typography variant="body2" color="text.secondary">
                {!clients || clients.length === 0
                  ? "Please check your connection or contact support"
                  : "Try searching with different keywords"}
              </Typography>
            )}
          </Box>
        }
        loadingText={
          <Box
            sx={{
              textAlign: "center",
              py: 3,
              color: designSystem.colors.primary.main,
            }}
          >
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              🔍 Searching clients...
            </Typography>
          </Box>
        }
        disableClearable={disabled}
      />
    </Box>
  );
};

export default ClientSearchBar;
