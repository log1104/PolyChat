# Mentor System — UI and Interaction Design

## 1. Overview

The **Mentor System UI** provides a unified, chat-based interface where users can interact with multiple domain experts through a single conversational window.  
The interface focuses on **clarity**, **context-awareness**, and **responsiveness**, ensuring that users always know *which mentor is active* and *what context they’re in*.

Design principles:
- **Familiarity:** Feels like modern chat apps (ChatGPT, Slack, WhatsApp).  
- **Context Visibility:** Mentor icons, colors, and labels update in real time.  
- **Focus on Flow:** Users stay in the conversation — no modal interruptions.  
- **Scalability:** Each mentor can extend the interface with specialized input types (e.g., file uploads, chess board images).

---

## 2. Core Layout

The layout is modular and responsive, adapting to mobile, tablet, and desktop screens.  
Reference mock-up: see `design/assets/mentorbox_UI.png` for the latest annotated screenshot.

### 2.1 Structural Diagram

<RootApp> ├── <Sidebar /> ← mentor selector, session list, history ├── <TopBar /> ← current mentor, icons, settings ├── <ChatWindow /> ← main chat stream │ ├── <MessageList /> ← user + mentor messages │ ├── <MessageInput /> ← text entry, file/image uploads │ └── <ContextBar /> ← shows active mentor, status ├── <UploadModal /> ← preview files/images └── <SettingsDrawer /> ← theme, API settings, account info ```
2.2 Responsive Layout
Device	Layout Behavior
Desktop	Sidebar pinned left, chat central, settings right.
Tablet	Sidebar collapsible; chat uses full width.
Mobile	Single-column layout with floating mentor icon and upload button.

3. Color and Theme System
Each mentor has a distinct color theme and avatar to visually indicate context.

Mentor	Icon	Theme Color	Description
🤖 General Mentor	🤖	Neutral Gray / Slate	Default mode for all-purpose chat.
📖 Bible Mentor	📖	Gold / Warm Ivory	Scriptural and reflective mood.
♟️ Chess Mentor	♟️	Blue / Indigo	Analytical, cool tone representing strategy.
💹 Stock Mentor	💹	Green / Emerald	Represents growth, finance, clarity.
🧮 Math / Language Mentor	🧮	Violet / Purple	Academic, calm learning tone.

Themes are defined as Tailwind tokens in theme.config.ts:

ts
Copy code
export const mentorThemes = {
  general: { color: "slate", accent: "gray" },
  bible: { color: "amber", accent: "yellow" },
  chess: { color: "indigo", accent: "blue" },
  stock: { color: "emerald", accent: "green" },
  math: { color: "violet", accent: "purple" },
};
4. Chat Window Design
4.1 Message Layout
Each message bubble displays:

Sender icon (mentor or user)

Message text

Timestamp

Mentor context ribbon (colored accent bar)

Example:

arduino
Copy code
📖 Bible Mentor
──────────────────────
"Set your minds on things above, not on earthly things."
(Colossians 3:2)
──────────────────────
🕒 10:24 AM
4.2 Message Input Bar
Multi-line input (Shift + Enter for newline)

Unified upload button (📎) for files and images

“Send” button (Enter)

Enhanced behaviors:

Auto-mentor detection triggers before send (live classification based on text or attached files).

Attached files previewed inline below input with thumbnails/icons, names, sizes, and remove options.

Pressing “Send” uploads files to Supabase Storage and queues both text and files as one message.

5. Contextual Mentor Feedback
5.1 Active Mentor Indicator
A floating mentor status chip at the top of the chat window shows:

yaml
Copy code
🟢 Active Mentor: Chess ♟️
This updates dynamically as the system detects context.

5.2 Switching Mentors
The user can:

Manually switch mentors from the sidebar (drop-down list).

Or allow automatic switching via PlannerAgent (default).
A subtle animation (fade + color shift) indicates the transition.

5.3 Status States
State	Visual Indicator
Thinking / calling tool	Pulsing mentor icon
Waiting for API response	Spinner beside mentor name
Error / retry	Red dot + tooltip “Connection lost”
Idle / ready	Static mentor icon

6. Sidebar
The left sidebar serves three primary purposes:

Mentor Selector: Switch or add mentors.

Session List: Resume or delete previous conversations.

Quick Actions: Access user dashboard, preferences, and help.

Sidebar items display mentor icons beside session titles for visual memory.

Example:

arduino
Copy code
📖 Bible Study — "Faith and Grace"
♟️ Chess — "Italian Game Analysis"
💹 Stock — "TSLA Trend Review"
7. File and Image Upload Flows
7.1 File Types Supported
Type	Max Size	Example Use
.txt, .pdf, .docx	5 MB	Bible or document study
.png, .jpg, .jpeg	5 MB	Chess board snapshots
.csv	2 MB	Stock data uploads

7.2 Upload Process
User clicks the 📎 icon to select files/images.

Selected files preview inline in input area (thumbnails for images, icons for docs, with name/size/remove).

System detects file type on selection and auto-switches mentor if applicable (e.g., image → Chess, CSV → Stock).

On send, files upload to Supabase Storage, metadata saved in DB.

Uploaded files appear as inline “cards” in chat messages:

yaml
Copy code
📁 Uploaded: board_position.jpg
Name: board_position.jpg | Size: 1.2 MB
→ Mentor activated: Chess ♟️
7.3 Security and Storage
All uploads stored in Supabase Storage bucket "uploads".

MIME validation on client; files sent with messages to API.

Auto-cleanup after 48 hours (configurable, not implemented yet).

8. Interaction Design Patterns
Interaction	Description
Hover / Tooltip	Hovering over a mentor icon shows mentor name and domain.
Quick Commands	/mentor to switch mentors, /help for commands list.
Keyboard Shortcuts	Ctrl + K = open mentor selector, Ctrl + U = upload file.
Progress Feedback	Animated dots during model or tool processing.
Error Recovery	“Try again” option appears for failed API calls.
Auto-scroll	Chat view scrolls smoothly to new messages. (Implemented)
Dark/Light Mode Toggle	User preference stored locally.

9. Accessibility
All mentor icons include aria-labels for screen readers.

Sufficient color contrast per WCAG AA.

Keyboard navigation for all UI elements.

Font scaling supported via browser settings.

Motion reduction preference respected (disables animations).

10. Responsive States
Desktop
sql
Copy code
+-----------------------------------+
| Sidebar | Chat Window | Settings  |
+-----------------------------------+
Tablet
arduino
Copy code
Sidebar collapses, Chat expands full width.
Mobile
css
Copy code
Single-column mode.
Floating mentor icon bottom-right.
Mobile floating UI elements:

🟢 Mentor icon (tap to switch)

📎 Upload

⚙️ Settings

11. Visual Design Tokens
Token	Purpose	Example
--mentor-color	Accent color per mentor	#2563EB (indigo for chess)
--mentor-bg	Background gradient	linear-gradient(to bottom, ...)
--font-primary	Default font	Inter / Roboto
--radius	Bubble rounding	1rem
--shadow-depth	Chat card elevation	0 1px 3px rgba(0,0,0,0.1)

These tokens are captured in `design/tailwind.tokens.ts`, with matching PrimeVue variables in `design/primevue.theme.ts`.

12. User States
State	Description
Guest User	Can chat with all mentors but session data stored locally.
Authenticated User	Sessions saved in Supabase; can view dashboard.
Mentor Developer Mode	Exposes tool logs and API traces in UI.

13. Micro-Interactions and Animations
Mentor Activation: Gradient background fade (0.4s).

File Upload: Bounce-in preview card.

Chat Bubbles: Scale-in from bottom (0.2s). (Implemented)

API Call Progress: Animated “...” dots below mentor name.

Theme Change: Smooth transition using CSS transition: all 0.4s ease.

14. Future UI Enhancements
Feature	Description
Mentor Dashboard	Overview of user’s mentors, usage, performance.
Embedded Mini-Tools	Inline calculator, verse search, or chart widgets.
Voice Mode	Speech-to-text and TTS playback for mentors.
Multi-Mentor Collaboration View	Panel showing two mentors debating or co-analyzing.
Saved Snippets Panel	Quick retrieval of key mentor responses.

15. Design References
Material Design 3 Guidelines — for adaptive surfaces and motion.

Tailwind Design Tokens - for scalable theme control.

PrimeVue - for prebuilt accessible Vue components.

Repository assets - see `design/README.md` for Tailwind/PrimeVue tokens and mockups.

Figma Prototype (planned) - visual reference for future collaborators.
