# Drama Llama AI - Communication Analysis Platform

## Overview

Drama Llama AI is a sophisticated web application that analyzes conversations to detect communication patterns, red flags, and relationship dynamics. The platform uses advanced AI (Anthropic Claude) to provide insights into text-based conversations, helping users understand their communication patterns and improve their relationships.

## System Architecture

The application follows a full-stack architecture with clear separation between frontend and backend:

- **Frontend**: React-based SPA with TypeScript, using Vite for bundling
- **Backend**: Express.js Node.js server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **AI Integration**: Exclusive integration with Anthropic Claude API for conversation analysis
- **Email Services**: Resend for transactional emails
- **Payment Processing**: Stripe integration for subscription management
- **Image Processing**: Azure Vision API for OCR capabilities
- **WebSocket**: Real-time chat support functionality

## Key Components

### Frontend Architecture
- **UI Framework**: React 18 with TypeScript
- **Styling**: TailwindCSS with shadcn/ui component library
- **State Management**: TanStack Query for server state, React hooks for local state
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite with custom configuration for monorepo setup

### Backend Architecture
- **Server Framework**: Express.js with TypeScript
- **Database Layer**: Drizzle ORM with PostgreSQL
- **Authentication**: Session-based auth with bcrypt password hashing
- **File Processing**: Multer for file uploads, Sharp for image processing
- **API Design**: RESTful endpoints with proper error handling
- **WebSocket**: For real-time chat functionality

### Data Storage Solutions
- **Primary Database**: PostgreSQL via Neon serverless
- **Session Storage**: Memory store for development, configurable for production
- **File Storage**: Base64 encoding for image processing
- **In-Memory Caching**: For temporary analysis results and rate limiting

### Authentication and Authorization
- **User Authentication**: Username/password with hashed storage
- **Email Verification**: Code-based verification system
- **Session Management**: Express-session with memory store
- **Role-Based Access**: Admin flag system for administrative functions
- **Password Security**: PBKDF2 with salt for password hashing

## Data Flow

1. **User Registration**: User creates account → Email verification sent → Account activated
2. **Conversation Analysis**: 
   - User inputs conversation text or uploads image
   - Text processing and participant detection
   - AI analysis via Anthropic Claude
   - Results enhancement based on user tier
   - Storage of analysis results
3. **Subscription Management**: Stripe integration for tier upgrades and payment processing
4. **Real-time Chat**: WebSocket connection for live support chat

## External Dependencies

### AI Services
- **Anthropic Claude**: Exclusive AI analysis engine for conversation insights and all text processing
- **Azure Computer Vision**: OCR processing for image-based conversations
- **Google Cloud Vision**: Backup OCR service

### Communication Services
- **Resend**: Email delivery for verification and notifications
- **WebSocket**: Real-time communication for chat support

### Payment Processing
- **Stripe**: Subscription management and payment processing
- **Promo Codes**: Custom promotional code system

### Development Tools
- **Drizzle Kit**: Database migrations and schema management
- **ESBuild**: Production build optimization
- **TSX**: TypeScript execution for development

## Deployment Strategy

The application is configured for deployment on Replit with the following setup:

- **Development**: `npm run dev` - runs both frontend and backend in development mode
- **Production Build**: `npm run build` - creates optimized production bundle
- **Production Start**: `npm run start` - serves the built application
- **Database**: Automatic PostgreSQL provisioning via Replit modules
- **Environment**: Node.js 20 runtime with web and PostgreSQL modules
- **Port Configuration**: Internal port 5000, external port 80
- **Auto-scaling**: Configured for automatic scaling based on demand

### Build Process
1. Frontend build via Vite (creates static assets)
2. Backend build via ESBuild (creates Node.js bundle)
3. Static file serving for production
4. Database schema push via Drizzle migrations

## Changelog
- July 2, 2025: Removed all OpenAI dependencies and fallback logic
  - Uninstalled OpenAI package completely from dependencies
  - Removed all OpenAI fallback functions from Anthropic service
  - Simplified error handling to rely exclusively on Anthropic Claude
  - Updated architecture documentation to reflect single AI provider
  - Improved system reliability by removing secondary API dependencies
- July 1, 2025: Complete SEO setup with sitemap and robots.txt
  - Generated comprehensive XML sitemap covering all application routes
  - Created robots.txt for proper search engine guidance
  - Added Boundary Builder to main navigation menu
  - Enhanced follow-up response system in Boundary Builder
  - Added intelligent analysis of recipient's reply tone (constructive/defensive/mixed)
  - Implemented acceptance/acknowledgment responses for positive replies
  - Improved nuanced handling to avoid unnecessary conflict escalation
- June 13, 2025: Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.