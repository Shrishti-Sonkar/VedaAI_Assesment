# VedaAI Assessment Creator

Full-stack implementation of the VedaAI hiring assignment. Teachers can create assignments, queue AI-style question-paper generation, receive live WebSocket updates, review structured output, and download the paper as a PDF.

## Stack

- Frontend: Next.js, TypeScript, Zustand, WebSocket client
- Backend: Node.js, Express, TypeScript
- Data and jobs: MongoDB, Redis, BullMQ
- Bonus: PDF export, generation progress, responsive exam-paper UI

## Run Locally

```bash
cp .env.example .env
docker compose up -d
npm install
npm run dev
```

Frontend runs on `http://localhost:3000` and API runs on `http://localhost:4000`.

The backend gracefully falls back to in-memory storage and in-process jobs if MongoDB or Redis are not running, so reviewers can still test the flow quickly.

## Architecture

1. The Next.js form validates assignment metadata, due date, question blueprint, optional source text/file, and instructions.
2. The frontend posts a multipart request to `POST /api/assignments`.
3. Express stores the assignment in MongoDB and enqueues a BullMQ generation job.
4. The worker converts teacher input into a structured prompt, generates sections/questions/difficulty/marks, stores the result, and publishes WebSocket events.
5. The frontend subscribes to `ws://localhost:4000?assignmentId=...` and updates the progress and output page in real time.

## Key Files

- `frontend/src/app/page.tsx` - responsive dashboard, modal form, output paper and PDF action
- `frontend/src/store/useAssessmentStore.ts` - Zustand state and WebSocket updates
- `backend/src/server.ts` - Express API and assignment creation
- `backend/src/queue.ts` - BullMQ worker and fallback processor
- `backend/src/generator.ts` - structured prompt builder and parsed question-paper generation

## Environment

```env
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/vedaai
REDIS_URL=redis://127.0.0.1:6379
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
```

## Submission Notes

The implementation avoids rendering raw AI output. The generator produces normalized sections and question objects first, then the frontend renders a proper exam-paper layout with student information, section instructions, difficulty badges and marks.
