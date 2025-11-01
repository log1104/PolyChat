# Mentor System — Technical Architecture and Design

## 1. Overview

The **Mentor System** is designed as a modular, full-stack web application that integrates conversational AI with external computational and data services.  
Its architecture follows a **service-oriented and agent-based design**, where each “mentor” is a specialized AI module with its own data, tools, and logic.

The architecture emphasizes:
- **Modularity:** Each mentor operates independently with clear boundaries.
- **Transparency:** Logs, tools, and API calls are visible and traceable.
- **Extensibility:** New mentors, data sources, and tools can be added without changing core code.
- **Scalability:** Cloud-native deployment (Vercel + Supabase + Cloud Run).
- **Maintainability:** Vertical-slice development ensuring each feature is end-to-end complete.

---

## 2. Core Components

| Component | Role | Technology |
|------------|------|-------------|
| **Frontend (Chat UI)** | Provides user interface and context-aware mentor interactions. | Vue + Vite + Tailwind + Pinia |
| **PlannerAgent** | Interprets user intent and routes messages to the correct mentor. | Node.js + lightweight NLP / keyword classification |
| **Mentor Modules** | Domain-specific AI agents (Bible, Chess, Stock, General). | Modular TypeScript classes or directories |
| **API Gateway** | Routes chat requests, handles tool calls, and manages errors. | Express.js / Vercel Functions |
| **Supabase** | Backend services (PostgreSQL, Auth, Storage, Vector DB, Logs). | Supabase Cloud |
| **Tool Integrations** | External engines and APIs (e.g., Stockfish, Alpha Vantage). | HTTP APIs / Cloud Run microservices |
| **LLM Providers** | Core natural language reasoning. | OpenRouter / Vertex AI / AgentKit |
| **CI/CD & Monitoring** | Build, deploy, and track logs. | GitHub Actions + Sentry + Logflare |

---

## 3. System Architecture Diagram

                 ┌────────────────────────────────┐
                 │         FRONTEND (UI)           │
                 │  Vue + Vite + Tailwind        │
                 │  Context-aware chat interface   │
                 └───────────────┬─────────────────┘
                                 │
                                 ▼
                 ┌────────────────────────────────┐
                 │        API GATEWAY / SERVER     │
                 │  Node.js / Express / Vercel Fn  │
                 └───────────────┬─────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
     ┌────────▼───────┐  ┌───────▼────────┐  ┌──────▼────────┐
     │  PlannerAgent  │  │  Supabase DB    │  │   Tool APIs    │
     │ (intent route) │  │ Auth / Memory / │  │ (Stockfish,    │
     │                │  │ Vector Search   │  │ Alpha Vantage) │
     └────────┬───────┘  └──────┬─────────┘  └──────┬────────┘
              │                 │                    │
    ┌─────────▼────────┐  ┌─────▼──────┐     ┌──────▼─────┐
    │ Mentor: Bible    │  │ Mentor:    │     │ Mentor:     │
    │ + Supabase Vector│  │ Chess      │     │ Stock       │
    │ + Cross-ref Data │  │ + Stockfish│     │ + APIs      │
    └──────────────────┘  └────────────┘     └─────────────┘

---

## 4. Data Flow

1. **User Input:**  
   - The user types a message or uploads a file/image via the Vue UI.
   - Message sent to `/api/chat` (Vercel function or Express route).

2. **PlannerAgent:**  
   - Parses the message for intent (Bible / Chess / Stock / General).
   - Uses keyword and embedding similarity to determine the best mentor.

3. **Mentor Processing:**  
   - Mentor module prepares the query:
     - Bible → Supabase vector query for similar verses.
     - Chess → POST FEN to Stockfish API.
     - Stock → Fetch RSI/MACD from Twelve Data.
   - Each mentor uses its own prompt template and data pipeline.

4. **Response Generation:**  
   - Results from tools are formatted and optionally sent to the LLM for natural-language explanation.
   - Mentor returns structured JSON `{answer, toolData, source}` to API Gateway.

5. **Frontend Display:**  
   - The UI displays mentor response with proper avatar, color theme, and optional data cards.

6. **Persistence and Logging:**  
   - Chat history, mentor context, and logs are stored in Supabase tables:
     - `conversations`
     - `mentor_logs`
     - `user_profiles`

---

## 5. Database Design (Supabase)

### Core Tables

| Table | Purpose | Key Fields |
|--------|----------|------------|
| `users` | User authentication and profiles. | `id`, `email`, `created_at`, `preferences` |
| `conversations` | Stores messages between user and mentors. | `id`, `user_id`, `mentor`, `message`, `response`, `timestamp` |
| `mentor_logs` | Records tool API calls and errors. | `id`, `mentor`, `tool`, `request_json`, `response_json`, `created_at` |
| `vector_verses` | Bible verse embeddings for semantic search. | `id`, `book`, `verse`, `embedding` |
| `uploads` | User-uploaded files with metadata. | `id`, `user_id`, `file_url`, `type`, `context_detected` |

All sensitive operations protected by **Row-Level Security (RLS)** policies.

---

## 6. Mentor Architecture (Modules)

Each mentor is encapsulated as an independent module:

