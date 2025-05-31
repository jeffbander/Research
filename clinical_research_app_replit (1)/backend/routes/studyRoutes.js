const express = require('express');
const router = express.Router();
const { 
  getAllStudies, 
  getStudyById, 
  createStudy, 
  updateStudy, 
  deleteStudy,
  updateStudyStatus
} = require('../controllers/studyController');

// Get all studies
router.get('/', getAllStudies);

// Get a specific study
router.get('/:id', getStudyById);

// Create a new study
router.post('/', createStudy);

// Update a study
router.put('/:id', updateStudy);

// Delete a study
router.delete('/:id', deleteStudy);

// Update study status
router.patch('/:id/status', updateStudyStatus);

module.exports = router;
