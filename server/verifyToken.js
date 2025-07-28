const jwt = require("jsonwebtoken");
const token = "your-token-here"; // Paste your token
try {
  const decoded = jwt.verify(token, "your-secure-secret-key"); // Match JWT_SECRET
  console.log("Decoded Token:", decoded);
} catch (err) {
  console.error("Token Error:", err.message);
}
