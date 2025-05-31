const express = require('express');
const router = express.Router();
const { 
  getAllPatients, 
  getPatientById, 
  createPatient, 
  updatePatient, 
  deletePatient,
  getPatientsByStudy,
  updateEnrollmentStatus
} = require('../controllers/patientController');

// Get all patients
router.get('/', getAllPatients);

// Get a specific patient
router.get('/:id', getPatientById);

// Get patients by study
router.get('/study/:studyId', getPatientsByStudy);

// Create a new patient
router.post('/', createPatient);

// Update a patient
router.put('/:id', updatePatient);

// Delete a patient
router.delete('/:id', deletePatient);

// Update enrollment status
router.patch('/:id/enrollment-status', updateEnrollmentStatus);

module.exports = router;
