# EduManage - UK School Management System

## Overview

EduManage is a modern web-based UK school management system designed for staff/admin users to manage students, attendance, behaviour tracking, and detentions. The application features a clean, professional interface with a React frontend and Express backend, using PostgreSQL for data persistence.

**Test Login Credentials:**
- Username: `test`
- Password: `test1234`

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state caching and synchronization
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Form Handling**: React Hook Form with Zod validation
- **Charts**: Recharts for dashboard data visualization
- **Build Tool**: Vite with path aliases (@/ for client/src, @shared/ for shared code)

### Backend Architecture
- **Framework**: Express 5 on Node.js
- **Language**: TypeScript with ES Modules
- **Session Management**: express-session with MemoryStore (development) or connect-pg-simple (production)
- **API Pattern**: RESTful endpoints defined in shared/routes.ts with Zod schemas for type-safe request/response validation

### Database Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: shared/schema.ts (shared between frontend and backend)
- **Migrations**: Drizzle Kit with `db:push` command for schema sync
- **Connection**: Node-postgres (pg) Pool

### Data Models
- **Users**: Staff/admin accounts with username, password, name, role
- **Students**: Personal info, year group, tutor group, attendance percentage, behaviour points
- **Attendance**: Daily AM/PM session records with status (PRESENT, LATE, ABSENT variants)
- **Behaviour**: Positive/negative incidents with categories and points
- **Detentions**: Scheduled detentions with type, date, location, and status

### Authentication Flow
- Session-based authentication using express-session
- Protected routes on frontend check auth state via /api/auth/me endpoint
- Single user type: Staff/Admin (merged role)

### Build Process
- Development: `npm run dev` - tsx runs server with Vite middleware for HMR
- Production: `npm run build` - Vite builds client, esbuild bundles server
- Output: dist/public (client assets) and dist/index.cjs (server bundle)

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via DATABASE_URL environment variable
- **Drizzle ORM**: Database operations and schema management

### UI Component Libraries
- **shadcn/ui**: Pre-built accessible components based on Radix UI primitives
- **Radix UI**: Headless UI primitives for dialogs, dropdowns, forms, etc.
- **Lucide React**: Icon library

### Development Tools
- **Vite**: Frontend build tool with React plugin
- **Replit Plugins**: Runtime error overlay, cartographer, dev banner (development only)

### Session Storage
- **MemoryStore**: In-memory session storage for development
- **connect-pg-simple**: PostgreSQL session storage (available for production)