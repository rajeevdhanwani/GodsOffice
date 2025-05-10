const express = require('express');
const Client = require('../models/Client');
const Team = require('../models/Team');
const Service = require('../models/Service');
const ClientService = require('../models/ClientService');

const router = express.Router();

// Import clients
router.post('/clients/import', async (req, res) => {
  const clients = req.body;
  const results = [];
  const errors = [];

  try {
    for (let i = 0; i < clients.length; i++) {
      const clientData = clients[i];
      const rowNumber = i + 2;

      if (!clientData.clientCode) {
        errors.push({ row: rowNumber, clientCode: clientData.clientCode || 'Unknown', message: 'Missing clientCode' });
        continue;
      }
      if (!clientData.clientName) {
        errors.push({ row: rowNumber, clientCode: clientData.clientCode || 'Unknown', message: 'Missing clientName' });
        continue;
      }
      if (!clientData.firmName) {
        errors.push({ row: rowNumber, clientCode: clientData.clientCode || 'Unknown', message: 'Missing firmName' });
        continue;
      }
      if (!clientData.address) {
        errors.push({ row: rowNumber, clientCode: clientData.clientCode || 'Unknown', message: 'Missing address' });
        continue;
      }

      const existing = await Client.findOne({ clientCode: clientData.clientCode });
      if (existing) {
        results.push({ clientCode: clientData.clientCode, status: 'already_exists', message: 'Client code already exists' });
        continue;
      }

      try {
        const client = new Client({
          clientCode: clientData.clientCode,
          groupCode: clientData.groupCode || '',
          clientName: clientData.clientName,
          firmName: clientData.firmName,
          address: clientData.address,
          gstin: clientData.gstin || '',
          contact: clientData.contact || '',
          email: clientData.email || '',
          withUsSince: clientData.withUsSince ? new Date(clientData.withUsSince) : null,
        });
        await client.save();
        results.push({ clientCode: clientData.clientCode, status: 'imported' });
      } catch (err) {
        errors.push({ row: rowNumber, clientCode: clientData.clientCode || 'Unknown', message: err.message || 'Failed to import client' });
      }
    }

    const importedCount = results.filter((r) => r.status === 'imported').length;
    const alreadyExistsCount = results.filter((r) => r.status === 'already_exists').length;
    const summary = `Imported ${importedCount} clients, ${alreadyExistsCount} already exist, ${errors.length} errors`;

    res.status(201).json({
      message: summary,
      results: errors,
      errors,
      errorCsv: errors.length > 0 ? generateErrorCsv(errors, 'client_import_errors.csv') : null,
    });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to import clients', errors });
  }
});

// Import teams
router.post('/teams/import', async (req, res) => {
  const teams = req.body;
  const results = [];
  const errors = [];

  try {
    for (let i = 0; i < teams.length; i++) {
      const teamData = teams[i];
      const rowNumber = i + 2;

      if (!teamData.teamMemberId) {
        errors.push({ row: rowNumber, teamMemberId: teamData.teamMemberId || 'Unknown', message: 'Missing teamMemberId' });
        continue;
      }
      if (!teamData.name && !teamData.teamMemberName) {
        errors.push({ row: rowNumber, teamMemberId: teamData.teamMemberId || 'Unknown', message: 'Missing name' });
        continue;
      }

      const existing = await Team.findOne({ teamMemberId: teamData.teamMemberId });
      if (existing) {
        results.push({ teamMemberId: teamData.teamMemberId, status: 'already_exists', message: 'Team member ID already exists' });
        continue;
      }

      try {
        const team = new Team({
          teamMemberId: teamData.teamMemberId,
          name: teamData.teamMemberName || teamData.name,
          role: teamData.role || '',
          contact: teamData.contact || '',
        });
        await team.save();
        results.push({ teamMemberId: teamData.teamMemberId, status: 'imported' });
      } catch (err) {
        errors.push({ row: rowNumber, teamMemberId: teamData.teamMemberId || 'Unknown', message: err.message || 'Failed to import team member' });
      }
    }

    const importedCount = results.filter((r) => r.status === 'imported').length;
    const alreadyExistsCount = results.filter((r) => r.status === 'already_exists').length;
    const summary = `Imported ${importedCount} team members, ${alreadyExistsCount} already exist, ${errors.length} errors`;

    res.status(201).json({
      message: summary,
      results: errors,
      errors,
      errorCsv: errors.length > 0 ? generateErrorCsv(errors, 'team_import_errors.csv') : null,
    });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to import teams', errors });
  }
});

