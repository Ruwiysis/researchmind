# ResearchMind AI 🧠
### Agentic Multi-Document Research & Q&A Assistant

Built for the **Agentic Multi-Document Research and Q&A Assistant** Workshop.

---

## Features

| Feature | Description |
|---|---|
| 🔍 **Multi-Doc Research** | Ask questions across all documents, get cited answers |
| ⚖️ **Document Compare** | Side-by-side comparison on any topic with agreement/disagreement analysis |
| 📄 **Smart Summarize** | 5 styles: Executive, Detailed, Academic, Bullet, ELI5 |
| 🗺 **Topic Explorer** | AI maps all topics across your library with frequency & connections |
| 📅 **Timeline Builder** | Extracts dates and events into a visual chronological timeline |
| 💬 **Document Chat** | Conversational Q&A with your documents, context-aware |

All powered by **Groq API** with `llama-3.3-70b-versatile` on the backend.

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set your Groq API key

Get a free key at https://console.groq.com

**For local dev:**
```bash
export GROQ_API_KEY=your_key_here
```

**For Vercel (recommended):** Add `GROQ_API_KEY` in your project's Environment Variables settings.

### 3. Run locally

```bash
npm run dev
```

Visit http://localhost:3000

### 4. Deploy to Vercel

```bash
# Install Vercel CLI if not already installed
npm install -g vercel

# Deploy
npm run deploy
```

Set `GROQ_API_KEY` in your Vercel project environment variables.

---

## Project Structure

```
researchmind/
├── public/
│   └── index.html          # Full frontend (single-file SPA)
├── api/
│   ├── index.js            # Shared Groq logic
│   ├── research.js         # POST /api/research
│   ├── compare.js          # POST /api/compare
│   ├── summarize.js        # POST /api/summarize
│   ├── chat.js             # POST /api/chat
│   ├── extract-topics.js   # POST /api/extract-topics
│   └── timeline.js         # POST /api/timeline
├── vercel.json             # Vercel deployment config
├── package.json
└── README.md
```

---

## API Endpoints

| Endpoint | Method | Body | Returns |
|---|---|---|---|
| `/api/research` | POST | `{query, documents}` | `{answer, keyInsights, themes, citations, confidence}` |
| `/api/compare` | POST | `{docA, docB, topic}` | `{aspects, docAStrengths, docBStrengths, verdict}` |
| `/api/summarize` | POST | `{document, style, focus}` | `{tldr, keyPoints, themes, terminology}` |
| `/api/chat` | POST | `{message, history, documents}` | `{reply}` |
| `/api/extract-topics` | POST | `{documents}` | `{topics, overallTheme, suggestedQueries}` |
| `/api/timeline` | POST | `{documents}` | `{events, summary, earliestDate, latestDate}` |

---

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS (no framework, fully self-contained)
- **Backend:** Node.js serverless functions (Vercel)
- **AI:** Groq API — `llama-3.3-70b-versatile`
- **Deployment:** Vercel

---

Made with ♥ for the Agentic AI Workshop
