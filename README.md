# Enterprise HR & Employee Management System (MERN)

A complete, production-structured **Enterprise HR & Employee Management System** built with the **MERN stack** (MongoDB, Express.js, React, Node.js). Designed for real-world corporate HR operations with strict Role-Based Access Control (RBAC), JWT authentication with HTTP-only refresh cookies, real-time MongoDB analytics, transactional leave balance updates, PDF payslips, CSV/PDF reporting, and full audit traceability.

---

## Key Features

### 1. Security, Authentication & RBAC
- **Roles**: `SUPER_ADMIN`, `HR_MANAGER`, `DEPARTMENT_MANAGER`, `EMPLOYEE`
- JWT access tokens + HTTP-only refresh token cookies with token rotation
- Password hashing with `bcryptjs` (12 salt rounds)
- Login, Logout, Forgot Password, Reset Password, Change Password, Account Activation/Deactivation
- Strict server-side RBAC on every protected API endpoint and document download
- Helmet security headers, CORS allowlist, Express Rate Limit, NoSQL operator sanitization, 1MB payload limits

### 2. Enterprise Dashboard & Real-Time Analytics
- 8 live KPI cards queried directly from MongoDB: Total Employees, Active, Inactive, Total Departments, Present Today, Absent Today, On Leave, Pending Leaves
- 5 responsive **Recharts** visualizations with date range & month filters:
  - Employee Growth by Month (cumulative headcount & new hires)
  - Attendance Statistics (Present, Late, Half-Day, Absent)
  - Department-wise Employee Distribution
  - Leave Statistics by Type & Status
  - Monthly Recruitment Pipeline
- Widgets: Quick Check-In/Out, Pending Leave Approvals (inline approve/reject), Recent Employees, Upcoming Birthdays, Recent Activities, Recent Notifications

### 3. Employee & Department Management
- Full Employee lifecycle CRUD, duplicate email/Employee ID protection, soft deactivation & reactivation, search, multi-filter (department, designation, status), sorting, pagination, CSV export
- Rich Employee Profile page with Personal Info, Employment Details, Attendance History, Leave History, restricted Documents upload/download, and restricted Salary details
- 7 default enterprise departments (`Human Resources`, `Information Technology`, `Finance`, `Marketing`, `Sales`, `Operations`, `Customer Support`) with active-employee deletion guard

### 4. Attendance & Leave Management
- Check-in & check-out with UTC storage and company-timezone display
- Enforces 1 record per employee per workday, prevents duplicate check-in, prevents checkout without check-in, auto-calculates working hours, overtime, late arrivals, early departures, and half-day status
- Both Table and Monthly Calendar views
- 6 Leave types (`Casual`, `Sick`, `Earned`, `Unpaid`, `Maternity`, `Paternity`), overlap validation, supporting document uploads, self-approval block, approval history, and transactional `LeaveBalance` updates (with standalone MongoDB fallback)

### 5. Payroll & Payslip Generation
- Formula: `Net Salary = Basic Salary + HRA + Other Allowances + Bonus - Deductions`
- Strictly restricted to `SUPER_ADMIN` & `HR_MANAGER` for management; employees view/download only their own payslips; managers cannot view team salaries
- Real server-side **PDF payslip generation** via `pdfkit`
- *Scope note*: Records internal payroll and computes salary statements; does not execute bank transfers or statutory tax filings.

### 6. Recruitment, Performance, Notifications, Reports, Audit Logs & Settings
- **Recruitment**: Job openings, candidate tracking with resume uploads, interview scheduling & feedback, and one-click conversion of `Selected`/`Hired` candidates into active Employees
- **Performance**: Reviews, weighted goals with progress bars, 1–5 ratings, manager feedback & employee self-feedback/acknowledgement
- **Notifications**: In-app notification bell with live unread badge, dropdown, full history, mark read / mark all read
- **Reports**: Employee, Department, Attendance, Leave, Payroll, Recruitment, and Performance reports with date/department/employee filters, **CSV export**, **PDF export**, and print layout
- **Audit Logs**: Immutable action trail restricted to `SUPER_ADMIN`
- **Company Settings**: Company branding & logo upload, timezone, working days/hours, attendance thresholds, leave entitlements, notification preferences, and User/Role management

---

## Technology Stack

