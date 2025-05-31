// Utility functions for the clinical research management app

/**
 * Format date to YYYY-MM-DD
 * @param {Date} date - Date to format
 * @returns {String} Formatted date string
 */
exports.formatDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

/**
 * Calculate date difference in days
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {Number} Difference in days
 */
exports.dateDiffInDays = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Generate a unique ID with prefix
 * @param {String} prefix - Prefix for the ID
 * @returns {String} Unique ID
 */
exports.generateUniqueId = (prefix) => {
  const timestamp = new Date().getTime();
  const randomNum = Math.floor(Math.random() * 10000);
  return `${prefix}-${timestamp}-${randomNum}`;
};

/**
 * Calculate budget utilization percentage
 * @param {Number} budgeted - Budgeted amount
 * @param {Number} actual - Actual amount
 * @returns {Number} Utilization percentage
 */
exports.calculateUtilization = (budgeted, actual) => {
  if (!budgeted || budgeted === 0) return 0;
  return ((actual / budgeted) * 100).toFixed(2);
};

/**
 * Check if a date is overdue
 * @param {Date} dueDate - Due date to check
 * @returns {Boolean} True if overdue
 */
exports.isOverdue = (dueDate) => {
  if (!dueDate) return false;
  const today = new Date();
  const due = new Date(dueDate);
  return due < today;
};

/**
 * Format currency amount
 * @param {Number} amount - Amount to format
 * @param {String} currency - Currency code (default: USD)
 * @returns {String} Formatted currency string
 */
exports.formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

/**
 * Sanitize object for MongoDB query
 * @param {Object} obj - Object to sanitize
 * @returns {Object} Sanitized object
 */
exports.sanitizeQuery = (obj) => {
  const sanitized = {};
  
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
      sanitized[key] = obj[key];
    }
  });
  
  return sanitized;
};

/**
 * Paginate results
 * @param {Array} data - Data to paginate
 * @param {Number} page - Page number
 * @param {Number} limit - Items per page
 * @returns {Object} Paginated results
 */
exports.paginate = (data, page = 1, limit = 10) => {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  
  const results = {
    data: data.slice(startIndex, endIndex),
    pagination: {
      total: data.length,
      page,
      limit,
      pages: Math.ceil(data.length / limit)
    }
  };
  
  if (startIndex > 0) {
    results.pagination.prev = page - 1;
  }
  
  if (endIndex < data.length) {
    results.pagination.next = page + 1;
  }
  
  return results;
};
