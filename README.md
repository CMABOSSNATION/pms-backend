# 🏛️ PrisonCore — Backend API

Node.js + Express + Prisma + SQLite REST API for the Prison Management System.

---

## 📁 Folder Structure

```
pms-backend/
├── src/
│   ├── server.js                  ← Express app entry point
│   ├── config/
│   │   ├── prisma.js              ← Prisma client singleton
│   │   └── seed.js                ← Database seeder (demo data)
│   ├── middleware/
│   │   ├── auth.js                ← JWT verify + role guard
│   │   ├── audit.js               ← Auto audit trail on mutations
│   │   └── errorHandler.js        ← Global error + 404 handler
│   ├── controllers/
│   │   ├── authController.js      ← Login, me, change password
│   │   ├── prisonerController.js  ← Full CRUD + movements
│   │   ├── incidentController.js  ← Log, resolve, delete
│   │   ├── scanController.js      ← Scan lookup + log
│   │   ├── staffController.js     ← User management
│   │   └── reportsController.js   ← Dashboard + analytics
│   └── routes/
│       ├── index.js               ← Central router
│       ├── auth.js
│       ├── prisoners.js
│       ├── incidents.js
│       ├── scans.js
│       ├── staff.js
│       └── reports.js
├── prisma/
│   └── schema.prisma              ← All DB models
├── .env.example                   ← Copy to .env and fill in
├── .gitignore
└── package.json
```

---

## 🚀 Setup & Run

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env — set JWT_SECRET to a long random string
```

### 3. Create the database
```bash
npm run db:push
```

### 4. Seed demo data
```bash
npm run db:seed
```

### 5. Start the server
```bash
npm run dev        # development (auto-restart)
npm start          # production
```

Server runs at: `http://localhost:5000`

---

## 🔑 Demo Login Accounts

| Role    | Email                        | Password      |
|---------|------------------------------|---------------|
| Warden  | warden@prisoncore.local      | Warden@1234   |
| Guard   | guard@prisoncore.local       | Guard@1234    |
| Medical | medical@prisoncore.local     | Medical@1234  |

---

## 📡 API Endpoints

### Auth
| Method | Endpoint                  | Access  |
|--------|---------------------------|---------|
| POST   | /api/auth/login           | Public  |
| GET    | /api/auth/me              | All     |
| PUT    | /api/auth/change-password | All     |

### Prisoners
| Method | Endpoint                        | Access         |
|--------|---------------------------------|----------------|
| GET    | /api/prisoners                  | All            |
| GET    | /api/prisoners/:id              | All            |
| POST   | /api/prisoners                  | Warden, Admin  |
| PUT    | /api/prisoners/:id              | Warden, Guard  |
| DELETE | /api/prisoners/:id              | Warden, Admin  |
| POST   | /api/prisoners/:id/movements    | All            |

### Incidents
| Method | Endpoint                        | Access         |
|--------|---------------------------------|----------------|
| GET    | /api/incidents                  | All            |
| POST   | /api/incidents                  | All            |
| PUT    | /api/incidents/:id/resolve      | All            |
| DELETE | /api/incidents/:id              | Warden, Admin  |

### Scans
| Method | Endpoint   | Access |
|--------|------------|--------|
| GET    | /api/scans | All    |
| POST   | /api/scans | All    |

### Staff
| Method | Endpoint        | Access        |
|--------|-----------------|---------------|
| GET    | /api/staff      | All           |
| POST   | /api/staff      | Warden, Admin |
| PUT    | /api/staff/:id  | Warden, Admin |
| DELETE | /api/staff/:id  | Warden, Admin |

### Reports
| Method | Endpoint                  | Access |
|--------|---------------------------|--------|
| GET    | /api/reports/dashboard    | All    |
| GET    | /api/reports/blocks       | All    |
| GET    | /api/reports/risk         | All    |
| GET    | /api/reports/incidents    | All    |

---

## 🔒 Role Permissions

| Action              | WARDEN | GUARD | MEDICAL | ADMIN |
|---------------------|--------|-------|---------|-------|
| View all data       | ✅     | ✅    | ✅      | ✅    |
| Add prisoner        | ✅     | ❌    | ❌      | ✅    |
| Edit prisoner       | ✅     | ✅    | ❌      | ✅    |
| Delete prisoner     | ✅     | ❌    | ❌      | ✅    |
| Log incident        | ✅     | ✅    | ✅      | ✅    |
| Delete incident     | ✅     | ❌    | ❌      | ✅    |
| Manage staff        | ✅     | ❌    | ❌      | ✅    |
| Perform scan        | ✅     | ✅    | ✅      | ✅    |

---

## 🗺️ Roadmap

- [ ] Visitor scheduling endpoints
- [ ] Medical records endpoints
- [ ] File upload (prisoner photos)
- [ ] WebSocket alerts for real-time incidents
- [ ] Rate limiting & helmet security headers
- [ ] Switch to PostgreSQL for production
