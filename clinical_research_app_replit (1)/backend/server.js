require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

// Import routes
const studyRoutes = require('./routes/studyRoutes');
const patientRoutes = require('./routes/patientRoutes');
const financialRoutes = require('./routes/financialRoutes');
const userRoutes = require('./routes/userRoutes');
const reportRoutes = require('./routes/reportRoutes');
const deidentRoutes = require('./routes/deidentRoutes');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// API Routes
app.use('/api/studies', studyRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/deident', deidentRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the Clinical Research Management API',
    endpoints: {
      studies: '/api/studies',
      patients: '/api/patients',
      financial: '/api/financial',
      users: '/api/users',
      reports: '/api/reports',
      deident: '/api/deident'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'An error occurred',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinical-research-app', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log('Connected to MongoDB');
    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB', err);
  });

module.exports = app; // For testing
