# CODEBUDDY.md

This file contains important information for CodeBuddy Code to operate effectively in this repository.

## Project Overview

This is a full-stack love story website built with Vue 3 + TypeScript frontend and Vercel Serverless Functions + MongoDB backend. The project uses a JAMstack architecture with dual deployment modes: 
1. Serverless mode (recommended): Frontend and backend API deployed to Vercel
2. Traditional mode: Frontend to Vercel, backend to Railway

## Development Commands

### Frontend (Root Directory)
```bash
# Development
pnpm dev                    # Start dev server on port 5173
pnpm build                  # Build for production (runs type-check + build-only)
pnpm build-only            # Build without type checking
pnpm preview               # Preview production build
pnpm type-check            # TypeScript type checking
pnpm lint                  # ESLint with auto-fix
pnpm format                # Format code with Prettier

# Testing
pnpm test:unit             # Run unit tests with Vitest
pnpm test:e2e              # Run E2E tests with Playwright
```

### Backend (server/ Directory - Traditional Mode)
```bash
cd server
pnpm dev                   # Start development server with ts-node
pnpm build                 # Compile TypeScript to JavaScript
pnpm start                 # Start production server (requires build first)
```

### Serverless Functions (api/ Directory - Recommended)
Serverless functions are deployed directly to Vercel and run on-demand. No separate server process needed.
- Functions are located in `/api/` directory
- Each file represents a separate API endpoint
- Deploy using `vercel deploy` command

## Architecture Overview

### Frontend Architecture
- **Vue 3 Composition API**: All components use `<script setup>` syntax
- **Pinia Stores**: State management in `/src/stores/` (user.ts for auth, counter.ts for demo)
- **API Layer**: Centralized in `/src/services/api.ts` with axios interceptors for auth
- **Routing**: Vue Router 4 with route guards for authentication
- **Styling**: Custom "Romantic Theme" CSS system in `/src/assets/enhanced-romantic-theme.css` with CSS variables and utility classes
- **Lightning CSS**: Used instead of PostCSS for CSS processing (configured in vite.config.ts)

### Backend Architecture

#### Traditional Mode (server/ Directory)
- **Express + TypeScript**: RESTful API with full type safety
- **MongoDB + Mongoose**: Document database with schema validation
- **JWT Authentication**: Token-based auth with automatic token refresh
- **Route Structure**: Organized by feature (auth, memories, anniversaries, images)
- **Middleware**: CORS, Helmet security, Morgan logging, custom auth middleware
- **Environment-aware CORS**: Automatically switches between localhost (dev) and production URLs

#### Serverless Mode (Recommended) (api/ Directory) - Recommended
- **Vercel Serverless Functions**: On-demand execution with automatic scaling
- **MongoDB + Native Driver**: Direct database operations using MongoDB native driver
- **JWT Authentication**: Manual token validation in each function
- **Route Structure**: Each file in `/api/` directory represents an endpoint, with dynamic routes using [endpoint].ts and [id].ts patterns
- **Caching**: Connection reuse between function invocations
- **Environment Configuration**: Managed in Vercel dashboard

### Key Architectural Patterns
1. **API Client Pattern**: Single axios instance with request/response interceptors
2. **Store Pattern**: Pinia stores mirror API structure (user store manages auth state)
3. **Component Composition**: Reusable components with props/emits pattern
4. **Environment Configuration**: Separate .env files for dev/production with automatic switching

## Environment Setup

### Required Environment Variables

**Frontend (.env)**:
```
# Serverless Mode (Recommended)
VITE_USE_SERVERLESS_FUNCTIONS=true
VITE_SERVERLESS_API_URL=https://your-vercel-project.vercel.app/api

# Traditional Mode (Deprecated)
# VITE_USE_SERVERLESS_FUNCTIONS=false
# VITE_API_BASE_URL=http://localhost:3000/api
```

