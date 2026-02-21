# OilChange Pro - Customer Follow-Up CRM

A SaaS platform for auto repair shops to track customers, manage service schedules, and send timely follow-up reminders for oil changes and maintenance.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Prisma](https://img.shields.io/badge/Prisma-5.0-2D3748)

## Features

### Core CRM Features
- **Dashboard Overview** - Visual status cards showing Overdue (red), Due Now (orange), Due Soon (yellow), and Up to Date (green) customers
- **Customer Management** - Full CRUD operations with vehicle tracking and service history
- **Smart Due Date Logic** - Automatically calculates 3 months OR 5,000 miles (whichever comes first)
- **Follow-Up Logging** - Track calls, texts, and emails with outcomes (scheduled, not_interested, no_response, serviced_elsewhere, left_message, wrong_number)
- **CSV Import** - Bulk import customers with validation and duplicate detection
- **Filters & Search** - Filter by status, search by name, phone, or email

### SaaS Platform
- **Multi-tenant Architecture** - Organization-based data isolation using Clerk
- **Subscription Management** - Free trial, Professional ($49/mo), and Enterprise ($149/mo) tiers
- **Team Collaboration** - Multiple staff members per organization
- **Role-based Access** - Secure API routes with org-scoped queries

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Authentication:** Clerk
- **Database:** PostgreSQL (Neon/Supabase compatible)
- **ORM:** Prisma
- **Charts:** Recharts
- **File Upload:** react-dropzone

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Clerk account

### 1. Clone and Install

```bash
git clone https://github.com/JB-Assistant/oilchange-crm.git
cd oilchange-crm
npm install
```

### 2. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env.local
```

Add your credentials:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/oilchange_crm?schema=public"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Stripe (optional - for subscriptions)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# (Optional) Seed with sample data
npm run db:seed
```

### Supabase Schema Setup (Current App Path)

If you are using Supabase for the current multi-schema app, run SQL scripts in this order:

1. `supabase/baseline-setup.sql` (new/empty projects only)
2. `supabase/phase0-migration.sql` (required upgrade/compatibility patch)

Then verify with:

- `GET /api/health/schema` (returns 200 only when required schema pieces are present)
- Detailed runbook: `supabase/MIGRATIONS.md`

### 4. Clerk Configuration

1. Create a Clerk application at [clerk.dev](https://clerk.dev)
2. Enable Organizations feature in Clerk Dashboard
3. Copy your Publishable and Secret keys to `.env.local`
4. Configure the webhook (optional):
   - Create a webhook endpoint in Clerk Dashboard
   - Set URL to: `https://your-domain.com/api/webhooks/clerk`
   - Subscribe to: `organization.created`, `organization.updated`, `organization.deleted`

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
oilchange-crm/
├── app/
│   ├── (auth)/           # Auth pages (sign-in, sign-up)
│   ├── (dashboard)/      # Protected dashboard pages
│   │   ├── dashboard/    # Main dashboard
│   │   ├── customers/    # Customer list & detail
│   │   ├── import/       # CSV import
│   │   └── settings/     # Org settings
│   ├── api/              # API routes
│   │   ├── customers/    # Customer CRUD
│   │   ├── vehicles/     # Vehicle CRUD
│   │   ├── service-records/  # Service history
│   │   ├── follow-ups/   # Follow-up logging
│   │   ├── import/       # CSV import
│   │   ├── dashboard/    # Stats endpoint
│   │   └── webhooks/     # Clerk webhooks
│   ├── layout.tsx        # Root layout with Clerk
│   └── page.tsx          # Landing page
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── add-customer-form.tsx
│   ├── add-service-form.tsx
│   ├── follow-up-form.tsx
│   └── status-badge.tsx
├── lib/
│   ├── prisma.ts         # Prisma client
│   ├── customer-status.ts # Status utilities
│   ├── format.ts         # Formatting utilities
│   └── types.ts          # TypeScript types
├── prisma/
│   └── schema.prisma     # Database schema
└── middleware.ts         # Clerk auth middleware
```

## Database Schema

### Organization
- Multi-tenant isolation via `clerkOrgId`
- Subscription status and tier tracking

### Customer
- Personal info (name, phone, email)
- Status (overdue, due_now, due_soon, up_to_date)
- Linked to organization

### Vehicle
- Year, make, model, license plate
- Linked to customer

### ServiceRecord
- Service date and mileage
- Next due date (auto-calculated: +3 months)
- Next due mileage (auto-calculated: +5,000 miles)
- Linked to vehicle

### FollowUpRecord
- Contact method (call, text, email)
- Outcome tracking
- Notes and staff member
- Linked to customer and service record

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/customers` | GET | List customers (with filters) |
| `/api/customers` | POST | Create customer |
| `/api/customers` | PATCH | Update customer |
| `/api/customers` | DELETE | Delete customer |
| `/api/vehicles` | GET | List vehicles |
| `/api/vehicles` | POST | Create vehicle |
| `/api/vehicles` | DELETE | Delete vehicle |
| `/api/service-records` | GET | List service records |
| `/api/service-records` | POST | Create service record |
| `/api/service-records` | DELETE | Delete service record |
| `/api/follow-ups` | GET | List follow-up records |
| `/api/follow-ups` | POST | Create follow-up record |
| `/api/follow-ups` | DELETE | Delete follow-up record |
| `/api/import` | POST | CSV import |
| `/api/dashboard` | GET | Dashboard stats |

## CSV Import Format

Required columns:
- `firstName`
- `lastName` 
- `phone`

Optional columns:
- `email`
- `vehicleYear`
- `vehicleMake`
- `vehicleModel`
- `licensePlate`
- `lastServiceDate` (YYYY-MM-DD)
- `lastServiceMileage`

Example:
```csv
firstName,lastName,phone,email,vehicleYear,vehicleMake,vehicleModel,licensePlate,lastServiceDate,lastServiceMileage
John,Doe,(555) 123-4567,john@example.com,2020,Toyota,Camry,ABC123,2025-01-15,45000
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

### Environment Variables for Production

```env
# Required
DATABASE_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Optional (for subscriptions)
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
CLERK_WEBHOOK_SECRET=
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

For support, email support@oilchangepro.com or open an issue on GitHub.

---

Built with ❤️ for auto repair shops everywhere.