| Layer | Technologies |
| --- | --- |
| **Frontend** | React 18, Vite, JavaScript, Tailwind CSS, React Router DOM, Axios, React Hook Form, Recharts, Lucide React, React Toastify |
| **Backend** | Node.js, Express.js, Mongoose, JWT, bcryptjs, Zod, Helmet, CORS, Express Rate Limit, Cookie Parser, Multer, PDFKit |
| **Database** | MongoDB (Local MongoDB 8.0 or MongoDB Atlas) |
| **Testing** | Jest + Supertest (Backend API & RBAC integration), Vitest + React Testing Library (Frontend components & validation) |

---

## Project Folder Structure

```text
enterprise-hr-management/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── layout/
│   │   │   ├── dashboard/
│   │   │   ├── employees/
│   │   │   ├── departments/
│   │   │   ├── attendance/
│   │   │   ├── leave/
│   │   │   └── payroll/
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── employees/
│   │   │   ├── departments/
│   │   │   ├── attendance/
│   │   │   ├── leaves/
│   │   │   ├── payroll/
│   │   │   ├── recruitment/
│   │   │   ├── performance/
│   │   │   ├── reports/
│   │   │   ├── notifications/
│   │   │   ├── audit/
│   │   │   └── settings/
│   │   ├── services/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── test/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   └── package.json
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── validators/
│   ├── utils/
│   ├── scripts/
│   ├── tests/
│   ├── app.js
│   ├── server.js
│   ├── .env.example
│   └── package.json
├── .gitignore
├── .env.example
└── README.md
```

---

## Architecture

- **Clean Layered Backend**: Routes → Middleware (`protect`, `authorize`, `validate`, `upload`) → Controllers → Services (`auditService`, `notificationService`, `settingsService`, `leaveBalanceService`) → Mongoose Models.
- **Database Consistency**: `utils/transaction.js` runs multi-document updates inside Mongoose ACID transactions on Replica Sets / MongoDB Atlas and gracefully falls back on standalone local MongoDB instances.
- **File Security**: Only visual assets (`uploads/profiles`, `uploads/logos`) are served statically. Private employee documents, leave attachments, and resumes are streamed strictly through authenticated RBAC endpoints.

---

## Prerequisites

- **Node.js** v18+ (tested on v22.17.0)
- **npm** v9+
- **MongoDB** (Local MongoDB Community Server 6/7/8 or MongoDB Atlas cluster)

---

## Installation & Setup

### 1. Clone & Install Dependencies

```bash
cd enterprise-hr-management/backend
npm install

cd ../frontend
npm install
```

### 2. Environment Configuration

Copy the environment templates and fill in secure secrets:

**Backend (`backend/.env`):**
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/enterprise_hr_db
JWT_SECRET=replace_with_a_64_char_random_hex_secret
JWT_REFRESH_SECRET=replace_with_another_64_char_random_hex_secret
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

**Frontend (`frontend/.env`):**
```env
VITE_API_URL=http://localhost:5000/api
```

> Never commit `.env` files or expose backend secrets through `VITE_*` variables.

### 3. MongoDB Setup & Initial Administrator

Ensure MongoDB is running locally (`mongod` / Windows `MongoDB` service) or configure a MongoDB Atlas connection string in `MONGO_URI`.

**For Production / Clean Setup (Secure Initial Admin):**
```bash
cd backend
# PowerShell:
$env:ADMIN_EMAIL="admin@yourcompany.com"; $env:ADMIN_PASSWORD="StrongPassword!2026"; $env:ADMIN_NAME="System Admin"; npm run setup:admin
# Bash / macOS / Linux:
ADMIN_EMAIL=admin@yourcompany.com ADMIN_PASSWORD="StrongPassword!2026" ADMIN_NAME="System Admin" npm run setup:admin
```

**For Local Development Only (Realistic Demo Data):**
The demo seeder refuses to run when `NODE_ENV=production`:
```bash
cd backend
npm run seed:dev
```
This seeds 7 default departments, sample employees across all 4 roles, attendance logs, leaves, payroll records, jobs, candidates, interviews, performance reviews, notifications, and audit logs.
Default dev demo accounts (password: `DemoPass@123` unless overridden via `DEMO_SEED_PASSWORD`):
- Super Admin: `admin@enterprisehr.demo`
- HR Manager: `hr@enterprisehr.demo`
- Department Manager: `manager@enterprisehr.demo`
- Employee: `employee@enterprisehr.demo`

### 4. Run Backend & Frontend

