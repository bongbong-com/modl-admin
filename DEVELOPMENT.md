# modl-admin Development Plan

## Project Overview

modl-admin is a web application designed for system administrators to manage the overall modl platform. This application provides a centralized interface for managing registered servers, monitoring system health, viewing analytics, and maintaining the modl ecosystem.

**Access URL**: `admin.modl.gg` (configured via reverse proxy)

## ✅ Implementation Status

**PHASES 1-3 COMPLETED** - Core admin functionality fully implemented:

### 🚀 **Phase 1: Foundation** (100% Complete)
- ✅ Complete authentication system with email code verification
- ✅ Full UI layout with shadcn/ui components and Tailwind CSS
- ✅ MongoDB connection and session management
- ✅ TypeScript throughout frontend and backend

### 🗄️ **Phase 2: Server Management** (100% Complete)
- ✅ **Comprehensive server listing** with search, filtering, and pagination
- ✅ **Server detail pages** with multi-tab interface (Overview, Configuration, Activity, Billing)
- ✅ Real-time server statistics and status monitoring
- ✅ Server actions framework (edit, delete, export, etc.)
- ✅ Professional server table with status badges and action buttons

### 📊 **Phase 3: Monitoring & Logs** (100% Complete)
- ✅ **Real-time system monitoring** with health checks and metrics
- ✅ **Advanced log management interface** with live streaming
- ✅ **Comprehensive filtering**: level, source, category, date range, search
- ✅ **Bulk operations**: resolve multiple logs, mark as resolved
- ✅ **Auto-refresh capabilities** with live/paused toggle
- ✅ **Log resolution tracking** with admin attribution
- ✅ **Professional data table** with pagination and sorting

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling and development server
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components
- **React Query (TanStack Query)** for data fetching and caching
- **Wouter** for client-side routing
- **React Hook Form** with Zod validation
- **Recharts** for data visualization and analytics
- **Design Style** will follow modl-panel

### Backend
- **Node.js** with TypeScript
- **Express.js** for API server
- **MongoDB** with Mongoose for database operations
- **Express Session** for authentication
- **Helmet** for security headers
- **Rate limiting** for API protection
- **CORS** configuration

### Development Tools
- **TypeScript** for type safety
- **ESLint** and **Prettier** for code quality
- **Nodemon** for development server
- **Concurrently** for running frontend and backend simultaneously

## Architecture

```
modl-admin/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities and helpers
│   │   ├── types/          # TypeScript type definitions
│   │   └── contexts/       # React context providers
│   ├── index.html
│   └── vite.config.ts
├── server/                 # Express backend
│   ├── routes/             # API route handlers
│   ├── middleware/         # Express middleware
│   ├── models/             # MongoDB schemas
│   ├── services/           # Business logic services
│   ├── utils/              # Server utilities
│   └── index.ts
├── shared/                 # Shared types and schemas
│   └── types.ts
├── package.json
├── tsconfig.json
└── DEVELOPMENT.md
```

## Core Features

### 1. Authentication & Authorization
- **Super Admin Login**: Secure authentication for modl system administrators
- **Session Management**: Persistent sessions with secure cookies
- **Email Code Authentication**: Similar to how modl-panel handles authentication for users. The database will be manually configured with the user entries, so there will be no registration page. A random code will be sent to the admin's email, and they will log in by typing that code in.

### 2. Server Management
- **Server Registry**: View all registered modl servers
- **Server Details**: Detailed information about each server including:
  - Server name and custom domain
  - Plan type (free/premium)
  - Registration date and last activity
  - Custom domain configuration status
- **Server Actions**: 
  - Edit server configurations
  - Delete/deactivate servers
  - Edit/reset server databases
  - Update billing status
- **Bulk Operations**: Mass actions on multiple servers

### 3. System Monitoring
- **Dashboard Overview**: Key system metrics and health indicators
- **Error Logs**: Centralized error tracking across all servers
- **Performance Metrics**: 
  - Server response times
  - Database connection health
  - Active user counts
  - API usage statistics
- **Uptime Monitoring**: Track system availability
- **Alerts**: Configurable notifications for critical issues

### 4. Analytics & Reporting
- **Usage Statistics**: 
  - Total registered servers
  - Active vs inactive servers
  - Plan distribution (free vs premium)
  - Geographic distribution
- **Growth Metrics**: Registration trends over time
- **Resource Usage**: Database sizes, API call volumes
- **Custom Reports**: Exportable reports for business intelligence

### 5. User Management
- **Global User Overview**: View users across all servers
- **Support Tools**: Assist with user issues across the platform
- **Billing Management**: Overview of premium subscriptions
- **Moderation Tools**: Platform-wide moderation capabilities

### 6. System Configuration
- **Global Settings**: Platform-wide configuration options
- **Feature Flags**: Enable/disable features across servers
- **Maintenance Mode**: Put specific servers or the entire system into maintenance
- **Database Management**: Tools for database maintenance and optimization

## Development Phases