// Import services
router.post('/services/import', async (req, res) => {
  const services = req.body;
  const results = [];
  const errors = [];

  try {
    for (let i = 0; i < services.length; i++) {
      const serviceData = services[i];
      const rowNumber = i + 2;

      if (!serviceData.serviceCode) {
        errors.push({ row: rowNumber, serviceCode: serviceData.serviceCode || 'Unknown', message: 'Missing serviceCode' });
        continue;
      }
      if (!serviceData.serviceName) {
        errors.push({ row: rowNumber, serviceCode: serviceData.serviceCode || 'Unknown', message: 'Missing serviceName' });
        continue;
      }

      const existing = await Service.findOne({ serviceCode: serviceData.serviceCode });
      if (existing) {
        results.push({ serviceCode: serviceData.serviceCode, status: 'already_exists', message: 'Service code already exists' });
        continue;
      }

      try {
        const service = new Service({
          serviceCode: serviceData.serviceCode,
          frequency: serviceData.frequency || '',
          sacCode: serviceData.sacCode || '',
          serviceGroup: serviceData.serviceGroup || '',
          serviceName: serviceData.serviceName,
          schedule: {
            assignment: {
              date: serviceData.assignmentDate || '',
              shiftNext: serviceData['Shift Next'] === 'Yes' || serviceData.shiftNext === true,
            },
            due: {
              date: serviceData.dueDate || '',
            },
          },
        });
        await service.save();
        results.push({ serviceCode: serviceData.serviceCode, status: 'imported' });
      } catch (err) {
        errors.push({ row: rowNumber, serviceCode: serviceData.serviceCode || 'Unknown', message: err.message || 'Failed to import service' });
      }
    }

    const importedCount = results.filter((r) => r.status === 'imported').length;
    const alreadyExistsCount = results.filter((r) => r.status === 'already_exists').length;
    const summary = `Imported ${importedCount} services, ${alreadyExistsCount} already exist, ${errors.length} errors`;

    res.status(201).json({
      message: summary,
      results: errors,
      errors,
      errorCsv: errors.length > 0 ? generateErrorCsv(errors, 'service_import_errors.csv') : null,
    });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to import services', errors });
  }
});

// Import client-service mappings
router.post('/clientservices/import', async (req, res) => {
  const clientServices = req.body;
  const results = [];
  const errors = [];

  try {
    for (let i = 0; i < clientServices.length; i++) {
      const csData = clientServices[i];
      const rowNumber = i + 2;

      if (!csData.clientCode) {
        errors.push({ row: rowNumber, clientCode: csData.clientCode || 'Unknown', message: 'Missing clientCode' });
        continue;
      }
      if (!csData.servicesGiven) {
        errors.push({ row: rowNumber, clientCode: csData.clientCode || 'Unknown', message: 'Missing servicesGiven' });
        continue;
      }
      if (!csData.teamMemberName) {
        errors.push({ row: rowNumber, clientCode: csData.clientCode || 'Unknown', message: 'Missing teamMemberName' });
        continue;
      }
      if (!csData.financialYear) {
        errors.push({ row: rowNumber, clientCode: csData.clientCode || 'Unknown', message: 'Missing financialYear' });
        continue;
      }

      const service = await Service.findOne({ serviceCode: csData.servicesGiven });
      if (!service) {
        errors.push({ row: rowNumber, clientCode: csData.clientCode, serviceCode: csData.servicesGiven, message: `Service not found: ${csData.servicesGiven}` });
        continue;
      }

      const teamMember = await Team.findOne({ name: csData.teamMemberName });
      if (!teamMember) {
        errors.push({ row: rowNumber, clientCode: csData.clientCode, message: `Team member not found: ${csData.teamMemberName}` });
        continue;
      }

      const existing = await ClientService.findOne({
        clientCode: csData.clientCode,
        serviceCode: csData.servicesGiven,
        financialYear: csData.financialYear,
      });
      if (existing) {
        results.push({ clientCode: csData.clientCode, serviceCode: csData.servicesGiven, status: 'already_exists', message: 'Client-service mapping already exists' });
        continue;
      }

      try {
        const clientService = new ClientService({
          clientCode: csData.clientCode,
          serviceCode: csData.servicesGiven,
          teamMemberId: teamMember.teamMemberId,
          startDate: csData.startDate ? new Date(csData.startDate) : null,
          financialYear: csData.financialYear,
        });
        await clientService.save();
        results.push({ clientCode: csData.clientCode, serviceCode: csData.servicesGiven, status: 'imported' });
      } catch (err) {
        errors.push({ row: rowNumber, clientCode: csData.clientCode, message: err.message || 'Failed to import client-service mapping' });
      }
    }

    const importedCount = results.filter((r) => r.status === 'imported').length;
    const alreadyExistsCount = results.filter((r) => r.status === 'already_exists').length;
    const summary = `Imported ${importedCount} client-service mappings, ${alreadyExistsCount} already exist, ${errors.length} errors`;

    res.status(201).json({
      message: summary,
      results: errors,
      errors,
      errorCsv: errors.length > 0 ? generateErrorCsv(errors, 'clientservice_import_errors.csv') : null,
    });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to import client-service mappings', errors });
  }
});

// Helper function to generate CSV for errors
function generateErrorCsv(errors, filename) {
  const csvRows = ['Row,ClientCode,ServiceCode,Message'];
  errors.forEach((error) => {
    csvRows.push(`${error.row},${error.clientCode || ''},${error.serviceCode || ''},${error.message.replace(/,/g, '')}`);
  });
  return {
    filename,
    data: csvRows.join('\n'),
  };
}

module.exports = router;