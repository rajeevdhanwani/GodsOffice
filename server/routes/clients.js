const express = require('express');
const Client = require('../models/Client');

const router = express.Router();

// Add new client
router.post('/', async (req, res) => {
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
      return res.status(400).json({ message: 'Client code already exists' });
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
    res.status(201).json({ message: 'Client added successfully', client });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Server error' });
  }
});

// Get all clients
router.get('/', async (req, res) => {
  try {
    const clients = await Client.find();
    res.json(clients);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update client
router.put('/:clientCode', async (req, res) => {
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
      return res.status(404).json({ message: 'Client not found' });
    }
    client.groupCode = groupCode;
    client.clientName = clientName;
    client.firmName = firmName;
    client.addressmetry = address;
    client.gstin = gstin;
    client.contact = contact;
    client.email = email;
    client.withUsSince = withUsSince;
    await client.save();
    res.json({ message: 'Client updated successfully', client });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Server error' });
  }
});

module.exports = router;