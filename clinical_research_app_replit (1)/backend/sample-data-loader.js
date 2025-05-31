// Sample data loader for the clinical research management app
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import models
const User = require('./models/userModel');
const Study = require('./models/studyModel');
const Patient = require('./models/patientModel');
const Budget = require('./models/budgetModel');
const Transaction = require('./models/transactionModel');

// Sample data
const sampleUsers = [
  {
    firstName: "John",
    lastName: "Smith",
    email: "john.smith@mountsinai.org",
    password: "Password123!",
    role: "principal_investigator",
    phone: "212-555-1234",
    department: "Cardiology"
  },
  {
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah.johnson@mountsinai.org",
    password: "Password123!",
    role: "research_coordinator",
    phone: "212-555-2345",
    department: "Cardiology"
  },
  {
    firstName: "Michael",
    lastName: "Chen",
    email: "michael.chen@mountsinai.org",
    password: "Password123!",
    role: "financial_manager",
    phone: "212-555-3456",
    department: "Research Administration"
  },
  {
    firstName: "Emily",
    lastName: "Rodriguez",
    email: "emily.rodriguez@mountsinai.org",
    password: "Password123!",
    role: "admin",
    phone: "212-555-4567",
    department: "Research Administration"
  }
];

const sampleStudies = [
  {
    studyId: "CARD-2025-001",
    name: "Evaluation of Novel Biomarkers for Early Detection of Cardiovascular Disease",
    shortTitle: "CardioMarkers Study",
    description: "A prospective study to evaluate the efficacy of novel biomarkers for early detection of cardiovascular disease in high-risk patients.",
    studyType: "interventional",
    phase: "phase_2",
    therapeuticArea: "Cardiology",
    startDate: "2025-01-15",
    estimatedEndDate: "2026-07-15",
    status: "active",
    irbProtocolNumber: "IRB-2024-1234",
    sponsorName: "CardioHealth Pharmaceuticals",
    sponsorType: "industry",
    sponsorContact: {
      name: "David Wilson",
      email: "d.wilson@cardiohealth.com",
      phone: "415-555-7890"
    },
    fundAccountNumbers: ["FND-CH-2025-001"],
    workflowStatus: {
      underConsideration: {
        date: "2024-09-10",
        notes: "Initial protocol review completed"
      },
      sponsorApproval: {
        date: "2024-10-15",
        notes: "Approved with minor modifications"
      },
      ctaStatus: {
        date: "2024-11-20",
        status: "completed",
        notes: "Contract fully executed"
      },
      gcoSubmission: {
        date: "2024-12-01",
        notes: "Submitted for review"
      },
      gcoApproval: {
        date: "2024-12-15",
        notes: "Approved with standard terms"
      },
      irbSubmission: {
        date: "2024-12-20",
        notes: "Full protocol submission"
      },
      irbApproval: {
        date: "2025-01-10",
        notes: "Approved with annual review requirement"
      },
      irbExpiration: {
        date: "2026-01-10"
      }
    }
  },
  {
    studyId: "NEUR-2025-003",
    name: "Safety and Efficacy of Neuroplasticity-Enhancing Drug for Stroke Recovery",
    shortTitle: "NeuroRecovery Trial",
    description: "A randomized controlled trial evaluating a novel neuroplasticity-enhancing drug for improving functional outcomes after ischemic stroke.",
    studyType: "interventional",
    phase: "phase_3",
    therapeuticArea: "Neurology",
    startDate: "2025-03-01",
    estimatedEndDate: "2027-03-01",
    status: "active",
    irbProtocolNumber: "IRB-2024-2468",
    sponsorName: "NeuraTech Therapeutics",
    sponsorType: "industry",
    sponsorContact: {
      name: "Jennifer Lee",
      email: "j.lee@neuratech.com",
      phone: "650-555-1212"
    },
    fundAccountNumbers: ["FND-NT-2025-003"],
    workflowStatus: {
      underConsideration: {
        date: "2024-10-05",
        notes: "Protocol review meeting held"
      },
      sponsorApproval: {
        date: "2024-11-10",
        notes: "Approved with budget adjustments"
      },
      ctaStatus: {
        date: "2024-12-15",
        status: "completed",
        notes: "Contract executed after legal review"
      },
      gcoSubmission: {
        date: "2025-01-05",
        notes: "Submitted with revised budget"
      },
      gcoApproval: {
        date: "2025-01-20",
        notes: "Approved with special terms for IP"
      },
      irbSubmission: {
        date: "2025-02-01",
        notes: "Full submission with all appendices"
      },
      irbApproval: {
        date: "2025-02-20",
        notes: "Approved with monitoring requirement"
      },
      irbExpiration: {
        date: "2026-02-20"
      }
    }
  },
  {
    studyId: "ONCO-2025-007",
    name: "Immunotherapy Combination for Advanced Metastatic Melanoma",
    shortTitle: "MelanoImmune Study",
    description: "A phase 2 study evaluating the safety and efficacy of a novel immunotherapy combination for patients with advanced metastatic melanoma.",
    studyType: "interventional",
    phase: "phase_2",
    therapeuticArea: "Oncology",
    startDate: "2025-02-15",
    estimatedEndDate: "2026-08-15",
    status: "under_consideration",
    sponsorName: "ImmunoGen Biotech",
    sponsorType: "industry",
    sponsorContact: {
      name: "Robert Chang",
      email: "r.chang@immunogen.com",
      phone: "617-555-9876"
    },
    workflowStatus: {
      underConsideration: {
        date: "2025-01-10",
        notes: "Initial protocol review in progress"
      }
    }
  }
];

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinical-research-app', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(async () => {
    console.log('Connected to MongoDB');
    
    try {
      // Clear existing data
      await User.deleteMany({});
      await Study.deleteMany({});
      await Patient.deleteMany({});
      await Budget.deleteMany({});
      await Transaction.deleteMany({});
      
      console.log('Cleared existing data');
      
      // Insert users
      const createdUsers = await User.insertMany(sampleUsers);
      console.log(`Inserted ${createdUsers.length} users`);
      
      // Map user emails to IDs for reference
      const userMap = {};
      createdUsers.forEach(user => {
        userMap[user.email] = user._id;
      });
      
      // Update studies with user references
      const studiesWithRefs = sampleStudies.map(study => {
        // Assign principal investigator
        if (study.studyId === 'CARD-2025-001') {
          study.principalInvestigator = userMap['john.smith@mountsinai.org'];
          study.researchCoordinators = [userMap['sarah.johnson@mountsinai.org']];
        } else if (study.studyId === 'NEUR-2025-003') {
          study.principalInvestigator = userMap['john.smith@mountsinai.org'];
          study.researchCoordinators = [userMap['sarah.johnson@mountsinai.org']];
        } else {
          study.principalInvestigator = userMap['john.smith@mountsinai.org'];
        }
        return study;
      });
      
      // Insert studies
      const createdStudies = await Study.insertMany(studiesWithRefs);
      console.log(`Inserted ${createdStudies.length} studies`);
      
      // Map study IDs for reference
      const studyMap = {};
      createdStudies.forEach(study => {
        studyMap[study.studyId] = study._id;
      });
      
      // Sample patients with study references
      const samplePatients = [
        {
          medicalRecordNumber: "MRN12345678",
          study: studyMap['CARD-2025-001'],
          enrollmentDate: "2025-01-20",
          enrollmentStatus: "enrolled",
          visitSchedule: [
            {
              visitNumber: 1,
              scheduledDate: "2025-01-20",
              actualDate: "2025-01-20",
              status: "completed",
              notes: "Baseline assessments completed"
            },
            {
              visitNumber: 2,
              scheduledDate: "2025-02-20",
              actualDate: "2025-02-22",
              status: "completed",
              notes: "Patient arrived late due to weather"
            },
            {
              visitNumber: 3,
              scheduledDate: "2025-03-20",
              status: "scheduled"
            }
          ],
          events: []
        },
        {
          medicalRecordNumber: "MRN23456789",
          study: studyMap['CARD-2025-001'],
          enrollmentDate: "2025-01-25",
          enrollmentStatus: "enrolled",
          visitSchedule: [
            {
              visitNumber: 1,
              scheduledDate: "2025-01-25",
              actualDate: "2025-01-25",
              status: "completed",
              notes: "All procedures completed per protocol"
            },
            {
              visitNumber: 2,
              scheduledDate: "2025-02-25",
              status: "missed",
              notes: "Patient hospitalized for unrelated condition"
            },
            {
              visitNumber: 3,
              scheduledDate: "2025-03-25",
              status: "scheduled"
            }
          ],
          events: [
            {
              eventType: "adverse_event",
              date: "2025-02-10",
              description: "Mild headache",
              severity: "mild",
              relatedToStudy: false,
              resolution: "Resolved without intervention",
              resolutionDate: "2025-02-11"
            }
          ]
        },
        {
          medicalRecordNumber: "MRN34567890",
          study: studyMap['NEUR-2025-003'],
          enrollmentDate: "2025-03-05",
          enrollmentStatus: "enrolled",
          visitSchedule: [
            {
              visitNumber: 1,
              scheduledDate: "2025-03-05",
              actualDate: "2025-03-05",
              status: "completed",
              notes: "Baseline assessments completed"
            },
            {
              visitNumber: 2,
              scheduledDate: "2025-04-05",
              status: "scheduled"
            }
          ],
          events: []
        },
        {
          medicalRecordNumber: "MRN45678901",
          study: studyMap['NEUR-2025-003'],
          enrollmentDate: "2025-03-10",
          enrollmentStatus: "withdrawn",
          withdrawalReason: "Patient withdrew consent",
          visitSchedule: [
            {
              visitNumber: 1,
              scheduledDate: "2025-03-10",
              actualDate: "2025-03-10",
              status: "completed",
              notes: "Baseline assessments completed"
            }
          ],
          events: []
        },
        {
          medicalRecordNumber: "MRN56789012",
          study: studyMap['CARD-2025-001'],
          enrollmentDate: "2025-01-15",
          enrollmentStatus: "screened",
          visitSchedule: [
            {
              visitNumber: 1,
              scheduledDate: "2025-01-15",
              actualDate: "2025-01-15",
              status: "completed",
              notes: "Screening visit completed"
            }
          ],
          events: []
        }
      ];
      
      // Insert patients
      const createdPatients = await Patient.insertMany(samplePatients);
      console.log(`Inserted ${createdPatients.length} patients`);
      
      // Sample budgets with study references
      const sampleBudgets = [
        {
          study: studyMap['CARD-2025-001'],
          totalAmount: 250000,
          currency: "USD",
          approvalDate: "2024-11-01",
          status: "active",
          createdBy: userMap['michael.chen@mountsinai.org'],
          lineItems: [
            {
              category: "personnel",
              description: "Principal Investigator",
              budgetedAmount: 50000,
              actualAmount: 12500
            },
            {
              category: "personnel",
              description: "Research Coordinator",
              budgetedAmount: 75000,
              actualAmount: 18750
            },
            {
              category: "patient_care",
              description: "Patient Visits",
              budgetedAmount: 100000,
              actualAmount: 15000
            },
            {
              category: "supplies",
              description: "Lab Supplies",
              budgetedAmount: 15000,
              actualAmount: 3000
            },
            {
              category: "equipment",
              description: "ECG Machine Rental",
              budgetedAmount: 10000,
              actualAmount: 2500
            }
          ]
        },
        {
          study: studyMap['NEUR-2025-003'],
          totalAmount: 350000,
          currency: "USD",
          approvalDate: "2025-01-15",
          status: "active",
          createdBy: userMap['michael.chen@mountsinai.org'],
          lineItems: [
            {
              category: "personnel",
              description: "Principal Investigator",
              budgetedAmount: 60000,
              actualAmount: 5000
            },
            {
              category: "personnel",
              description: "Research Coordinator",
              budgetedAmount: 90000,
              actualAmount: 7500
            },
            {
              category: "patient_care",
              description: "Patient Visits",
              budgetedAmount: 150000,
              actualAmount: 10000
            },
            {
              category: "supplies",
              description: "Lab Supplies",
              budgetedAmount: 25000,
              actualAmount: 2000
            },
            {
              category: "travel",
              description: "Investigator Meeting",
              budgetedAmount: 15000,
              actualAmount: 0
            },
            {
              category: "other",
              description: "Publication Costs",
              budgetedAmount: 10000,
              actualAmount: 0
            }
          ]
        },
        {
          study: studyMap['ONCO-2025-007'],
          totalAmount: 400000,
          currency: "USD",
          status: "draft",
          createdBy: userMap['michael.chen@mountsinai.org'],
          lineItems: [
            {
              category: "personnel",
              description: "Principal Investigator",
              budgetedAmount: 70000,
              actualAmount: 0
            },
            {
              category: "personnel",
              description: "Research Coordinator",
              budgetedAmount: 100000,
              actualAmount: 0
            },
            {
              category: "patient_care",
              description: "Patient Visits",
              budgetedAmount: 180000,
              actualAmount: 0
            },
            {
              category: "supplies",
              description: "Lab Supplies",
              budgetedAmount: 30000,
              actualAmount: 0
            },
            {
              category: "equipment",
              description: "Specialized Equipment",
              budgetedAmount: 20000,
              actualAmount: 0
            }
          ]
        }
      ];
      
      // Insert budgets
      const createdBudgets = await Budget.insertMany(sampleBudgets);
      console.log(`Inserted ${createdBudgets.length} budgets`);
      
      // Map budget IDs for reference
      const budgetMap = {};
      createdBudgets.forEach(budget => {
        budgetMap[budget.study.toString()] = budget._id;
      });
      
      // Sample transactions with study and budget references
      const sampleTransactions = [
        {
          study: studyMap['CARD-2025-001'],
          budget: budgetMap[studyMap['CARD-2025-001'].toString()],
          transactionType: "invoice",
          amount: 50000,
          date: "2025-01-30",
          status: "completed",
          invoiceNumber: "INV-CARD-001",
          dueDate: "2025-02-28",
          itemsBilled: [
            {
              description: "Study Start-up Fee",
              amount: 25000,
              quantity: 1
            },
            {
              description: "Patient Enrollment (5 patients)",
              amount: 5000,
              quantity: 5
            }
          ],
          recipient: {
            name: "CardioHealth Pharmaceuticals",
            email: "accounts@cardiohealth.com",
            address: "123 Pharma Way, Boston, MA 02115"
          },
          createdBy: userMap['michael.chen@mountsinai.org']
        },
        {
          study: studyMap['CARD-2025-001'],
          budget: budgetMap[studyMap['CARD-2025-001'].toString()],
          transactionType: "payment",
          amount: 50000,
          date: "2025-02-15",
          status: "completed",
          paymentMethod: "wire_transfer",
          referenceNumber: "WT-CH-12345",
          payerInformation: {
            name: "CardioHealth Pharmaceuticals",
            contactInfo: "accounts@cardiohealth.com"
          },
          createdBy: userMap['michael.chen@mountsinai.org']
        },
        {
          study: studyMap['CARD-2025-001'],
          budget: budgetMap[studyMap['CARD-2025-001'].toString()],
          transactionType: "invoice",
          amount: 25000,
          date: "2025-03-15",
          status: "pending",
          invoiceNumber: "INV-CARD-002",
          dueDate: "2025-04-15",
          itemsBilled: [
            {
              description: "Monthly Monitoring Fee",
              amount: 5000,
              quantity: 1
            },
            {
              description: "Patient Visit Completion (10 visits)",
              amount: 2000,
              quantity: 10
            }
          ],
          recipient: {
            name: "CardioHealth Pharmaceuticals",
            email: "accounts@cardiohealth.com",
            address: "123 Pharma Way, Boston, MA 02115"
          },
          createdBy: userMap['michael.chen@mountsinai.org']
        },
        {
          study: studyMap['NEUR-2025-003'],
          budget: budgetMap[studyMap['NEUR-2025-003'].toString()],
          transactionType: "invoice",
          amount: 75000,
          date: "2025-03-10",
          status: "completed",
          invoiceNumber: "INV-NEUR-001",
          dueDate: "2025-04-10",
          itemsBilled: [
            {
              description: "Study Start-up Fee",
              amount: 35000,
              quantity: 1
            },
            {
              description: "Patient Enrollment (4 patients)",
              amount: 10000,
              quantity: 4
            }
          ],
          recipient: {
            name: "NeuraTech Therapeutics",
            email: "finance@neuratech.com",
            address: "456 Innovation Drive, San Francisco, CA 94107"
          },
          createdBy: userMap['michael.chen@mountsinai.org']
        },
        {
          study: studyMap['NEUR-2025-003'],
          budget: budgetMap[studyMap['NEUR-2025-003'].toString()],
          transactionType: "payment",
          amount: 75000,
          date: "2025-04-05",
          status: "completed",
          paymentMethod: "check",
          referenceNumber: "CHK-NT-54321",
          payerInformation: {
            name: "NeuraTech Therapeutics",
            contactInfo: "finance@neuratech.com"
          },
          createdBy: userMap['michael.chen@mountsinai.org']
        },
        {
          study: studyMap['CARD-2025-001'],
          budget: budgetMap[studyMap['CARD-2025-001'].toString()],
          transactionType: "invoice",
          amount: 15000,
          date: "2025-01-15",
          status: "overdue",
          invoiceNumber: "INV-CARD-000",
          dueDate: "2025-02-15",
          itemsBilled: [
            {
              description: "Protocol Review Fee",
              amount: 15000,
              quantity: 1
            }
          ],
          recipient: {
            name: "CardioHealth Pharmaceuticals",
            email: "accounts@cardiohealth.com",
            address: "123 Pharma Way, Boston, MA 02115"
          },
          createdBy: userMap['michael.chen@mountsinai.org']
        }
      ];
      
      // Insert transactions
      const createdTransactions = await Transaction.insertMany(sampleTransactions);
      console.log(`Inserted ${createdTransactions.length} transactions`);
      
      // Update budgets with transaction references
      for (const budget of createdBudgets) {
        const transactions = createdTransactions.filter(
          t => t.budget.toString() === budget._id.toString()
        );
        budget.transactions = transactions.map(t => t._id);
        await budget.save();
      }
      console.log('Updated budgets with transaction references');
      
      console.log('Sample data loaded successfully');
    } catch (error) {
      console.error('Error loading sample data:', error);
    } finally {
      mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB', err);
  });
