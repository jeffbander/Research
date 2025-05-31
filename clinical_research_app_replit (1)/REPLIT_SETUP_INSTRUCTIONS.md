# Replit Setup Instructions for Clinical Research Management App

This document provides step-by-step instructions for setting up and running the Clinical Research Management App in Replit.

## 1. Create a New Replit

1. Go to [Replit](https://replit.com/)
2. Sign in or create an account if you don't have one
3. Click "Create Repl"
4. Select "Node.js" as the template
5. Name your Repl "clinical-research-app"
6. Click "Create Repl"

## 2. Upload Project Files

### Option 1: Upload via Replit UI

1. In your new Repl, click on the three dots next to "Files" in the sidebar
2. Select "Upload folder"
3. Upload the entire `backend` folder from this package

### Option 2: Clone from GitHub (if you've pushed the code to GitHub)

1. In your new Repl, open the Shell tab
2. Run: `git clone https://github.com/yourusername/clinical-research-app.git .`

## 3. Set Up Environment Variables

1. In your Repl, click on the "Secrets" tool in the left sidebar (lock icon)
2. Add the following environment variables:
   - Key: `MONGODB_URI`
   - Value: Your MongoDB connection string (e.g., `mongodb+srv://username:password@cluster0.mongodb.net/clinical-research-app`)
   
   - Key: `JWT_SECRET`
   - Value: A secure random string for JWT token signing (e.g., `your_secure_jwt_secret_key`)

## 4. Install Dependencies

1. In your Repl, open the Shell tab
2. Run the following commands:
```bash
cd backend
npm install
```

## 5. Configure Replit

1. Create a `.replit` file in the root directory (if not already present) with the following content:
```
run = "cd backend && npm start"
```

2. Create a `replit.nix` file in the root directory (if not already present) with the following content:
```nix
{ pkgs }: {
  deps = [
    pkgs.nodejs-18_x
    pkgs.nodePackages.typescript-language-server
    pkgs.yarn
    pkgs.replitPackages.jest
  ];
}
```

## 6. Load Sample Data (Optional)

If you want to populate the database with sample data:

1. In your Repl, open the Shell tab
2. Run:
```bash
cd backend
node sample-data-loader.js
```

## 7. Run the Application

1. Click the "Run" button at the top of the Replit interface
2. The server should start and display a message like: "Server running on port 3000" and "Connected to MongoDB"

## 8. Test the API

Once the server is running, you can test the API endpoints:

1. Open a new browser tab
2. Navigate to your Repl's URL (shown in the webview pane) - it should look like `https://clinical-research-app.yourusername.repl.co`
3. You should see a welcome message with available endpoints

## 9. API Testing with Replit's HTTP Client

1. In your Repl, click on "Tools" in the bottom-right corner
2. Select "HTTP Client"
3. You can now make requests to your API endpoints:

Example request to register a user:
```
POST /api/users/register
Content-Type: application/json

{
  "firstName": "Test",
  "lastName": "User",
  "email": "test@example.com",
  "password": "Password123!",
  "role": "research_coordinator"
}
```

## 10. Common Issues and Solutions

### MongoDB Connection Issues

If you see "Failed to connect to MongoDB" errors:
1. Check that your MongoDB URI is correct in the Secrets
2. Ensure your MongoDB Atlas cluster has your Replit's IP address whitelisted (or set to allow access from anywhere)
3. Verify your MongoDB user credentials are correct

### Port Conflicts

If you see "Port already in use" errors:
1. Replit automatically assigns a port for your application
2. Make sure your server.js listens on `process.env.PORT || 3000`

### Module Not Found Errors

If you see "Cannot find module" errors:
1. Make sure you've run `npm install` in the backend directory
2. Check that all dependencies are correctly listed in package.json

## 11. Next Steps

1. Implement the frontend (React application)
2. Connect the frontend to the backend API
3. Add additional features as needed

## 12. Resources

- [Replit Documentation](https://docs.replit.com/)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Express.js Documentation](https://expressjs.com/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
