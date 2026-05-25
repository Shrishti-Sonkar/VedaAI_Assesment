# VedaAI Assessment Creator - Setup and Verification Guide

This guide helps a reviewer run and verify the project on a fresh system.

## 1. Prerequisites

Install these first:

- Node.js 20 or newer
- npm 10 or newer
- Docker Desktop, optional but recommended for MongoDB and Redis

Check versions:

```bash
node -v
npm -v
docker -v
```

## 2. Extract the Zip

Unzip the submitted file:

```bash
unzip vedaai-assessment-creator-submit.zip
cd vedaai-assessment-creator
```

On Windows, you can also right-click the zip and choose **Extract All**, then open a terminal inside the extracted `vedaai-assessment-creator` folder.

## 3. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

For Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Default values are already suitable for local testing:

```env
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/vedaai
REDIS_URL=redis://127.0.0.1:6379
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
```

## 4. Start MongoDB and Redis

Recommended:

```bash
docker compose up -d
```

This starts:

- MongoDB on `localhost:27017`
- Redis on `localhost:6379`

Quick fallback:

If Docker is not available, you can still run the app. The backend falls back to in-memory storage and in-process jobs, so the assignment flow remains testable. Data will reset when the backend restarts.

## 5. Install Dependencies

```bash
npm install
```

## 6. Run the App

Start both frontend and backend:

```bash
npm run dev
```

Open:

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:4000/health`

Expected health response:

```json
{
  "ok": true
}
```

## 7. Verify the Main Flow

1. Open `http://localhost:3000`.
2. Click **Create Assignment**.
3. Fill required fields:
   - Assignment title
   - Subject
   - Class
   - Due date
   - Duration
   - Question blueprint
4. Optionally add source text or upload a `.txt` / `.pdf` file.
5. Click **Generate Paper**.
6. Confirm the assignment appears in the sidebar.
7. Watch the real-time generation status.
8. Confirm the generated paper includes:
   - School and paper title
   - Time and total marks
   - Student info lines
   - Sections A, B, etc.
   - Questions with difficulty badges and marks
9. Click **Download PDF** to export the paper.

## 8. Build and Typecheck

Run production build:

```bash
npm run build
```

Run TypeScript checks:

```bash
npm run typecheck
```

Run frontend lint:

```bash
npm run lint --workspace frontend
```

All three commands should pass.

## 9. API Verification With Curl

Create a sample assignment:

```bash
curl -X POST http://localhost:4000/api/assignments \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Demo Science Assessment",
    "subject": "Science",
    "classLevel": "Grade 8",
    "dueDate": "2026-06-01",
    "durationMinutes": 60,
    "sourceText": "Force pressure friction motion energy reasoning applications",
    "instructions": "Attempt all questions",
    "questionTypes": [
      { "type": "mcq", "count": 2, "marks": 1, "difficulty": "easy" },
      { "type": "short", "count": 2, "marks": 3, "difficulty": "medium" }
    ]
  }'
```

Then list assignments:

```bash
curl http://localhost:4000/api/assignments
```

The created assignment should move from `queued` / `generating` to `completed`.

## 10. Architecture Summary

- Next.js renders the assignment dashboard, creation modal, generation status and final paper.
- Zustand manages assignment state and applies WebSocket job updates.
- Express validates and stores assignment requests.
- MongoDB stores assignments and generated results.
- Redis + BullMQ process background generation jobs.
- WebSocket sends real-time progress updates to the frontend.
- The generator converts form input into a structured prompt and normalized question-paper JSON before rendering.

## 11. Troubleshooting

Port already in use:

- Change `PORT` in `.env` for backend.
- For frontend, run `npm run dev --workspace frontend -- -p 3001`.

Docker not running:

- Start Docker Desktop and rerun `docker compose up -d`.
- Or continue without Docker using the in-memory fallback.

MongoDB or Redis connection warnings:

- These are acceptable for quick review because fallback mode is built in.
- For full stack verification, make sure Docker containers are running.

PDF download not opening:

- Try another browser.
- Make sure the generated paper is visible before clicking **Download PDF**.

Dependency install issue:

```bash
npm cache verify
npm install
```

Fresh reset:

```bash
docker compose down -v
docker compose up -d
npm run dev
```
