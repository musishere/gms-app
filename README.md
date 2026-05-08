# GraveYard Management System (GMS)

A complete full-stack Next.js serverless application for managing graveyards digitally.

## Features
- **Grave GIS Map** – interactive section grid with GPS coordinates, colour-coded availability
- **Auto Grave Allocation** – smart allocation algorithm (by size/section)
- **Burial Records** – full deceased person info, date & time of burial, next-of-kin
- **Burial Fee & Payments** – payment method, receipt number, paid/pending tracking
- **Online Death Certificates** – request, approve, and download PDF certificates
- **Monthly Burial Status Reports** – charts + CSV/PDF export
- **Revenue Generation Reports** – collected vs pending revenue analytics
- **Maintenance Requests** – report, prioritise, and track grave/facility maintenance
- **Critical Maintenance Alerts** – dashboard banner + auto grave status change
- **Family Portal** – families track their own burials, payments, and certificates
- **Role-based access** – Admin / Staff / Family roles
- **JWT Authentication** – secure httpOnly cookies

## Demo Login
```
Email:    admin@graveyard.pk
Password: Admin@1234
```

## Tech Stack
- Next.js 15 App Router (serverless)
- TailwindCSS + Lucide Icons
- Recharts (analytics)
- jsPDF (PDF generation client-side)
- lowdb (JSON file DB — swap for Vercel Postgres in production)
- bcryptjs + jsonwebtoken

## Quick Start
```bash
tar -xzf gms-app.tar.gz
cd gms-app
npm install
cp .env.example .env   # edit JWT_SECRET
npm run dev
```

## Deploy to Vercel
```bash
vercel deploy
```
> ⚠️ Switch `lib/db.ts` to Vercel Postgres or KV for persistent storage on Vercel.

## Project Structure
```
app/
  api/
    auth/          login · register · logout · me
    graves/        list+filter · auto-allocate
    burials/       CRUD + detail
    payments/      list · mark paid
    certificates/  request · approve · reject
    maintenance/   report · update status
    dashboard/     stats aggregate
    users/profile  profile update
  dashboard/
    graves/        GIS map + grid view
    burials/       list + new (3-step form) + detail
    payments/      fee records + mark paid
    certificates/  list + request + download PDF
    maintenance/   report + track issues
    reports/       charts + CSV/PDF export
    family/        family self-service portal
    settings/      profile edit + system info
lib/
  db.ts            lowdb + auto-seed 390 graves + admin user
  auth.ts          JWT helpers
  utils.ts         formatting helpers
  ensureData.ts    filesystem bootstrap (server-only)
```