/src/mentors/
├── base.ts
├── bibleMentor.ts
├── chessMentor.ts
├── stockMentor.ts
├── generalMentor.ts
└── index.ts


### Example Mentor Structure (TypeScript)
```ts
export class ChessMentor extends BaseMentor {
  name = "chess";
  icon = "♟️";

  async analyze(input) {
    const response = await fetch(STOCKFISH_URL, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ fen: input, depth: 12 })
    });
    const result = await response.json();
    return `Best move: ${result.bestmove}. Stockfish evaluation indicates this move controls the center.`;
  }
}


Each mentor implements:

analyze(input) — main processing logic.

explain(result) — converts raw data into readable text.

log() — optional telemetry for tool performance.

7. Frontend Architecture
UI Stack

Framework: Vue 3 + Vite

Styling: Tailwind CSS + PrimeVue

State: Pinia (for chat state and mentor context)

Routing: Vue Router

Storage: Supabase client SDK

<App>
 ├── <Sidebar />          → mentor selector + session list
 ├── <ChatWindow />       → chat stream + mentor bubbles
 │    ├── <MessageList />
 │    ├── <MessageInput /> → text + file uploads
 │    └── <ContextBar />   → active mentor indicator
 └── <SettingsDrawer />   → theme + preferences
8. Backend Design
API Routes
Route	Description
/api/chat	Main entry point for chat messages.
/api/tools/chess	For FEN → Stockfish analysis.
/api/tools/stock	For financial indicators.
/api/tools/bible	For verse retrieval / cross-references.
/api/uploads	Handles file/image uploads.

All routes use async handlers with standardized response format:
{
  "mentor": "chess",
  "response": "Best move e2e4",
  "data": {"bestmove": "e2e4"}
}
9. Tool Integrations
Tool	Purpose	Access Method
Stockfish API	Chess engine analysis.	REST endpoint (Cloud Run / Render).
Alpha Vantage / Twelve Data	Stock prices and indicators.	HTTP GET with API key.
Bible Data (JSON + Embeddings)	Verse lookup, cross-references.	Supabase vector search.
OpenRouter / Vertex AI / AgentKit	LLM reasoning, natural explanations.	REST API / SDK.

All external tools are accessed through lib/tools.ts, ensuring isolation and easy testing.

10. Integration with AgentKit (Future)
Planned Capabilities

Multi-step workflows: Mentor agents can delegate sub-tasks to others.

Tool tracing: Built-in AgentKit “trace view” for debugging.

Memory persistence: Store intermediate reasoning states in Supabase.

ChatKit embedding: Replace frontend chat window with AgentKit ChatKit components.

Example Flow
User → PlannerAgent → ChessMentor
  ↳ AgentKit Node: Call Stockfish API
  ↳ AgentKit Node: Summarize explanation via LLM
  ↳ Return → UI

11. Deployment Architecture
Layer	Platform	Notes
Frontend	Vercel	Fast static builds and API routing.
Database / Auth	Supabase Cloud	PostgreSQL backend with edge functions.
Tool Microservices	Cloud Run / Render	Hosts Stockfish and other heavy tasks.
Logging / Monitoring	Logflare / Axiom / Sentry	Centralized logging and tracing.
CI/CD	GitHub Actions	Auto-deploys to Vercel + Cloud Run.
Example Deployment Pipeline

Developer merges branch → main.

GitHub Action triggers build/test.

On success → auto-deploy to staging (Vercel Preview).

Manual approve → production deploy.

12. Security and Privacy

Authentication: Supabase Auth (JWT-based sessions).

Row-Level Security: Ensures users only access their own data.

Environment Variables: Managed via .env and Vercel dashboard.

CORS Policy: Restricted to trusted origins.

File Uploads: Virus scanning and MIME type enforcement.

Logging: Non-sensitive summaries only (no private keys or PII).

13. Scalability Considerations
Layer	Scaling Approach
Frontend	CDN edge cache (Vercel).
Backend API	Stateless functions (horizontal scaling).
Supabase DB	Connection pooling and replication.
Tools	Auto-scale Cloud Run containers.
LLM Calls	Batched / rate-limited through gateway.

14. Error Handling and Logging

Each mentor logs errors to mentor_logs.

API Gateway handles exceptions with unified error objects:

{ "error": true, "message": "Stockfish timeout" }


Alerts sent via Sentry webhook.

Fallback logic:

If tool API fails → fallback to LLM approximation.

If LLM unavailable → cached result or apology message.

15. Design Principles Summary
Principle	Description
Transparency	Every mentor’s tool calls are visible and traceable.
Isolation	Each mentor encapsulates logic and tools independently.
Expandability	New mentors can be added by registering in mentors.json.
Observability	Full-stack logs and analytics for debugging.
Vertical Completeness	Each feature is an end-to-end slice, deployable individually.
16. Future Enhancements

Realtime mentor collaboration (multi-agent discussions).

Voice input + speech synthesis.

Offline-first mode (local embeddings).

Mentor marketplace (plug-and-play mentor modules).

Advanced analytics dashboard.

17. References

Supabase Documentation

Vercel Serverless Functions

Google Cloud Run

Stockfish Engine

Alpha Vantage API

OpenRouter Models

OpenAI AgentKit