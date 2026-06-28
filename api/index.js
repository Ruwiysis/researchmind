import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "llama-3.3-70b-versatile";

function truncate(text, max = 6000) {
  return text.length > max ? text.slice(0, max) + "\n...[truncated]" : text;
}

function docsContext(docs) {
  return docs
    .map(
      (d, i) =>
        `=== DOCUMENT ${i + 1}: ${d.name} ===\n${truncate(d.content, 5000)}`
    )
    .join("\n\n");
}

async function chat(messages, jsonMode = false) {
  const res = await groq.chat.completions.create({
    model: MODEL,
    messages,
    temperature: 0.3,
    max_tokens: 2048,
    ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
  });
  return res.choices[0].message.content;
}

// ── /api/research ──
export async function POST_research(req) {
  const { query, documents } = req;
  const ctx = docsContext(documents);

  const content = await chat(
    [
      {
        role: "system",
        content: `You are an expert research agent. Analyze the provided documents carefully and respond ONLY with valid JSON.
Return this exact shape:
{
  "answer": "multi-paragraph synthesized answer with **bold** for key terms",
  "keyInsights": ["insight 1", "insight 2", "insight 3"],
  "themes": ["theme 1", "theme 2"],
  "citations": [{"doc": "doc name", "excerpt": "short quote", "relevance": "why this is cited"}],
  "confidence": "high|medium|low",
  "docsUsed": <number>
}`,
      },
      {
        role: "user",
        content: `Documents:\n${ctx}\n\nResearch Query: ${query}`,
      },
    ],
    true
  );
  return JSON.parse(content);
}

// ── /api/compare ──
export async function POST_compare(req) {
  const { docA, docB, topic } = req;

  const content = await chat(
    [
      {
        role: "system",
        content: `You are a document comparison expert. Compare two documents on a given topic. Respond ONLY with valid JSON:
{
  "aspects": [
    {"label": "aspect name", "docA": "what doc A says", "docB": "what doc B says", "agreement": "agree|disagree|neutral"}
  ],
  "docAStrengths": ["strength 1", "strength 2"],
  "docBStrengths": ["strength 1", "strength 2"],
  "keyDifference": "the single most important difference",
  "verdict": "overall comparative verdict paragraph"
}
Include 5-7 aspects.`,
      },
      {
        role: "user",
        content: `Document A (${docA.name}):\n${truncate(docA.content, 4000)}\n\nDocument B (${docB.name}):\n${truncate(docB.content, 4000)}\n\nCompare on: ${topic}`,
      },
    ],
    true
  );
  return JSON.parse(content);
}

// ── /api/summarize ──
export async function POST_summarize(req) {
  const { document: doc, style, focus } = req;

  const styleGuide = {
    executive: "Write like a C-suite executive brief. Be decisive and concise.",
    detailed: "Write a detailed, thorough analysis covering all major aspects.",
    academic: "Write in academic style with formal language and structured analysis.",
    bullet: "Emphasize bullet points and lists. Minimize prose.",
    eli5: "Explain like I'm 5 years old. Use simple words and analogies.",
  };

  const content = await chat(
    [
      {
        role: "system",
        content: `You are a world-class document summarizer. ${styleGuide[style] || ""} Respond ONLY with valid JSON:
{
  "tldr": "one-sentence summary",
  "keyPoints": ["point 1", "point 2", "point 3", "point 4", "point 5"],
  "themes": ["theme 1", "theme 2", "theme 3"],
  "terminology": ["term1", "term2", "term3", "term4", "term5"],
  "wordCount": "approx word count string e.g. '2,400 words'",
  "readingTime": "e.g. '10 min'"
}`,
      },
      {
        role: "user",
        content: `Summarize this document${focus ? ` focusing on: ${focus}` : ""}:\n\n${truncate(doc.content, 8000)}`,
      },
    ],
    true
  );
  return JSON.parse(content);
}

// ── /api/chat ──
export async function POST_chat(req) {
  const { message, history, documents } = req;
  const ctx = docsContext(documents);

  const messages = [
    {
      role: "system",
      content: `You are ResearchMind, an expert AI research assistant. You have access to the following documents:\n\n${ctx}\n\nAnswer questions about these documents accurately and helpfully. Cite document names when relevant. Be conversational but precise.`,
    },
    ...history.slice(-8),
    { role: "user", content: message },
  ];

  const reply = await chat(messages);
  return { reply };
}

// ── /api/extract-topics ──
export async function POST_extract_topics(req) {
  const { documents } = req;
  const ctx = docsContext(documents);

  const content = await chat(
    [
      {
        role: "system",
        content: `Analyze documents and extract key topics. Respond ONLY with valid JSON:
{
  "topics": [
    {"name": "topic name", "frequency": "high|medium|low", "docs": ["doc names that cover this topic"], "description": "brief description"}
  ],
  "overallTheme": "the unifying theme across all documents",
  "suggestedQueries": ["question 1", "question 2", "question 3"]
}
Include 5-8 topics.`,
      },
      {
        role: "user",
        content: `Analyze these documents:\n${ctx}`,
      },
    ],
    true
  );
  return JSON.parse(content);
}

// ── /api/timeline ──
export async function POST_timeline(req) {
  const { documents } = req;
  const ctx = docsContext(documents);

  const content = await chat(
    [
      {
        role: "system",
        content: `Extract a chronological timeline of events, dates, and milestones from the documents. Respond ONLY with valid JSON:
{
  "events": [
    {"date": "date or period", "event": "what happened", "doc": "source document", "importance": "high|medium|low"}
  ],
  "earliestDate": "earliest date found",
  "latestDate": "latest date found",
  "summary": "overall timeline summary"
}
Sort events chronologically. Include up to 15 events.`,
      },
      {
        role: "user",
        content: `Extract timeline from:\n${ctx}`,
      },
    ],
    true
  );
  return JSON.parse(content);
}
