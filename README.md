# E-Commerce CRM

Custom CRM for Nigerian e-commerce operations with WhatsApp automation via Evolution API.

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Evolution API instance running on your VPS

### Backend Setup
```bash
cd backend
cp .env.example .env
# Fill in DATABASE_URL, JWT secrets, EVOLUTION_API_URL, EVOLUTION_API_KEY

npm install
npx prisma migrate dev --name init
npm run seed          # Creates admin@crm.local / Admin@1234

npm run dev           # Starts on http://localhost:3001
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev           # Starts on http://localhost:5173
```

### First Login
- URL: http://localhost:5173
- Email: admin@crm.local
- Password: Admin@1234

**Change your password after first login!**

---

## Project Structure
```
ecommerce-crm/
├── backend/          # Node.js + Express + Prisma (port 3001)
│   ├── prisma/       # Database schema + migrations
│   └── src/
│       ├── config/   # DB, JWT, Evolution API clients
│       ├── middleware/
│       ├── modules/  # Feature modules (auth, orders, whatsapp, ...)
│       ├── jobs/     # Cron jobs (cart abandonment, automation)
│       └── utils/    # Phone normalizer, template engine, etc.
└── frontend/         # React + Vite + Tailwind + shadcn/ui (port 5173)
    └── src/
        ├── api/      # Axios API clients
        ├── components/
        ├── pages/    # All CRM pages
        ├── stores/   # Zustand (auth, ui)
        └── lib/      # Utils, constants

```

## Tech Stack
- **Backend:** Node.js 22, Express 4, Prisma 5, PostgreSQL, JWT
- **Frontend:** React 18, Vite 6, Tailwind 3, shadcn/ui, TanStack Query v5, Zustand
- **WhatsApp:** Evolution API (self-hosted)

## Development Phases
- [x] Phase 1 — Foundation (auth, layout, schema)
- [ ] Phase 2 — Core modules (users, products, orders, dashboard)
- [ ] Phase 3 — WhatsApp integration
- [ ] Phase 4 — Advanced features (agents, forms, bulk actions)
- [ ] Phase 5 — Polish + VPS deployment
