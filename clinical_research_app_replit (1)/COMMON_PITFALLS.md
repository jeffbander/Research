# Common Mistakes and Replit Pitfalls

This document outlines common mistakes and pitfalls when deploying the Clinical Research Management App on Replit, along with solutions to avoid or fix them.

## Environment Variables

### Mistake: Hardcoding sensitive information
**Problem**: Including database credentials, JWT secrets, or API keys directly in your code.
**Solution**: Always use environment variables via Replit's Secrets feature. Never commit sensitive information to your code.

### Mistake: Not checking if environment variables are loaded
**Problem**: Assuming environment variables are always available.
**Solution**: Add validation at startup to check if required environment variables are present:
```javascript
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI environment variable is not set');
  process.exit(1);
}
```

## MongoDB Connection

### Mistake: Using incorrect MongoDB connection options
**Problem**: Mongoose deprecation warnings or connection failures.
**Solution**: Use the recommended connection options:
```javascript
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
```

### Mistake: Not handling MongoDB connection errors
**Problem**: Application crashes without meaningful error messages when database connection fails.
**Solution**: Add proper error handling:
```javascript
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
```

## Port Configuration

### Mistake: Hardcoding port numbers
**Problem**: Replit assigns a port dynamically, so hardcoded ports won't work.
**Solution**: Always use the PORT environment variable:
```javascript
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

### Mistake: Not configuring CORS properly
**Problem**: Frontend can't connect to backend due to CORS errors.
**Solution**: Configure CORS to allow requests from your frontend domain:
```javascript
const cors = require('cors');
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true
}));
```

## File Structure

### Mistake: Incorrect file paths
**Problem**: File not found errors due to incorrect path references.
**Solution**: Use absolute paths with `path.join()` or `path.resolve()`:
```javascript
const path = require('path');
const filePath = path.join(__dirname, 'relative/path/to/file');
```

### Mistake: Not respecting Replit's file structure
**Problem**: Replit has specific expectations for certain files like `.replit`.
**Solution**: Keep configuration files in the root directory, not nested in subdirectories.

## Dependencies

### Mistake: Missing dependencies in package.json
**Problem**: "Module not found" errors when running the application.
**Solution**: Ensure all required packages are listed in package.json and run `npm install` before starting.

### Mistake: Using incompatible package versions
**Problem**: Unexpected errors due to package version conflicts.
**Solution**: Lock package versions in package.json and use a package-lock.json file.

### Mistake: Installing dependencies in the wrong directory
**Problem**: Modules can't be found even after installation.
**Solution**: Make sure to run `npm install` in the directory containing package.json (the backend directory).

## Authentication

### Mistake: Weak JWT implementation
**Problem**: Security vulnerabilities in authentication.
**Solution**: Use strong secrets, set appropriate expiration times, and validate tokens properly:
```javascript
// Creating tokens with expiration
const token = jwt.sign(
  { id: user._id },
  process.env.JWT_SECRET,
  { expiresIn: '1d' }
);

// Validating tokens
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  // Token is valid
} catch (error) {
  // Token is invalid
}
```

## Error Handling

### Mistake: Poor error handling
**Problem**: Cryptic errors or application crashes without meaningful messages.
**Solution**: Implement global error handling middleware:
```javascript
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'An error occurred',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});
```

## Replit-Specific Issues

### Mistake: Not using the .replit file correctly
**Problem**: Replit doesn't know how to run your application.
**Solution**: Ensure your .replit file has the correct run command:
```
run = "cd backend && npm start"
```

### Mistake: Not handling Replit sleep/wake cycles
**Problem**: Replit free tier projects go to sleep after inactivity, causing connection issues.
**Solution**: Implement reconnection logic for database connections and handle startup procedures properly.

### Mistake: Relying on local filesystem for persistent storage
**Problem**: Files may not persist between Replit restarts.
**Solution**: Use MongoDB or other cloud storage for any data that needs to persist.

## Testing

### Mistake: Not testing API endpoints
**Problem**: Discovering issues only in production.
**Solution**: Use Replit's HTTP Client tool to test your API endpoints before connecting a frontend.

### Mistake: Testing with production credentials
**Problem**: Accidentally modifying production data during testing.
**Solution**: Use separate development/testing databases and credentials.

## Performance

### Mistake: Large response payloads
**Problem**: Slow API responses due to returning too much data.
**Solution**: Implement pagination and selective field returns:
```javascript
// Example of pagination
app.get('/api/studies', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  const studies = await Study.find()
    .skip(skip)
    .limit(limit);
    
  res.json({
    success: true,
    count: studies.length,
    data: studies,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(await Study.countDocuments() / limit)
    }
  });
});
```

## Debugging

### Mistake: Insufficient logging
**Problem**: Difficulty troubleshooting issues in Replit environment.
**Solution**: Implement comprehensive logging:
```javascript
// Log all requests
app.use(morgan('dev'));

// Log specific operations
console.log(`[${new Date().toISOString()}] Operation completed: ${result}`);
```

### Mistake: Not checking Replit logs
**Problem**: Missing important error messages.
**Solution**: Regularly check the Replit console output for warnings and errors.

## Conclusion

By avoiding these common mistakes and following the recommended solutions, you'll have a much smoother experience deploying and running your Clinical Research Management App on Replit. Remember that Replit has specific requirements and behaviors that differ from traditional development environments, so always test thoroughly in the Replit environment itself.
