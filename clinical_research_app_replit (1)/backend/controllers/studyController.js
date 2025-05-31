const Study = require('../models/studyModel');

// Get all studies
exports.getAllStudies = async (req, res) => {
  try {
    const studies = await Study.find()
      .populate('principalInvestigator', 'firstName lastName email')
      .populate('subInvestigators', 'firstName lastName email')
      .populate('researchCoordinators', 'firstName lastName email');
    
    res.status(200).json({
      success: true,
      count: studies.length,
      data: studies
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve studies',
      error: error.message
    });
  }
};

// Get study by ID
exports.getStudyById = async (req, res) => {
  try {
    const study = await Study.findById(req.params.id)
      .populate('principalInvestigator', 'firstName lastName email')
      .populate('subInvestigators', 'firstName lastName email')
      .populate('researchCoordinators', 'firstName lastName email');
    
    if (!study) {
      return res.status(404).json({
        success: false,
        message: 'Study not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: study
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve study',
      error: error.message
    });
  }
};

// Create new study
exports.createStudy = async (req, res) => {
  try {
    const study = await Study.create(req.body);
    
    res.status(201).json({
      success: true,
      data: study
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to create study',
      error: error.message
    });
  }
};

// Update study
exports.updateStudy = async (req, res) => {
  try {
    const study = await Study.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!study) {
      return res.status(404).json({
        success: false,
        message: 'Study not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: study
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to update study',
      error: error.message
    });
  }
};

// Delete study
exports.deleteStudy = async (req, res) => {
  try {
    const study = await Study.findByIdAndDelete(req.params.id);
    
    if (!study) {
      return res.status(404).json({
        success: false,
        message: 'Study not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete study',
      error: error.message
    });
  }
};

// Update study status
exports.updateStudyStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }
    
    const study = await Study.findByIdAndUpdate(
      req.params.id,
      { status },
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!study) {
      return res.status(404).json({
        success: false,
        message: 'Study not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: study
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to update study status',
      error: error.message
    });
  }
};
