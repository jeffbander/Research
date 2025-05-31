const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  getUserProfile, 
  updateUserProfile, 
  getAllUsers,
  getUserById,
  updateUserRole,
  deactivateUser
} = require('../controllers/userController');

// User registration
router.post('/register', register);

// User login
router.post('/login', login);

// Get user profile
router.get('/profile', getUserProfile);

// Update user profile
router.put('/profile', updateUserProfile);

// Get all users (admin only)
router.get('/', getAllUsers);

// Get specific user by ID (admin only)
router.get('/:id', getUserById);

// Update user role (admin only)
router.patch('/:id/role', updateUserRole);

// Deactivate user (admin only)
router.patch('/:id/deactivate', deactivateUser);

module.exports = router;
