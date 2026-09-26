# DD Finserve - Daily EMI Microfinance Web App

A full-stack Finance Web Application built for Daily EMI Collection, Customer KYC Onboarding, Loan Portfolio Management, and Field Agent Collection Tracking.

---

## Tech Stack

- **Frontend**: Angular 22, Angular Material, TypeScript, HTML5/CSS3
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (via Mongoose)

---

## Project Structure

```
dd-finserve/
├── src/                       # Angular Frontend Source Code
│   ├── app/
│   │   ├── components/
│   │   │   ├── header/        # Firm Brand Header & Logo
│   │   │   ├── footer/        # Firm Footer & Info
│   │   │   ├── customer-list/ # 12-Column Table, Metrics & Filters
│   │   │   └── customer-dialog/# Add Customer Modal with Auto-EMI Calc
│   │   ├── models/            # TypeScript Interfaces
│   │   └── services/          # REST API & LocalStorage Fallback Service
├── server/                    # Node.js + Express Backend
│   ├── src/
│   │   ├── config/            # MongoDB Connection Handler
│   │   ├── models/            # Customer, Loan, Collection Mongoose Schemas
│   │   ├── controllers/       # Business Logic & Calculations
│   │   ├── routes/            # REST API Endpoints
│   │   ├── seed.js            # Sample Data Seeder
│   │   └── server.js          # Express Entrypoint
│   ├── .env.example           # Environment Configuration Template
│   └── package.json           # Backend Dependencies
├── package.json               # Frontend Dependencies
└── README.md
```

---

## How to Setup & Run on Another PC

### 1. Clone the Repository
```bash
git clone <YOUR-GITHUB-REPO-URL>
cd dd-finserve
```

### 2. Install Dependencies

#### Frontend (Root directory):
```bash
npm install
```

#### Backend (`server` directory):
```bash
cd server
npm install
cd ..
```

---

### 3. Configure Backend Environment
Inside the `server/` directory, create a `.env` file (copied from `.env.example`):
```bash
cd server
copy .env.example .env
```

Edit `server/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/dd_finserve
# Or for MongoDB Atlas Cloud:
# MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/dd_finserve?retryWrites=true&w=majority
```

---

### 4. Run the Project

#### Step A: Start Backend Server (Terminal 1)
```bash
cd server
npm start
```
*Backend runs on `http://localhost:5000`*

*(Optional) Seed sample data:*
```bash
cd server
npm run seed
```

#### Step B: Start Frontend Web App (Terminal 2)
In the project root:
```bash
npm start
```
*Frontend runs on `http://localhost:4200`*

---

## Features

- **Header with DD Finserve Logo**: Custom financial emblem and live API connection status indicator.
- **Customer Directory Table**: Full table showing Customer ID, Name, Mobile, Address, Loan Amount (₹), Daily EMI (₹), Total EMI (days), Dates, Collector, KYC status, and Status badges.
- **Add Customer Modal**: Live auto-calculation of Daily EMI and End Date, file upload for KYC documents (Aadhaar/PAN), and mobile validation.
- **Dual-Mode Persistence**: Automatically uses live MongoDB backend; seamlessly falls back to offline localStorage mode if MongoDB is offline.
