# modl-admin Development Plan

## Project Overview

modl-admin is a web application designed for system administrators to manage the overall modl platform. This application provides a centralized interface for managing registered servers, monitoring system health, viewing analytics, and maintaining the modl ecosystem.

**Access URL**: `admin.modl.gg` (configured via reverse proxy)

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
- **Role-Based Access**: Different permission levels for admin users
- **2FA Support**: Two-factor authentication for enhanced security

### 2. Server Management
- **Server Registry**: View all registered modl servers
- **Server Details**: Detailed information about each server including:
  - Server name and custom domain
  - Plan type (free/premium)
  - Registration date and last activity
  - Database connection status
  - Custom domain configuration status
- **Server Actions**: 
  - Edit server configurations
  - Delete/deactivate servers
  - Reset server databases
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

### Phase 1: Foundation (Week 1-2)
- [ ] Project setup and initial structure
- [ ] Authentication system implementation
- [ ] Basic UI layout with navigation
- [ ] Database connection to global modl database
- [ ] Core API routes for server listing

### Phase 2: Server Management (Week 3-4)
- [ ] Server registry with search and filtering
- [ ] Server detail views
- [ ] Basic server actions (edit, delete)
- [ ] Server creation workflow
- [ ] Database schema for admin operations

### Phase 3: Monitoring & Logs (Week 5-6)
- [ ] Error log aggregation system
- [ ] Dashboard with key metrics
- [ ] Real-time monitoring setup
- [ ] Log filtering and search functionality
- [ ] Alert system foundation

### Phase 4: Analytics (Week 7-8)
- [ ] Analytics dashboard with charts
- [ ] Usage statistics calculation
- [ ] Report generation system
- [ ] Data export functionality
- [ ] Historical data tracking

### Phase 5: Advanced Features (Week 9-10)
- [ ] Bulk operations for servers
- [ ] Advanced filtering and search
- [ ] System configuration panel
- [ ] Maintenance mode controls
- [ ] Performance optimizations

### Phase 6: Security & Polish (Week 11-12)
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
POST   /api/auth/2fa/setup       # Setup 2FA
POST   /api/auth/2fa/verify      # Verify 2FA code
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
  username: string;
  passwordHash: string;
  role: 'super_admin' | 'admin' | 'moderator';
  twoFactorSecret?: string;
  isTwoFactorEnabled: boolean;
  lastLogin: Date;
  createdAt: Date;
  updatedAt: Date;
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
- Secure password hashing with bcrypt
- JWT tokens for API authentication
- Session management with secure cookies
- Two-factor authentication support
- Rate limiting on login attempts

### Authorization
- Role-based access control
- Endpoint-level permission checks
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
ADMIN_JWT_SECRET=your-jwt-secret
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

## Deployment Plan

### Production Environment
- Reverse proxy configuration for admin.modl.gg
- SSL certificate setup
- Environment-specific configuration
- Database backup strategies
- Monitoring and logging setup

### CI/CD Pipeline
- Automated testing on pull requests
- Build and deployment automation
- Environment promotion workflow
- Rollback procedures

## Future Enhancements

### Advanced Analytics
- Machine learning insights
- Predictive analytics for server growth
- Anomaly detection in system metrics

### Enhanced Monitoring
- Real-time alerts via email/Slack
- Custom dashboards for different roles
- Integration with external monitoring tools

### Automation
- Automated server provisioning
- Self-healing system components
- Scheduled maintenance tasks

---

**Last Updated**: [Current Date]
**Version**: 1.0
**Author**: Development Team 