**Terminal 1 — Backend API (`http://localhost:5000`):**
```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend App (`http://localhost:5173`):**
```bash
cd frontend
npm run dev
```

---

## API Documentation Summary

| Module | Endpoints |
| --- | --- |
| **Auth** | `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me`, `PUT /api/auth/me`, `POST /api/auth/change-password`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`, `GET/POST /api/auth/users`, `PUT /api/auth/users/:id` |
| **Employees** | `GET/POST /api/employees`, `GET /api/employees/export`, `GET/PUT/DELETE /api/employees/:id`, `PATCH /api/employees/:id/reactivate`, `POST /api/employees/:id/photo`, `POST /api/employees/:id/documents`, `GET /api/employees/:id/documents/:docId` |
| **Departments** | `GET/POST /api/departments`, `GET/PUT/DELETE /api/departments/:id` |
| **Attendance** | `GET /api/attendance`, `GET /api/attendance/my`, `POST /api/attendance/check-in`, `POST /api/attendance/check-out`, `POST /api/attendance/manual` |
| **Leaves** | `GET/POST /api/leaves`, `GET /api/leaves/my`, `PUT /api/leaves/:id/approve`, `PUT /api/leaves/:id/reject`, `PUT /api/leaves/:id/cancel`, `GET /api/leaves/:id/document` |
| **Payroll** | `GET/POST /api/payroll`, `GET /api/payroll/my`, `GET/PUT /api/payroll/:id`, `GET /api/payroll/:id/payslip` |
| **Recruitment** | `GET/POST /api/jobs`, `PUT /api/jobs/:id`, `GET/POST /api/candidates`, `PUT /api/candidates/:id`, `GET /api/candidates/:id/resume`, `POST /api/candidates/:id/convert`, `GET/POST /api/interviews`, `PUT /api/interviews/:id` |
| **Performance** | `GET/POST /api/performance`, `PUT /api/performance/:id` |
| **Dashboard** | `GET /api/dashboard/stats`, `GET /api/dashboard/charts` |
| **Notifications** | `GET /api/notifications`, `PUT /api/notifications/:id/read`, `PUT /api/notifications/read-all` |
| **Reports** | `GET /api/reports/{employees,departments,attendance,leaves,payroll,recruitment,performance}?format=json|csv|pdf` |
| **Audit & Settings** | `GET /api/audit-logs`, `GET/PUT /api/settings`, `POST /api/settings/logo` |

---

## Testing

**Backend Integration & RBAC Tests (Jest + Supertest):**
```bash
cd backend
npm test
```

**Frontend Component & Form Validation Tests (Vitest + React Testing Library):**
```bash
cd frontend
npm test
```

**Frontend Production Build Verification:**
```bash
cd frontend
npm run build
```

---

## External Service Notes (Email / SMTP)

Because no external SMTP credentials are configured by default, `POST /api/auth/forgot-password` stores a securely hashed 30-minute reset token in MongoDB and returns it only when `NODE_ENV !== 'production'` so you can test the complete reset flow locally. For production email delivery, configure an SMTP provider (e.g., Nodemailer with SendGrid, Postmark, or Amazon SES) inside `backend/controllers/authController.js`.

---

## GitHub & Deployment Instructions

### Pushing to GitHub
```bash
cd enterprise-hr-management
git init
git add .
git commit -m "Initial commit: Enterprise HR & Employee Management System"
git branch -M main
git remote add origin https://github.com/<your-username>/enterprise-hr-management.git
git push -u origin main
```

### Production Deployment Checklist
1. Provision a **MongoDB Atlas** M0/M10+ cluster (supports full multi-document ACID transactions) and whitelist your backend host IP.
2. Deploy **Backend** (e.g., Render, Railway, AWS ECS, or DigitalOcean App Platform):
   - Set `NODE_ENV=production`, `PORT`, `MONGO_URI`, strong 64-byte `JWT_SECRET` & `JWT_REFRESH_SECRET`, and `CLIENT_URL=https://your-frontend-domain.com`.
   - Run `npm run setup:admin` once to initialize the Super Admin account and default departments.
3. Deploy **Frontend** (e.g., Vercel, Netlify, or Cloudflare Pages):
   - Set build command `npm run build`, publish directory `dist`, and environment variable `VITE_API_URL=https://your-backend-domain.com/api`.
   - Configure SPA rewrite (`/* -> /index.html`).
