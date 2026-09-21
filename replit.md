# TownRide - Carpooling App

## Overview

A mobile-first carpooling PWA (Progressive Web App) designed for small towns (population <20,000). Features trip creation, seat booking, real-time chat, star ratings, and an admin panel.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind CSS + Lucide React + Wouter (routing)
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Replit Auth (OIDC/PKCE) via `@workspace/replit-auth-web`
- **Validation**: Zod, drizzle-zod
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (port 8080, served at /api)
│   └── carpool/            # React frontend (served at /)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── db/                 # Drizzle ORM schema + DB connection
│   └── replit-auth-web/    # Replit Auth browser hook (useAuth)
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Database Schema

### auth.ts (Replit Auth - mandatory)
- `sessions` — OIDC session store (sid, sess JSON, expire)
- `users` — Replit user records (id UUID, email, firstName, lastName, profileImageUrl)

### carpooling.ts (App data)
- `profiles` — Extended user profiles (linked to replitUserId, isDriver, vehicle info, acceptsPackages)
- `trips` — Carpool trips (origin, destination, date, time, seats, price, meetingPoint, status enum)
- `bookings` — Seat bookings (tripId, passengerId, status, seatsBooked)
- `chat_messages` — Trip chat messages
- `ratings` — 1-5 star ratings between users after completed trips

## App Features

### Authentication
- Replit Auth (OIDC/PKCE) — no custom login forms
- Sessions stored in PostgreSQL
- Profile auto-created on first login using DiceBear avatars

### Trip Management
- Drivers register vehicle details, create trips with meeting points
- Meeting points: Town Square, Hospital, Bus Station, Gas Station, Main Market, Church, School, City Hall, Sports Center, Train Station
- Towns: Springfield, Shelbyville, Ogdenville, North Haverbrook, Brockway, Waverly Hills, Capital City
- Trip statuses: scheduled → in_progress → completed → cancelled

### Booking System
- Search trips by origin, destination, date
- Booking guard: prevents booking if availableSeats === 0
- Seat count decremented atomically on booking
- Cancel booking restores seats

### Chat
- Per-trip chat between driver and passengers
- Access controlled: only driver and confirmed passengers can chat

### Ratings
- 1-5 star ratings after trip completion
- Driver and passenger can rate each other
- Average ratings shown on profiles

### Admin Panel
- View all users and trips
- Delete fraudulent users/trips

## UX
- Mobile-first, max-width container
- Bottom navigation bar (Home, My Trips, Chat, Profile)
- Warm earthy color scheme (greens and oranges)
- Large touch targets (min 44px)
- DiceBear avatars (https://api.dicebear.com/7.x/avataaars/svg?seed=USERNAME)
- PWA-ready

## Key API Routes

All routes under `/api`:
- `GET /auth/user` — current auth state
- `GET /login`, `GET /callback`, `GET /logout` — OIDC flow
- `GET/PUT /users/profile` — profile management
- `GET /trips` — search trips (query: origin, destination, date, status)
- `POST /trips` — create trip (drivers only)
- `GET /trips/my/driver` — driver's own trips
- `GET /trips/:id` — trip detail with bookings
- `PATCH /trips/:id` — update trip status
- `POST /bookings` — book a seat
- `GET /bookings/my` — passenger's bookings
- `PATCH /bookings/:id/cancel` — cancel booking
- `GET /chat/:tripId/messages` — get chat messages
- `POST /chat/:tripId/messages` — send message
- `POST /ratings` — submit rating
- `GET/DELETE /admin/users` — admin user management
- `GET /admin/trips` — admin trip management

## Running

```bash
# Start API server
pnpm --filter @workspace/api-server run dev

# Start frontend
pnpm --filter @workspace/carpool run dev

# Push DB schema
pnpm --filter @workspace/db run push

# Run codegen after API spec changes
pnpm --filter @workspace/api-spec run codegen
```
