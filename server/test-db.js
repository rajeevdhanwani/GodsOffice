const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/godsoffice', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('Connected to MongoDB');
    mongoose.connection.close();
  })
  .catch((err) => console.error('MongoDB connection error:', err));