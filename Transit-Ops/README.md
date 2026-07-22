# TransitOps — Advanced Fleet Management System

TransitOps is a highly advanced, full-stack fleet management and logistics dashboard tailored for large-scale operations. It manages vehicles, drivers, trips, maintenance, and fuel expenses while enforcing strict role-based access control (RBAC), intelligent dispatching, and dynamic route calculations.

## Tech Stack

| Layer      | Technology                                                                                                 |
|------------|-------------------------------------------------------------------------------------------------------------|
| **Frontend**   | React 19, TypeScript, Vite, Tailwind CSS (v4), React-Leaflet, date-fns, Recharts, Axios                 |
| **Backend**    | Node.js, Express, Prisma ORM, JWT, bcrypt, OSRM/Nominatim API Integration                               |
| **Database**   | PostgreSQL (Neon/Supabase)                                                                              |
| **Auth**       | JWT with robust RBAC (Admin, Manager, Driver, Safety Officer, Financial Analyst)                        |

## Getting Started

### Prerequisites

- Node.js ≥ 18
- PostgreSQL database

### 1. Backend Setup

```bash
cd backend
npm install
```

Update `backend/.env` with your PostgreSQL connection string:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/transitops?schema=public"
JWT_SECRET="your-random-secret"
```

Initialize your database schema and seed the initial data:

```bash
# Push schema updates safely without dropping data
npx prisma db push

# Generate Prisma Client
npx prisma generate

# (Optional) Seed the database with mock roles and data
npm run seed
```

Start the API server (runs on `http://localhost:5000`):

```bash
npm start
# OR for development with auto-reloading:
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:5173` and automatically proxies `/api` calls to `http://localhost:5000`.

---

## Core Features & Functionality

TransitOps has been deeply enhanced beyond basic CRUD operations to support real-world, automated logistics workflows.

### 1. Smart Dispatch & Matching
- **Capacity & Cargo Math**: When planning a trip, entering a cargo weight dynamically filters and recommends vehicles that meet the payload requirement.
- **Safety Score Prioritization**: Drivers are intelligently sorted and recommended based on their lifetime safety scores, guaranteeing the safest drivers are surfaced first for high-value routes.

### 2. Interactive Map & Auto-Routing
- **OSRM Integration**: Replaced static text inputs with an interactive map (Leaflet) and autocomplete location picker powered by Nominatim.
- **Auto-Distance Calculation**: Selecting an origin and destination automatically hits the OSRM routing engine, visualizes the optimal path on the map, and accurately calculates the **Planned Distance (km)**, eliminating manual data entry.

### 3. Automated Trip Lifecycle
- Trips progress through a strict state machine: `Draft` → `Scheduled` → `In Progress` → `Completed` (or `Cancelled`).
- **Vehicle Locking**: Dispatching a trip automatically marks the vehicle's status as `ON_TRIP`, preventing it from being double-booked. Completing the trip releases it back to `AVAILABLE`.
- **Smart Completion**: 
  - The "Complete Trip" modal auto-fills the **Distance Covered** based on the route's planned distance.
  - Entering **Fuel Consumed** instantly calculates the **Fuel Cost** using a dynamic fuel price fetched securely from the database (`SystemConfig`).
  - Operators can manually override the fuel cost if the pump price differed.

### 4. Automatic Side-Effects (Fuel Logs)
- To maintain data parity, completing a trip with fuel data automatically creates a linked **Fuel Expense Log** behind the scenes within the same database transaction.
- This ensures the Financial Analyst dashboard is always up-to-date with the latest operational expenditures without requiring drivers to log expenses twice.

### 5. Role-Based Notifications
- A persistent bell icon tracks unread notifications.
- The system supports both **Targeted Notifications** (e.g. telling a specific driver they were assigned a trip) and **Broadcast Notifications** (e.g. alerting all Managers when a trip is dispatched).
- Triggered dynamically via backend lifecycle hooks.

### 6. Strict Data Integrity
- Enforces strict unique constraints on critical entities, such as Vehicle Registration Numbers and **Driver License Numbers**, gracefully throwing HTTP 400 errors if duplicates are detected.
- Includes frontend inline validation mapping these backend errors natively to the UI.

### 7. Dynamic System Configuration
- Key operational variables (like `fuelPricePerLiter`) are strictly decoupled from the codebase and stored in the database's `SystemConfig` table.
- Accessible globally to components to power live cost estimates.

## Demo Credentials (If Seeded)

| Role              | Email                           | Password       |
|-------------------|---------------------------------|----------------|
| Admin             | admin@transitops.com            | Admin@123      |
| Manager           | manager@transitops.com          | Manager@123    |
| Driver            | driver@transitops.com           | Driver@123     |
| Financial Analyst | finance@transitops.com          | Finance@123    |

---
*Built for scalable, modern transit operations.*
