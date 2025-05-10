const mongoose = require('mongoose');
const Client = require('./models/Client');

mongoose.connect('mongodb://localhost:27017/godsoffice', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(async () => {
    console.log('Connected to MongoDB');
    const client = new Client({
      clientCode: 'GS-502A',
      groupCode: 'GP-02',
      clientName: 'BHOJRAJ DEWANI',
      firmName: 'MAHALAXMI PROVISION STORE',
      address: 'Naka Chowk Main Road Kargi Road, Kota Bilaspur 495113',
      gstin: '22AFTPD4624B1ZX',
      contact: '9893597646',
      email: 'mahalaxmiprovisionkota@gmail.com',
      withUsSince: new Date('2011-05-11'),
      financialYear: '2025-26',
    });
    await client.save();
    console.log('Client saved:', client);
    mongoose.connection.close();
  })
  .catch((err) => console.log('Error:', err));