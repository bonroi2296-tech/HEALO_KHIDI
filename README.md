# HEALO - Medical Tourism Platform

**Version**: 1.0.0  
**Stage**: MVP (Operator-led Manual Matching)  
**Last Updated**: 2026-02-20

> 🏥 Medical tourism platform connecting international patients with Korean healthcare providers

---

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Development](#development)
- [Deployment](#deployment)
- [Architecture](#architecture)
- [Documentation](#documentation)

---

## 🎯 Overview

HEALO is a medical tourism platform that helps international patients find and connect with Korean hospitals for specialized treatments. The platform currently operates in **MVP stage** with operator-led manual matching.

### Key Features

- 🔍 **Hospital & Treatment Browse**: Search and compare medical facilities
- 📝 **Multi-channel Inquiry**: AI chat, human consultation, or quick form
- 🤖 **AI-powered**: Gemini-based inquiry normalization, RAG search
- 👨‍💼 **Admin Dashboard**: Full CRUD, analytics, bulk import, notification management
- 🔒 **Enterprise Security**: RLS policies, service_role separation, audit logs
- 🌐 **Internationalization**: Multi-language support (partial)

### What HEALO is NOT

❌ Hospital self-service platform (hospitals don't log in)  
❌ Direct booking system (operator mediates)  
❌ Payment processing (handled offline)

---

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 16.1.4 (App Router)
- **Language**: JavaScript/TypeScript (migrating to TS)
- **Styling**: TailwindCSS 3.4
- **UI Components**: Custom components + Lucide icons
- **State**: React hooks (no global state manager yet)

### Backend
- **Runtime**: Node.js (Next.js API Routes)
- **Database**: PostgreSQL 15 (via Supabase)
- **Storage**: Supabase Storage
- **Authentication**: Supabase Auth
- **Validation**: Zod

### AI & Analytics
- **LLM**: Google Gemini (normalization), OpenAI GPT-4 (chat)
- **Vector DB**: Supabase pgvector (RAG)
- **Analytics**: Google Analytics 4 + custom DB tracking

### Infrastructure
- **Platform**: Vercel (recommended)
- **Email**: AWS SES
- **Monitoring**: (Sentry - to be added)

---

## 📁 Project Structure

```
HEALO_Demo/
├── app/                        # Next.js App Router
│   ├── api/                    # API Routes
│   │   ├── admin/              # Admin endpoints (Bearer auth)
│   │   ├── inquiries/          # Inquiry submission
│   │   ├── chat/               # AI chatbot
│   │   └── rag/                # RAG search
│   ├── admin/                  # Admin UI
│   │   ├── _components/        # Shared admin components
│   │   ├── hospitals/          # Hospital CRUD
│   │   ├── treatments/         # Treatment CRUD
│   │   ├── inquiries/          # Inquiry management
│   │   ├── analytics/          # Dashboard
│   │   ├── settings/           # Settings (notifications, branding)
│   │   └── layout.jsx          # Admin layout
│   ├── hospitals/[slug]/       # Hospital detail page
│   ├── treatments/[slug]/      # Treatment detail page
│   ├── inquiry/                # Inquiry form & intake
│   └── layout.jsx              # Root layout
├── src/
│   ├── lib/                    # Business logic
│   │   ├── auth/               # Authentication helpers
│   │   ├── security/           # Encryption, validation
│   │   ├── notifications/      # Admin notifier (SMS/Email)
│   │   ├── rag/                # RAG system
│   │   └── validation/         # Zod schemas
│   ├── components/             # Shared UI components
│   └── supabase.js             # Supabase client (legacy)
├── migrations/                 # Database migrations (SQL)
├── docs/                       # Implementation guides (25+ files)
├── scripts/                    # Utility scripts
├── public/                     # Static assets
├── .env.example                # Environment variables template
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier OK)
- OpenAI API key (for chatbot)
- Google AI API key (for normalization)

### 1. Clone Repository

```bash
git clone https://github.com/your-org/healo.git
cd healo
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```bash
# Supabase (필수)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx

# Encryption (필수)
ENCRYPTION_KEY_V2=<64-character hex string>

# AI (필수)
OPENAI_API_KEY=sk-xxx
GOOGLE_GENERATIVE_AI_API_KEY=AIzaxxx

# Admin (필수)
ADMIN_EMAIL_ALLOWLIST=admin@healo.com,manager@healo.com

# Optional
GOOGLE_MAPS_API_KEY=AIzaxxx
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-xxx
AWS_SES_REGION=us-east-1
AWS_SES_ACCESS_KEY_ID=AKIAxxx
AWS_SES_SECRET_ACCESS_KEY=xxx
AWS_SES_FROM_EMAIL=noreply@healo.com
```

**Generate Encryption Key**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Run Database Migrations

Execute SQL files in `migrations/` folder in your Supabase SQL Editor:

```sql
-- 1. Core tables
migrations/20260204_p0_db_schema_refinement.sql

-- 2. RLS policies
migrations/20260204_rls_hospitals_treatments.sql

-- 3. Storage policies
migrations/20260204_storage_policies.sql

-- 4. Notification system
migrations/20260204_add_admin_notification_logs.sql

-- 5. Site settings
migrations/20260204_create_site_settings.sql

-- 6. Hospital leads (prepared, not used yet)
migrations/20260204_hospital_leads.sql

-- 7. Email channel support
migrations/20260205_add_email_channel_support.sql

-- 8. Lead quality scoring
migrations/20260205_add_inquiries_lead_quality.sql

-- 9. Metadata fields
migrations/20260209_add_metadata_fields.sql
```

### 5. Verify Environment

```bash
npm run check:env
```

### 6. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 💻 Development

### Available Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm start                # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint errors
npm run format           # Format with Prettier

# Testing
npm test                 # Run unit tests (watch mode)
npm run test:run         # Run tests once
npm run test:ui          # Open Vitest UI

# Utilities
npm run check:env        # Validate environment variables
npm run eval             # Run evaluation script
npm run collect          # Data collection utilities
```

### Admin Access

1. Add your email to `ADMIN_EMAIL_ALLOWLIST` in `.env.local`
2. Sign up at `/signup` with that email
3. Access admin panel at `/admin`

### API Documentation

- **Public APIs**: No authentication required
  - `GET /api/hospitals` - List published hospitals
  - `GET /api/treatments` - List published treatments
  - `POST /api/inquiries/create` - Submit inquiry

- **Admin APIs**: Bearer token required
  - `GET /api/admin/whoami` - Verify admin session
  - `GET /api/admin/inquiries` - List all inquiries
  - `POST /api/admin/hospitals` - Create hospital
  - `PATCH /api/admin/hospitals/:id` - Update hospital
  - `DELETE /api/admin/hospitals/:id` - Delete hospital
  - *(similar endpoints for treatments, leads, etc.)*

---

## 🚢 Deployment

### Recommended: Vercel

1. **Push to GitHub**
2. **Import to Vercel**
3. **Add Environment Variables** (all from `.env.local`)
4. **Deploy**

### Environment Variables Checklist

- [ ] All Supabase keys
- [ ] Encryption key (ENCRYPTION_KEY_V2)
- [ ] OpenAI API key
- [ ] Google AI API key
- [ ] Admin email allowlist
- [ ] AWS SES credentials (for email notifications)
- [ ] Google Maps API key (for maps)
- [ ] Google Analytics ID (for tracking)

### Post-Deployment

1. **Verify Admin Access**: Try logging in to `/admin`
2. **Test Inquiry Submission**: Submit a test inquiry at `/inquiry`
3. **Check Notifications**: Verify admin notifications are sent
4. **Monitor Errors**: Set up Sentry (recommended)

---

## 🏗 Architecture

### Data Flow: Inquiry Submission

```
User (Browser)
  ↓ POST /api/inquiries/create
Next.js API Route
  ↓ Encrypt PII (AES-256-GCM)
  ↓ Insert with service_role (bypass RLS)
PostgreSQL (Supabase)
  ↓ Trigger: admin notification
Admin Notifier
  ↓ Send SMS/Email
Admin receives alert
```

### Security Layers

1. **RLS (Row Level Security)**: Anonymous users can only read published content
2. **Service Role Separation**: Admin APIs use `service_role`, public uses `anon`
3. **PII Encryption**: Email, name, message encrypted at rest
4. **Audit Logging**: All admin actions logged to `admin_audit_logs`
5. **Input Validation**: Zod schemas on all admin endpoints
6. **Storage Policies**: Private attachments bucket, signed URLs only

### Database Schema Highlights

- **hospitals**: 40+ fields (location, images, tags, certifications, etc.)
- **treatments**: 30+ fields (price, benefits, recovery time, etc.)
- **inquiries**: Patient inquiry (encrypted PII, intake data, status)
- **normalized_inquiries**: AI-extracted structured data
- **admin_audit_logs**: Complete admin action history
- **notification_recipients**: Multi-channel notification targets
- **site_settings**: Branding (logo, colors)

---

## 📚 Documentation

### Key Documents

- [Development Stage Definition](docs/HEALO_DEV_STAGE.md) - **Must Read**
- [Architecture Review 2026](ARCHITECTURE_REVIEW_2026.md) - Comprehensive analysis
- [Security Lockdown Report](SECURITY_LOCKDOWN_REPORT.md) - P0.5 security enhancements
- [P1 Completion Report](P1_COMPLETION_REPORT.md) - DB schema refinement
- [P2 Refactoring Report](P2_REFACTORING_REPORT.md) - Component refactoring

### Implementation Guides (docs/)

- Admin Notification System
- Branding Settings
- Bulk Import
- Email Setup
- File Upload
- Image Fallback
- RAG System
- Storage Setup
- *(25+ guides total)*

### Database Migrations

All migrations are in `migrations/` with detailed comments. Apply in order (see [Getting Started](#getting-started)).

---

## 🧪 Testing

### Current Coverage

- **Unit Tests**: 13 tests (security, intake extraction)
- **Integration Tests**: None yet
- **E2E Tests**: Smoke tests only

### Test Strategy

```bash
# Run all tests
npm test

# Run with coverage
npm run test:run -- --coverage

# Test specific file
npm test src/lib/security/attachmentAuth.test.ts
```

### Critical Test Paths

1. **Inquiry Flow**: Submit form → Encrypt data → Store → Notify admin
2. **Admin CRUD**: Create hospital → Update → Publish → Verify RLS
3. **File Upload**: Upload attachment → Generate signed URL → Access control

---

## 🔧 Troubleshooting

### Common Issues

**❌ "Module not found: Can't resolve 'crypto'"**
- Solution: This is a Node.js module. Ensure API routes have `export const runtime = "nodejs"`

**❌ "Supabase: new row violates row-level security policy"**
- Solution: Use `service_role` key for admin operations, not `anon` key

**❌ "ENCRYPTION_KEY_V2 is not defined"**
- Solution: Generate and add to `.env.local`: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

**❌ "Admin login redirects to login page"**
- Solution: Check `ADMIN_EMAIL_ALLOWLIST` matches your email exactly (case-sensitive)

### Logs & Debugging

- **Client Logs**: Browser DevTools Console
- **Server Logs**: Vercel Logs or `npm run dev` output
- **Database**: Supabase Dashboard → Logs
- **Audit Trail**: `admin_audit_logs` table

---

## 🤝 Contributing

### Development Workflow

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes with clear commits
3. Run tests: `npm test`
4. Build check: `npm run build`
5. Push and create PR

### Code Style

- **JavaScript/TypeScript**: Follow ESLint config
- **Formatting**: Prettier (run `npm run format`)
- **Components**: Use `"use client"` directive for client components
- **API Routes**: Always validate input with Zod
- **Commits**: Conventional Commits format

---

## 📊 Project Status

**Current Stage**: MVP (Operator-led Manual Matching)  
**Production Ready**: 85% (needs E2E tests + Sentry)  
**Tech Debt**: Low (P0.5 security lockdown complete)

### Recent Updates

- ✅ 2026-02-20: P2 refactoring (Notifications page 909→200 lines)
- ✅ 2026-02-20: P1 completion (DB schema cleanup, tests)
- ✅ 2026-02-18: Admin notification system with email support
- ✅ 2026-02-15: Security lockdown (RLS, Storage policies)
- ✅ 2026-02-10: App Router migration complete

---

## 📞 Support

- **Documentation**: See `docs/` folder
- **Issues**: GitHub Issues
- **Email**: dev@healo.com

---

## 📄 License

Proprietary - All rights reserved

---

**Built with ❤️ by HEALO Engineering Team**
