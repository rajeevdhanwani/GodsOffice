// server/routes/clients.js
const express = require("express");
const mongoose = require("mongoose");
const Client = require("../models/Client");

const router = express.Router();

const auth = (req, res, next) => {
  const authHeader = req.header("Authorization");
  if (!authHeader) {
    return res
      .status(401)
      .json({ message: "No authorization header provided." });
  }
  const token = authHeader.replace("Bearer ", "");
  if (!token || token === "null" || token === "undefined") {
    return res.status(401).json({ message: "No token provided." });
  }
  try {
    const decoded = require("jsonwebtoken").verify(
      token,
      process.env.JWT_SECRET || "your_jwt_secret"
    );
    req.user = decoded;
    req.isAdmin = decoded.isAdmin || false;
    next();
  } catch (err) {
    console.error("JWT verification error:", err);
    return res.status(401).json({ message: "Invalid token." });
  }
};

// Add new client
router.post("/", auth, async (req, res) => {
  const {
    clientCode,
    groupCode,
    clientName,
    firmName,
    address,
    gstin,
    contact,
    email,
    withUsSince,
  } = req.body;
  try {
    let client = await Client.findOne({ clientCode });
    if (client) {
      return res.status(400).json({ message: "Client code already exists" });
    }
    client = new Client({
      clientCode,
      groupCode,
      clientName,
      firmName,
      address,
      gstin,
      contact,
      email,
      withUsSince,
    });
    await client.save();
    res.status(201).json({ message: "Client added successfully", client });
  } catch (err) {
    console.error("Error adding client:", err.message, err.stack);
    res.status(400).json({ message: err.message || "Server error" });
  }
});

// Get all clients
router.get("/", auth, async (req, res) => {
  try {
    const clients = await Client.find().lean();
    res.json(clients);
  } catch (err) {
    console.error("Error fetching clients:", err.message, err.stack);
    res.status(500).json({ message: "Server error" });
  }
});

// Update client
router.put("/:clientCode", auth, async (req, res) => {
  const { clientCode } = req.params;
  const {
    groupCode,
    clientName,
    firmName,
    address,
    gstin,
    contact,
    email,
    withUsSince,
  } = req.body;
  try {
    const client = await Client.findOne({ clientCode });
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    client.groupCode = groupCode || client.groupCode;
    client.clientName = clientName || client.clientName;
    client.firmName = firmName || client.firmName;
    client.address = address || client.address;
    client.gstin = gstin || client.gstin;
    client.contact = contact || client.contact;
    client.email = email || client.email;
    client.withUsSince = withUsSince || client.withUsSince;
    await client.save();
    res.json({ message: "Client updated successfully", client });
  } catch (err) {
    console.error("Error updating client:", err.message, err.stack);
    res.status(400).json({ message: err.message || "Server error" });
  }
});

module.exports = router;
