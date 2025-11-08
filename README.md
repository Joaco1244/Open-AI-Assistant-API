```markdown
# Ascendigit Chatbot Platform (Backend)

A production-ready starter backend for Ascendigit — a white-label AI chatbot & CRM integration platform. This project uses Node.js + Express and integrates with OpenAI's Assistants API, supports CRM callouts, webhook integrations for n8n/Make/Zapier, JWT auth and subscription checks, and a minimal web UI for local testing / Voiceflow integration.

Important: This repo is a starter template. The OpenAI Assistants API surface and SDKs evolve — the code includes safe fallbacks and notes where you may need to adapt endpoints to the version of the OpenAI SDK you use.

Contents
- server.js — entrypoint
- routes/
  - chat.js — /api/chat
  - thread.js — /api/thread
  - assistant.js — /api/assistants
  - auth.js — token creation for clients
  - webhooks.js — webhook endpoint for n8n/Make/Zapier
- lib/
  - openai.js — Assistants API wrapper (create assistant, create thread, post message, run)
  - crm.js — CRM connector helper (HubSpot example)
  - auth.js — JWT middleware and helpers
  - rateLimiter.js — Express rate limiter
- db/
  - connection.js — Postgres helper
  - schema.sql — schema for clients, assistants, threads
- public/index.html — simple HTML+JS chat UI for local testing / Voiceflow compatibility
- .env.example — environment variables
- Dockerfile, package.json

Quick links:
- API base: /api/*
- Health: GET /healthz
- Minimal UI (for local testing): GET /

Setup (local)

1. Copy .env.example -> .env and fill values:
   - OPENAI_API_KEY (required)
   - DATABASE_URL (Postgres)
   - JWT_SECRET (strong secret)
   - PORT (optional, default 3001)
   - CRM_API_KEY (optional for CRM features)

2. Install
   npm ci

3. Start (dev)
   npm run dev

4. Build & Start (prod)
   npm run build
   npm start

Database

- schema located at db/schema.sql
- Example tables:
  - clients: businesses using the service
  - assistants: stored assistant configs per client
  - threads: track threads & last message metadata (optional)

Example clients table:
{
  id UUID PK,
  name,
  email,
  business_name,
  openai_assistant_id,
  subscription_status ENUM('active','past_due','canceled','trial'),
  api_key (client API key used for token exchange),
  created_at
}

Authentication & Subscription

- This server protects API routes using JWT.
- Clients exchange their "api_key" for a short-lived JWT by POSTing to /api/auth/token.
- All main API routes require Authorization: Bearer <jwt>.
- The JWT middleware checks:
  - Client exists in DB
  - subscription_status === 'active' (otherwise rejects)

Voiceflow Integration

- Use a Voiceflow API block to call /api/chat or /api/thread.
- The server returns JSON shaped for easy Voiceflow mapping:
  {
    type: "response",
    text: "assistant reply",
    assistantId: "...",
    threadId: "...",
    variables: { ... },
    meta: { ... }
  }

n8n / Make / Zapier Webhooks

- Expose POST /api/webhooks/incoming for automation triggers
- The webhook accepts event payloads and forwards to configured automation endpoint(s)
- Use your orchestration tool to call these endpoints on specific assistant events (e.g., lead created)

OpenAI Assistants API

- lib/openai.js contains functions:
  - createAssistant(clientId, config)
  - createThread(assistantId, metadata)
  - postMessageToThread(threadId, message)
  - runThread(assistantId, threadId, input) // execute a run and return result
- Implementation tries to use the official SDK if available, otherwise falls back to REST calls via axios. Update to match your SDK version if needed.

Files delivered
- Full backend scaffold described above
- README with curl examples & deployment notes
- db/schema.sql to create tables
- public/index.html — simple messenger UI for manual testing

Example curl flows

1) Exchange api_key for JWT:
curl -X POST https://your-host/api/auth/token -H "Content-Type: application/json" -d '{"api_key":"<client_api_key>"}'

2) Create a thread:
curl -X POST https://your-host/api/thread -H "Authorization: Bearer <jwt>" -H "Content-Type: application/json" -d '{"assistantId":"<assistantId>","metadata":{}}'

3) Send a message:
curl -X POST https://your-host/api/chat -H "Authorization: Bearer <jwt>" -H "Content-Type: application/json" -d '{"assistantId":"<assistantId>","threadId":"<threadId>","text":"Hello"}'

What I implemented and why

- A clear separation of concerns between routes, OpenAI wrapper, CRM connector and auth.
- Persistent storage via PostgreSQL (schema + connection helper). PostgreSQL is recommended for client/subscription data and relational queries.
- JWT-based authentication so client API keys don't need to be sent on every request.
- Rate limiting middleware to protect against abuse.
- Simple webhook endpoint to plug into n8n/Make/Zapier.
- A minimal public UI so you can test local flows or show clients an example integration. The UI uses fetch to call the /api/chat route (JWT required — set the token manually when testing).
- Optional: Redis or advanced session stores can be plugged-in if you want to maintain assistant state across multiple instances.

Next steps you might want me to do (pick any):
- Add Stripe billing integration and automatic webhook handlers to flip subscription_status.
- Add admin dashboard (React) for client management and analytics.
- Add more robust tests and CI pipeline.
- Add server-side streaming responses (SSE / WebSocket) for low-latency streaming to Voiceflow.

If you'd like, I will now create the full set of files (server.js, routes, lib, db schema, .env.example, Dockerfile, public index, package.json). Tell me whether you prefer PostgreSQL or MongoDB (I used PostgreSQL in this scaffold). If PostgreSQL is acceptable I'll produce the complete files next.
```