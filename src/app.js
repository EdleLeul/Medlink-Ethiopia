const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

// Route imports
const patientRoutes = require('./routes/patients');
const recordRoutes = require('./routes/records');
const otpRoutes = require('./routes/otp');
const appointmentRoutes = require('./routes/appointments');
const hospitalRoutes = require('./routes/hospitals');
const childrenRoutes = require('./routes/children');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || '*' }));
app.use(express.json());

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'MedLink Ethiopia API' }));

// Routes
app.use('/api/patients', patientRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/children', childrenRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`MedLink API running on port ${PORT}`));

module.exports = app;