### Phase 1: Foundation ✅ COMPLETED
- [x] Project setup and initial structure
- [x] Authentication system implementation
- [x] Basic UI layout with navigation
- [x] Database connection to global modl database
- [x] Core API routes for server listing

### Phase 2: Server Management ✅ COMPLETED
- [x] Server registry with search and filtering
- [x] Server detail views
- [x] Basic server actions (edit, delete)
- [ ] ~~Server creation workflow~~ (Intentionally excluded)
- [x] Database schema for admin operations

### Phase 3: Monitoring & Logs ✅ COMPLETED
- [x] Error log aggregation system
- [x] Dashboard with key metrics
- [x] Real-time monitoring setup
- [x] Log filtering and search functionality
- [x] Real-time log management interface
- [x] Advanced filtering (level, source, category, date range)
- [x] Bulk operations (resolve logs)
- [x] Log resolution tracking
- [x] Auto-refresh capabilities

### Phase 4: Analytics
- [ ] Analytics dashboard with charts
- [ ] Usage statistics calculation
- [ ] Report generation system
- [ ] Data export functionality
- [ ] Historical data tracking

### Phase 5: Advanced Features
- [ ] Bulk operations for servers
- [ ] Advanced filtering and search
- [ ] System configuration panel
- [ ] Maintenance mode controls
- [ ] Performance optimizations

### Phase 6: Security & Polish
- [ ] Security audit and hardening
- [ ] Rate limiting implementation
- [ ] Input validation and sanitization
- [ ] Error handling improvements
- [ ] Documentation and testing

## API Design

### Authentication Endpoints
```
POST   /api/auth/login           # Admin login
POST   /api/auth/logout          # Admin logout
GET    /api/auth/session         # Get current session
```

### Server Management Endpoints
```
GET    /api/servers              # List all servers
GET    /api/servers/:id          # Get server details
PUT    /api/servers/:id          # Update server
DELETE /api/servers/:id          # Delete server
POST   /api/servers              # Create new server
POST   /api/servers/bulk         # Bulk operations
GET    /api/servers/:id/logs     # Get server-specific logs
```

### Monitoring Endpoints
```
GET    /api/monitoring/dashboard # Dashboard metrics
GET    /api/monitoring/logs      # System logs
GET    /api/monitoring/errors    # Error logs
GET    /api/monitoring/health    # System health check
POST   /api/monitoring/alerts    # Configure alerts
```

### Analytics Endpoints
```
GET    /api/analytics/overview   # General statistics
GET    /api/analytics/usage      # Usage metrics
GET    /api/analytics/growth     # Growth trends
POST   /api/analytics/report     # Generate custom report
```

## Database Schema

### Admin Users Collection
```typescript
interface AdminUser {
  _id: ObjectId;
  email: string;
  loggedInIps: [string];
  lastLogin: Date;
  createdAt: Date;
}
```

### System Logs Collection
```typescript
interface SystemLog {
  _id: ObjectId;
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  source: string; // server name or 'system'
  metadata: Record<string, any>;
  timestamp: Date;
  serverId?: ObjectId;
}
```

### Admin Actions Collection
```typescript
interface AdminAction {
  _id: ObjectId;
  adminId: ObjectId;
  action: string;
  target: string; // server ID, user ID, etc.
  details: Record<string, any>;
  timestamp: Date;
  ipAddress: string;
}
```

## Security Considerations

### Authentication
- Session management with secure cookies
- Email code verification. Email will be sent with postfix on server.
- Rate limiting on login attempts

### Authorization
- Endpoint-level checks
- Audit logging for all admin actions
- IP whitelisting for critical operations

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection
- Secure headers with Helmet

### Infrastructure
- HTTPS enforcement
- Secure cookie configuration
- Database connection encryption
- Environment variable management
- Regular security updates

## Development Setup

### Prerequisites
- Node.js 18+
- MongoDB instance (connection to global modl database)
- Git for version control

### Initial Setup
```bash
cd modl-admin
npm install
cp .env.example .env # Configure environment variables
npm run dev # Start development servers
```

### Environment Variables
```
NODE_ENV=development
PORT=5001
MONGODB_URI=mongodb://localhost:27017/modl-global
SESSION_SECRET=your-session-secret
CORS_ORIGIN=http://localhost:5173
```

### Development Scripts
```json
{
  "dev": "concurrently \"npm run server:dev\" \"npm run client:dev\"",
  "server:dev": "nodemon server/index.ts",
  "client:dev": "cd client && npm run dev",
  "build": "npm run client:build && npm run server:build",
  "start": "node dist/server/index.js"
}
```

## Testing Strategy

### Unit Tests
- Component testing with React Testing Library
- API endpoint testing with Jest and Supertest
- Database operations testing with MongoDB Memory Server

### Integration Tests
- End-to-end authentication flows
- Server management operations
- Data accuracy in analytics

### Performance Testing
- API response time benchmarks
- Database query optimization
- Frontend bundle size monitoring