**Serverless Environment Variables (Vercel Dashboard)**:
```
# MongoDB Connection (Vercel Environment Variables)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name

# JWT Secret (Vercel Environment Variables)
JWT_SECRET=your-secure-jwt-secret-key

# EmailJS Configuration (Vercel Environment Variables)
EMAILJS_SERVICE_ID=your_emailjs_service_id
EMAILJS_TEMPLATE_ID=your_emailjs_reminder_template_id
EMAILJS_TODAY_TEMPLATE_ID=your_emailjs_celebration_template_id
EMAILJS_PUBLIC_KEY=your_emailjs_public_key
EMAILJS_PRIVATE_KEY=your_emailjs_private_key

# Cron Job Authentication (Optional, for protecting automatic reminder endpoint)
CRON_AUTH_TOKEN=your_secure_cron_auth_token
```

**Traditional Backend (server/.env)**:
```
MONGODB_URI=mongodb://localhost:27017/love-story  # or MongoDB Atlas
JWT_SECRET=your-secret-key
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173  # For CORS in production

# EmailJS Configuration (for anniversary reminders)
EMAILJS_SERVICE_ID=your_emailjs_service_id
EMAILJS_TEMPLATE_ID=your_emailjs_reminder_template_id
EMAILJS_TODAY_TEMPLATE_ID=your_emailjs_celebration_template_id
EMAILJS_PUBLIC_KEY=your_emailjs_public_key
EMAILJS_PRIVATE_KEY=your_emailjs_private_key
```

## Deployment Configuration

### JAMstack Deployment
- **Frontend**: Vercel (configured with vercel.json for SPA routing)
- **Backend**: Railway (configured with railway.json and health check endpoint)
- **Database**: MongoDB Atlas recommended for production

### Key Files
- `vercel.json`: SPA routing configuration and Vercel Cron Jobs for Vercel
- `server/railway.json`: Railway deployment configuration (traditional mode)
- `server/server.ts`: Environment-aware CORS configuration (traditional mode)
- `api/`: Vercel Serverless Functions directory (recommended mode)
- `lib/db.ts`: Database connection utility for serverless functions
- `lib/email.ts`: Email utilities for serverless functions
- `lib/scheduler.ts`: Scheduling utilities for serverless functions
- `.env.production`: Production environment variables template

## Important Implementation Details

### Authentication Flow
1. Login/register calls `/api/auth/*` endpoints
2. JWT token stored in localStorage
3. Axios interceptor adds `Authorization: Bearer <token>` to requests
4. User store manages authentication state globally
5. Route guards protect authenticated routes

### API Structure
- All APIs follow RESTful conventions: GET, POST, PUT, DELETE
- Consistent response format with proper HTTP status codes
- Error handling with automatic token refresh on 401 responses
- File uploads handled with multipart/form-data for images

### Anniversary Email System
- **Automated Daily Reminders**: Vercel Cron Job runs at 7:00 AM daily (Asia/Shanghai timezone)
- **Global Anniversaries**: All anniversaries are shared globally, not user-specific
- **Batch Email Sending**: Each anniversary reminder is sent to all registered users
- **Test Functionality**: Manual trigger API and frontend buttons for testing email sending
- **EmailJS Integration**: Uses private key authentication for secure email delivery
- **Two-Template System**: Different templates for advance reminders vs. same-day celebrations
- **Serverless Implementation**: Email sending logic implemented in serverless functions

### Styling System
- Custom "Romantic Theme" with CSS variables (--romantic-*)
- Utility classes following BEM-like naming convention
- Lightning CSS for modern CSS processing and optimization
- Responsive design with mobile-first approach

### Development Workflow
1. Always run `pnpm type-check` before committing
2. Use `pnpm lint` to fix code style issues
3. Both frontend and backend must be running for full functionality
4. MongoDB must be running locally or configured with Atlas connection string

## Testing
- **Unit Tests**: Vitest for component and utility testing
- **E2E Tests**: Playwright for end-to-end testing
- **Type Checking**: Vue TSC for TypeScript validation

## Package Manager
This project uses **pnpm** exclusively. Do not use npm or yarn as it may cause dependency conflicts.