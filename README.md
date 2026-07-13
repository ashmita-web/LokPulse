# Real-Time Poll Rooms

A full-stack, real-time polling application built with **Next.js**, **Socket.IO**, and **Prisma**. Create a poll, share the link, and watch votes stream in live without refreshing the page.

## Features

- **Real-Time Updates**: Results update instantly for all users via WebSockets.
- **Fair Voting**: Strict fairness controls to prevent duplicate votes:
  - **Server-Side IP Restriction**: Limits users to one vote per IP address per poll.
  - **Browser Fingerprinting**: Uses a persistent local UUID to identify browsers.
- **Responsive Design**: Beautiful, glassmorphic UI built with Tailwind CSS.
- **Robust Architecture**:
  - Next.js 14 App Router for frontend and API handling.
  - Custom Node.js Server (`server.ts`) to integrate Socket.IO reliable with Next.js.
  - Prisma ORM for type-safe database interactions.
  - SQLite (default) for zero-config local development (switchable to PostgreSQL).

## Getting Started

### Prerequisites

- Node.js 18+ (Recommended)
- npm

### Installation

1. **Clone the repository** (if applicable) or navigate to the project directory.

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Initialize the Database**:
   This project uses SQLite by default for simplicity.
   ```bash
   npx prisma db push
   # OR
   npx prisma migrate dev --name init
   ```

4. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   > **Note**: This runs `tsx server.ts`, which starts both the Next.js app and the Socket.IO server on port 3000.

5. **Open Browser**:
   Navigate to [http://localhost:3000](http://localhost:3000).

---

## Architecture

### Tech Stack
- **Frontend**: Next.js 14 (React), TypeScript, Tailwind CSS, Lucide Icons.
- **Backend**: Next.js API Routes (via `server.ts` custom handling), Socket.IO.
- **Database**: SQLite (via Prisma). easilly swappable to PostgreSQL.

### Project Structure
- `server.ts`: Custom entry point. Initializes HTTP server, attaches Socket.IO, and delegates to Next.js handler. Exposes `io` globally for API routes.
- `src/app/api/`: API Routes for creating polls (`POST`) and voting (`POST`).
- `src/app/poll/[id]`: Dynamic route for viewing polls. Uses `useSocket` hook for real-time updates.
- `prisma/schema.prisma`: Database schema defining `Poll`, `Option`, and `Vote` models with unique constraints.

### Real-Time Flow
1. User creates a poll → stored in DB → redirected to Poll Page.
2. User joins Poll Page → Client connects to Socket.IO (`/api/socket/io`) and joins room `pollId`.
3. User votes → `POST /api/polls/[id]/vote`.
4. Server validates vote (User ID + IP check) → writes to DB.
5. Server emits `poll-update` event to room `pollId` with new vote counts.
6. All connected clients update their UI automatically.

### Fairness Mechanisms
1. **IP Restriction**: The API checks if a vote already exists for the `(pollId, ipAddress)` pair. If found, returns 403.
2. **Browser ID**: The client generates a UUID (`poll_user_id`) stored in `localStorage`. This is sent with the vote. The server enforces uniqueness on `(pollId, userIdentifier)`.

### Known Limitations & Improvements
- **IP Restriction**: Users on shared networks (e.g., offices) might be blocked if someone else voted. *Improvement*: Allow N votes per IP.
- **Deployment**: Vercel (Serverless) does not support persistent WebSockets easily. For production deployment, you should use a VPS (DigitalOcean/Railway/Render) where you can run `npm start` (the custom server) or use a managed WebSocket service like Pusher.

---

## Deployment

To deploy this app on a VPS or Node.js compatible host:

1. **Environment Variables**: Set `DATABASE_URL` (use a PostgreSQL connection string for production).
2. **Build**:
   ```bash
   npm run build
   ```
3. **Start**:
   ```bash
   npm start
   ```
   This runs `NODE_ENV=production tsx server.ts` (ensure `tsx` is installed or compile `server.ts` to `server.js` using `tsc`).

Enjoy your real-time polls!
