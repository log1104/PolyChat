# Mentor System — User Guide and Feature Overview

## 1. Purpose

This guide explains how to use the **Mentor System** — an AI-driven, multi-expert chat platform where users can interact with specialized mentors across different knowledge domains.  
Each mentor combines large-language-model reasoning with real-time data tools or knowledge bases to deliver accurate, contextual responses.

---

## 2. Getting Started

### 2.1 Accessing the System
1. Open the web app (hosted on **Vercel**) from any modern browser.  
2. Sign in (optional) with your Supabase account to save chats and preferences.  
3. You’ll be greeted by the **General AI Mentor** 🤖 in the chat window.

### 2.2 Basic Chat Flow
- Type a question in the message box and press **Enter** or click **Send**.  
- The **PlannerAgent** detects your intent and automatically activates the relevant mentor.  
- The mentor’s avatar and color theme appear to indicate the current context.  
- Replies appear in threaded chat bubbles, optionally enriched with data cards or visual cues.

---

## 3. Mentor Profiles

| Mentor | Icon | Description | Key Features |
|---------|------|--------------|---------------|
| 🤖 **General Mentor** | Grey AI icon | Default assistant for reasoning, explanation, and general chat. | Conversational, multi-domain, fallback for unclassified queries. |
| 📖 **Bible Mentor** | Gold book icon | Specialized in scripture, theology, and cross-references. | Retrieves verses, commentary notes, and contextual links via Supabase vector DB. |
| ♟️ **Chess Mentor** | Blue chess-knight icon | Uses Stockfish engine to analyze chess positions. | Accepts FEN strings or board images, returns best moves and strategy insights. |
| 💹 **Stock Mentor** | Green chart icon | Connects to financial APIs for stock metrics and trends. | Computes RSI, MACD, and price movement summaries. |
| 🧮 **Math / Language Mentors** *(Future)* | Themed icons | Educational mentors for learning and practice. | Step-by-step reasoning, quiz decks, formula explanations. |

---

## 4. Chat Interface Features

### 4.1 Layout
- **Message Stream:** Displays alternating user and mentor messages.
- **Input Bar:** Supports text entry, emojis, and file/image upload.
- **Sidebar:** Shows mentor selector, session list, and conversation history.
- **Top Context Bar:** Displays the active mentor name, icon, and tool status.

### 4.2 Contextual Indicators
| Context | UI Response |
|----------|--------------|
| Bible topic | 📖 icon + gold theme |
| Chess query | ♟️ icon + blue theme |
| Stock/finance | 💹 icon + green theme |
| General chat | 🤖 icon + neutral grey theme |

### 4.3 File and Image Uploads
- Upload **images** (e.g., chess boards) or **documents** (text/PDF).  
- The system automatically detects content type:  
  - Chess boards → Chess Mentor  
  - Bible passages → Bible Mentor  
  - Financial reports → Stock Mentor  
  - General text → General AI Mentor  
- Uploaded files appear as small cards in the chat stream with parsing progress indicators.

### 4.4 Responsive Design
- Fully mobile-friendly layout.  
- Supports dark/light mode.  
- Keyboard shortcuts:  
  - **Enter** — send message  
  - **Shift+Enter** — new line  
  - **Ctrl+K** — open mentor selector  

---

## 5. Core Features

| Feature | Description |
|----------|--------------|
| 💬 **Smart Chat Routing** | Detects query type and activates the appropriate mentor. |
| 🔄 **Persistent Conversation Memory** | Stores sessions and mentor context in Supabase. |
| 🧠 **Tool-Assisted Intelligence** | Mentors can call APIs or executables (e.g., Stockfish, Alpha Vantage). |
| 📁 **Document & Image Uploads** | Adds contextual understanding to mentor replies. |
| 🧭 **PlannerAgent Integration** | Classifies intent using keyword + semantic matching. |
| 🌈 **Dynamic UI Themes** | Each mentor uses a distinct color palette and avatar. |
| 🔍 **Trace & Logs (Developer Mode)** | Displays tool calls and raw API responses for debugging. |
| 📈 **Analytics Dashboard (Planned)** | Track mentor usage, response latency, and success rate. |
| 🧩 **Extensible Mentor Registry** | New mentors can be added through configuration files. |

---

## 6. Example Interactions

### 6.1 Bible Mentor
**User:** “Show verses about purity of mind.”  
**Mentor:** Searches vector database → returns verses and cross-references (e.g., *Philippians 4:8*, *1 John 2:15-16*).  
**Follow-up:** “Compare with friendship with the world.” → Mentor auto-links contextual references.

### 6.2 Chess Mentor
**User:** “What is the best move from this FEN: `rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1`?”  
**Mentor:** Calls Stockfish API → returns `e2e4` with reasoning (“controls center, opens bishop lines”).

### 6.3 Stock Mentor
**User:** “Is AAPL overbought this week?”  
**Mentor:** Fetches RSI from Alpha Vantage → explains RSI > 70 indicates overbought conditions.

### 6.4 File Upload Example
**User:** Uploads a PDF titled *“Q3 Financial Summary.”*  
**System:** Detects finance content → switches to Stock Mentor → summarizes profitability trends.

---

## 7. Personalization Features

- **User Profiles:** Track mentor usage and favorite mentors.  
- **Saved Sessions:** Recall previous conversations.  
- **Custom Prompts:** Adjust mentor behavior (“Teach me at beginner level”).  
- **Learning Decks:** Generate flashcards (for Bible or language mentors).  
- **Local Storage:** Caches sessions for offline recall.

---

## 8. Tips for Best Experience

- Ask clear, domain-specific questions to trigger correct mentor routing.  
- For chess: include **FEN** or upload a board image.  
- For Bible: mention verses or keywords (“faith,” “Sabbath”).  
- For stocks: provide ticker symbols and timeframes (“AAPL this week”).  
- Use document uploads for multi-paragraph context (e.g., financial reports).  
- Watch the mentor icon change — it signals which expert is active.

---

## 9. Limitations (Prototype Phase)

- File upload limited to 5 MB.  
- Stockfish and external APIs have latency under heavy load.  
- Multi-mentor chaining (e.g., Bible → General → Stock) in development.  
- Offline mode limited to chat history replay.

---

## 10. Roadmap Summary

| Version | Key Additions |
|----------|---------------|
| **v0.1** | Core chat with Bible Mentor |
| **v0.2** | Multi-mentor routing |
| **v0.3** | Chess Mentor (Stockfish API) |
| **v0.4** | Stock Mentor (market data) |
| **v0.5** | AgentKit orchestration & tracing |
| **v1.0** | Personalized dashboard, uploads, analytics |

---

## 11. Support & Feedback

- **Bug reports / Suggestions:** Open an issue on GitHub.  
- **Feature requests:** Tag with `enhancement`.  
- **Mentor contributions:** See `07_Version_Control_and_Branching.md` for PR process.  
- **Contact:** log 1104 (maintainer)

---

*This document serves as the end-user and feature reference for the Mentor System project. It pairs with the technical and architecture documentation in the subsequent files.*
