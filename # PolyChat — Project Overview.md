# PolyChat — Project Overview

## 1. Vision

The **PolyChat** is a full-stack, AI-powered multi-expert platform where users can interact with specialized “mentors” — each representing a unique domain of expertise such as chess, biblical studies, or stock analysis.

The goal is to create an extensible framework that allows seamless integration of:
- **LLM-based mentors** (e.g., Bible Tutor, General AI)
- **Tool-based mentors** (e.g., Chess Mentor using Stockfish)
- **Data-driven mentors** (e.g., Stock Mentor using financial APIs)
- **User personalization and memory** (each user’s context and history)

It bridges **conversation + computation + context** in one unified experience.

---

## 2. Problem Statement

Typical AI chat systems lack:
- Specialization: they respond generally without domain depth.
- Tool integration: they can’t execute tasks like Stockfish or indicator analysis.
- Context awareness: they forget mentor type or user goals.
- Transparent architecture: they operate as “black boxes.”

The PolyChat solves this by **modularizing expertise** into *mentors* and by combining:
- Persistent database memory (Supabase)
- External engines and APIs
- LLM-based reasoning and routing
- A dynamic, contextual chat UI

---

## 3. Objectives

### Primary Goals
- Build an AI chat platform capable of routing user queries to domain-specific mentors.
- Provide seamless UI feedback to reflect which mentor is active.
- Integrate computation engines (Stockfish, stock analysis, Bible database).
- Enable document and image uploads for contextual understanding.
- Maintain transparency via logs, version control, and modular design.

### Secondary Goals
- Serve as a scalable reference for future multi-agent projects.
- Support deployment on Vercel (frontend) and Cloud Run (tool microservices).
- Allow for open integration of future mentors (language learning, education, etc.).

---

## 4. System Overview

### Core Components

| Component | Description |
|------------|--------------|
| **PlannerAgent** | Determines user intent and routes query to the appropriate mentor. |
| **Mentor Agents** | Independent modules with domain-specific prompts, tools, and data sources. |
| **LLM Gateway** | Routes to OpenRouter, Vertex AI, or AgentKit depending on configuration. |
| **Tool Services** | External executables or APIs (e.g., Stockfish microservice, Alpha Vantage API). |
| **Supabase** | Backend for database, authentication, vector storage, and logging. |
| **Frontend (Vue + Vite)** | Chat interface, dynamic mentor icons, document/image upload UI. |
| **AgentKit (Future)** | Manages orchestrated workflows, tool tracing, and persistent memory. |

---

## 5. Mentor Types (Initial Set)

| Mentor | Description | Dependencies |
|---------|--------------|---------------|
| 🤖 **General Mentor** | Default conversational agent for reasoning or creative queries. | OpenRouter (GPT-4, Claude, etc.) |
| 📖 **Bible Mentor** | Provides scripture references, cross-references, and theological insights. | Supabase vector DB (Bible data) |
| ♟️ **Chess Mentor** | Analyzes board positions, explains strategy, and recommends best moves. | Stockfish API microservice |
| 💹 **Stock Mentor** | Retrieves market data, computes indicators (RSI, MACD), and interprets trends. | Alpha Vantage / Twelve Data APIs |
| 🧮 **Math / Language Mentors** | (Future) For computation and learning contexts. | Wolfram / custom datasets |

---

## 6. Technology Stack

| Layer | Technology | Purpose |
|--------|-------------|----------|
| **Frontend** | Vue + Vite + Tailwind / PrimeVue | Fast, modular, responsive chat UI |
| **State Management** | Pinia | Chat state, mentor context |
| **Backend / API** | Node.js / Express or Vercel Functions | Route queries and handle tool logic |
| **Database / Auth / Storage** | Supabase (PostgreSQL) | Persistent data and vector embeddings |
| **External Tools** | Stockfish, Alpha Vantage, Bible vector DB | Domain expertise |
| **LLM Access** | OpenRouter / Vertex AI / AgentKit | Natural language understanding and generation |
| **Deployment** | Vercel (frontend), Cloud Run / Render (microservices) | Scalable cloud setup |
| **Testing** | Vitest / Jest / Playwright | Unit, API, and UI testing |

