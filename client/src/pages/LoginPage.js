import React, { useState } from "react";
import {
  Button,
  TextField,
  Typography,
  Container,
  Box,
  Fade,
  InputAdornment,
  IconButton,
  CircularProgress,
} from "@mui/material";
import { Visibility, VisibilityOff, Lock, Person } from "@mui/icons-material";
import "../styles/LoginPage.css";
import "../styles/animations.css";
import API_BASE_URL from "../config";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("role", data.role);
        window.location.href = "/";
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Server error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="login-page-wrapper">
      <div className="background-animation">
        <div className="floating-bubble bubble-1"></div>
        <div className="floating-bubble bubble-2"></div>
        <div className="floating-bubble bubble-3"></div>
        <div className="floating-bubble bubble-4"></div>
        <div className="floating-bubble bubble-5"></div>
      </div>
      <Container maxWidth="sm" className="login-container">
        <Fade in timeout={800}>
          <Box className="login-card">
            <div className="card-glow"></div>
            <Box className="login-header">
              <Typography variant="h3" className="login-title">
                Welcome to <span className="brand-name">GodsOffice</span>
              </Typography>
              <Typography variant="h6" className="login-subtitle">
                Sign in to manage your office with elegance
              </Typography>
            </Box>
            {error && (
              <Typography color="error" className="error-message">
                {error}
              </Typography>
            )}
            <form onSubmit={handleLogin} className="login-form">
              <Box className="input-group">
                <Typography variant="body1" className="input-label">
                  Username
                </Typography>
                <TextField
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="login-input"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person className="input-icon" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
              <Box className="input-group">
                <Typography variant="body1" className="input-label">
                  Password
                </Typography>
                <TextField
                  type={showPassword ? "text" : "password"}
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="login-input"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock className="input-icon" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={handleClickShowPassword}
                          edge="end"
                          className="show-password-button"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
              <Button
                type="submit"
                variant="contained"
                fullWidth
                className="login-button animate-scale"
                disabled={isLoading}
              >
                {isLoading ? (
                  <CircularProgress size={24} className="loading-spinner" />
                ) : (
                  <>
                    Sign In
                    <span className="button-arrow">→</span>
                  </>
                )}
              </Button>
            </form>
            <Box className="login-footer">
              <Typography variant="body2" className="footer-text">
                © 2025 GodsOffice. All rights reserved.
              </Typography>
              <Box className="footer-actions">
                <Button size="small" className="footer-link">
                  Forgot Password?
                </Button>
                <Button size="small" className="footer-link">
                  Support
                </Button>
              </Box>
            </Box>
          </Box>
        </Fade>
      </Container>
    </div>
  );
};

export default LoginPage;
