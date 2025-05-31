# Mount Sinai West Clinical Research Management App

This repository contains a complete clinical research management application for Mount Sinai West. The application is designed to track clinical studies, manage patient enrollment, handle budgets, and generate financial reports.

## Project Structure

```
/
├── backend/               # Backend Node.js/Express application
│   ├── config/            # Configuration files
│   ├── controllers/       # API controllers
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── utils/             # Utility functions
│   ├── middleware/        # Custom middleware
│   ├── server.js          # Main server file
│   └── package.json       # Backend dependencies
│
├── frontend/              # Frontend React application
│   ├── public/            # Static files
│   ├── src/               # React source code
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   ├── utils/         # Utility functions
│   │   ├── App.js         # Main App component
│   │   └── index.js       # Entry point
│   └── package.json       # Frontend dependencies
│
├── .env                   # Environment variables
├── .gitignore             # Git ignore file
└── README.md              # Project documentation
```

## Setup Instructions for Replit

### 1. Create a New Replit

1. Go to [Replit](https://replit.com/)
2. Click "Create Repl"
3. Select "Node.js" as the template
4. Name your Repl "clinical-research-app"
5. Click "Create Repl"

### 2. Set Up the Project Structure

1. In the Replit shell, run the following commands to set up the project structure:

```bash
mkdir -p backend/config backend/controllers backend/models backend/routes backend/utils backend/middleware
mkdir -p frontend/public frontend/src/components frontend/src/pages frontend/src/services frontend/src/utils
```

### 3. Install Dependencies

1. In the Replit shell, run the following commands to install backend dependencies:

```bash
cd backend
npm init -y
npm install express mongoose dotenv cors bcryptjs jsonwebtoken morgan multer validator
npm install --save-dev nodemon
cd ..
```

2. Set up the frontend:

```bash
cd frontend
npm init -y
npm install react react-dom react-router-dom axios formik yup chart.js react-chartjs-2 @mui/material @mui/icons-material @emotion/react @emotion/styled
cd ..
```

### 4. Configure Environment Variables

1. Create a `.env` file in the root directory with the following content:

```
PORT=3001
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/clinical-research-app
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
```

Note: Replace `<username>:<password>` with your MongoDB Atlas credentials, or use a local MongoDB instance.

### 5. Set Up Replit Configuration

1. Create a `.replit` file in the root directory with the following content:

```
run = "cd backend && npm start"
```

2. Update the `package.json` in the backend directory to include the following scripts:

```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js"
}
```

## Running the Application

1. Click the "Run" button in Replit to start the backend server
2. The backend API will be available at the URL provided by Replit

## Testing the API

You can test the API endpoints using the following tools:

1. Replit's built-in HTTP client
2. The browser console (for frontend testing)
3. Postman or similar API testing tools

## Sample Data

The application includes a sample data loader that populates the database with test data. To load sample data:

1. Run the following command in the Replit shell:

```bash
cd backend
node sample-data-loader.js
```

## API Documentation

### Authentication Endpoints

- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - Login and get JWT token

### Study Endpoints

- `GET /api/studies` - Get all studies
- `GET /api/studies/:id` - Get a specific study
- `POST /api/studies` - Create a new study
- `PUT /api/studies/:id` - Update a study
- `DELETE /api/studies/:id` - Delete a study
- `PATCH /api/studies/:id/status` - Update study status

### Patient Endpoints

- `GET /api/patients` - Get all patients
- `GET /api/patients/:id` - Get a specific patient
- `GET /api/patients/study/:studyId` - Get patients by study
- `POST /api/patients` - Create a new patient
- `PUT /api/patients/:id` - Update a patient
- `DELETE /api/patients/:id` - Delete a patient
- `PATCH /api/patients/:id/enrollment-status` - Update enrollment status

### Financial Endpoints

- `GET /api/financial` - Get all budgets
- `GET /api/financial/:id` - Get a specific budget
- `GET /api/financial/study/:studyId` - Get budget by study
- `POST /api/financial` - Create a new budget
- `PUT /api/financial/:id` - Update a budget
- `DELETE /api/financial/:id` - Delete a budget
- `PATCH /api/financial/:id/status` - Update budget status

### Report Endpoints

- `GET /api/reports/financial-summary` - Get financial summary
- `GET /api/reports/profit-loss` - Get profit and loss report
- `GET /api/reports/missing-payments` - Get missing payments report
- `GET /api/reports/enrollment` - Get enrollment report
- `GET /api/reports/study-status` - Get study status report
- `POST /api/reports/custom` - Generate custom report

## Next Steps

1. Implement the frontend React application
2. Connect the frontend to the backend API
3. Deploy the application to a production environment
4. Implement additional features as needed

## Support

For any questions or issues, please contact the development team.