---

## 7. High-Level Architecture
see high level architecture markdown file

(8) Gateway returns structured response  →  Frontend renders message, cards, and theme
* If using OpenAI hosted AgentKit, primary LLM stays OpenAI; OpenRouter can be called as a custom tool.


---

## 8. Development Methodology — *Vertical Slice Approach*

The system will be built in **6 vertical slices**, each representing an end-to-end working feature:

| Slice | Title | Focus |
|--------|--------|-------|
| 1 | Core Chat Mentor | Establish chat + Supabase |
| 2 | Multi-Mentor Routing | Add PlannerAgent and mentor modules |
| 3 | Tool Integration | Connect Chess Mentor → Stockfish |
| 4 | Knowledge-Grounded Mentors | Bible + Stock mentors with data |
| 5 | AgentKit Integration | Add tool orchestration and tracing |
| 6 | Personalization & UI Enhancements | Dynamic mentor UI, uploads, user memory |

Each slice is independently testable, deployable, and reviewed before progressing.

---

## 9. Key Features Summary

- **Auto-Routing Mentors:** Dynamic intent recognition.
- **Contextual UI:** Mentor icon and theme reflect active domain.
- **Document & Image Upload:** Enables chess board or text parsing.
- **Tool Integration:** External engines augment mentor intelligence.
- **Persistent Memory:** Conversation and mentor data stored in Supabase.
- **Extensible Mentors:** New domains can be added via configuration.
- **Logging and Observability:** Trace tool calls and mentor responses.

---

## 10. Target Users

| Persona | Description | Example Use |
|----------|--------------|-------------|
| **Learners / Students** | Interact with expert mentors for learning. | Ask Bible study questions or analyze chess openings. |
| **Traders / Hobbyists** | Seek quick analytical insights. | Check stock trends or portfolio ratios. |
| **Developers / Builders** | Extend mentors, add APIs, or test integrations. | Create new mentors for law, medicine, or science. |

---

## 11. Deployment Plan

- **Frontend:** Deployed on Vercel (`mentor-system.vercel.app`)
- **APIs:** Hosted via Vercel Functions or Cloud Run microservices.
- **Database:** Managed Supabase instance with RLS security.
- **External Tools:** Stockfish on Cloud Run / Render; APIs via HTTPS.
- **Monitoring:** Axiom, Logflare, or Sentry integrated with Supabase Edge Logs.
- **Versioning:** GitHub branches per slice; releases tagged `v0.x`.

---

## 12. Future Roadmap

| Stage | Focus |
|--------|--------|
| **v0.1** | Core chat + Bible Mentor |
| **v0.2** | Multi-mentor routing |
| **v0.3** | Chess Mentor integration |
| **v0.4** | Stock Mentor & RAG pipeline |
| **v0.5** | AgentKit orchestration |
| **v1.0** | Personalized Mentor Dashboard |

---

## 13. Success Criteria

- ✅ At least one mentor working end-to-end per vertical slice.
- ✅ Seamless UI transitions between mentors.
- ✅ Logs and traces visible for every query.
- ✅ Fully containerized deployment.
- ✅ Expandable mentor registry without core code rewrite.

---

## 14. License and Contribution

The Mentor System may be open-sourced under the **MIT License** (to be confirmed).  
Developers can contribute new mentor modules, datasets, or tool integrations by following version control and branch conventions defined in `07_Version_Control_and_Branching.md`.

---

## 15. Authors & Credits

- **Project Lead:** log 1104  
- **Contributors:** TBD (future mentors / developers)  
- **Acknowledgements:** Stockfish Project, Supabase team, OpenRouter community, OpenAI AgentKit.

---

*This document serves as the high-level entry point for all contributors and developers involved in the Mentor System project.*