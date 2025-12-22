# SAA Contracting - Labor Management System

A modern, multi-tenant labor management system built for SAA Contracting with React, Node.js, TypeScript, and PostgreSQL.

## Features

### 🏢 Multi-Tenancy
- Complete tenant isolation
- Secure data separation
- Organization-based access control

### 👥 User Management
- **Admin**: Full system access, user management
- **Editor**: Create, read, update operations
- **Read Only**: View-only access

### 👷 Labor Management
- Add laborers with personal information
- Track ID numbers, contact details, start dates
- Assign laborers to groups and specific jobs

### 🏗️ Group & Job Organization
- Create labor groups (Drivers, Security, etc.)
- Define jobs within groups with hourly rates
- Flexible assignment system

### 🎨 Modern UI
- Professional, responsive design
- Built with Tailwind CSS
- Smooth animations and interactions
- Mobile-friendly interface

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with role-based access
- **Deployment**: Docker & Docker Compose

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Docker (optional)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd labor-management-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Run migrations
   npm run db:migrate
   ```

5. **Start development servers**
   ```bash
   npm run dev
   ```

   This starts both the backend (port 3000) and frontend (port 5173) servers.

### Docker Deployment

1. **Using Docker Compose (Recommended)**
   ```bash
   docker-compose up -d
   ```

   This will:
   - Start PostgreSQL database
   - Build and run the application
   - Set up networking between services

2. **Access the application**
   - Open http://localhost:3000
   - Create your first organization account

## Database Schema

### Core Entities
- **Tenants**: Organizations using the system
- **Users**: System users with role-based access
- **Laborers**: Workforce members
- **Labor Groups**: Categories like "Drivers", "Security"
- **Jobs**: Specific positions with hourly rates

### Relationships
- Multi-tenant: All data is scoped to tenants
- Hierarchical: Groups contain jobs, jobs are assigned to laborers
- Flexible: Laborers can be assigned to groups and specific jobs

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Create organization

### Laborers
- `GET /api/laborers` - List laborers (paginated, searchable)
- `POST /api/laborers` - Create laborer
- `PUT /api/laborers/:id` - Update laborer
- `DELETE /api/laborers/:id` - Delete laborer

### Groups
- `GET /api/groups` - List labor groups
- `POST /api/groups` - Create group
- `PUT /api/groups/:id` - Update group
- `DELETE /api/groups/:id` - Delete group

### Jobs
- `GET /api/jobs` - List jobs (filterable by group)
- `POST /api/jobs` - Create job
- `PUT /api/jobs/:id` - Update job
- `DELETE /api/jobs/:id` - Delete job

### Users (Admin only)
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

## Security Features

- **JWT Authentication**: Secure token-based auth
- **Role-based Access Control**: Admin, Editor, Read-only roles
- **Tenant Isolation**: Complete data separation
- **Input Validation**: Zod schema validation
- **Rate Limiting**: API request throttling
- **Security Headers**: Helmet.js protection

## Development Scripts

```bash
# Development
npm run dev              # Start both frontend and backend
npm run server:dev       # Backend only
npm run client:dev       # Frontend only

# Building
npm run build           # Build for production
npm run server:build    # Build backend
npm run client:build    # Build frontend

# Database
npm run db:generate     # Generate Prisma client
npm run db:push         # Push schema changes
npm run db:migrate      # Run migrations
npm run db:studio       # Open Prisma Studio

# Production
npm start              # Start production server
```

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/labor_management"

# JWT Secret (generate a secure random string)
JWT_SECRET="your-super-secret-jwt-key"

# Server
NODE_ENV="development"
PORT=3000
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, please open an issue on GitHub or contact the development team.