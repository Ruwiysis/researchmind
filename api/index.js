import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "llama-3.3-70b-versatile";

function truncate(text, max = 3000) {
  return text.length > max ? text.slice(0, max) + "\n...[truncated]" : text;
}

function docsContext(docs) {
  return docs
    .map((d, i) => `=== DOCUMENT ${i + 1}: ${d.name} ===\n${truncate(d.content, 2500)}`)
    .join("\n\n");
}

function extractJSON(text) {
  // Try direct parse first
  try { return JSON.parse(text); } catch {}
  // Strip markdown code fences
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) { try { return JSON.parse(fenced[1]); } catch {} }
  // Find first { ... } block
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch {}
  }
  throw new Error("Could not parse JSON from response");
}

async function chat(messages) {
  const res = await groq.chat.completions.create({
    model: MODEL,
    messages,
    temperature: 0.3,
    max_tokens: 4096,
  });
  return res.choices[0].message.content;
}

// ── /api/research ──
export async function POST_research(req) {
  const { query, documents } = req;
  const ctx = docsContext(documents);

  const content = await chat([
    {
      role: "system",
      content: `You are an expert research agent. Analyze documents and respond with a JSON object.
IMPORTANT: Output ONLY raw JSON, no markdown, no explanation.
Schema: {"answer":"string","keyInsights":["string"],"themes":["string"],"citations":[{"doc":"string","excerpt":"string","relevance":"string"}],"confidence":"high|medium|low","docsUsed":number}
Keep each field concise. Max 3 citations. Max 3 insights. Max 2 themes.`,
    },
    {
      role: "user",
      content: `Documents:\n${ctx}\n\nQuery: ${query}\n\nRespond with JSON only.`,
    },
  ]);
  return extractJSON(content);
}

// ── /api/compare ──
export async function POST_compare(req) {
  const { docA, docB, topic } = req;

  const content = await chat([
    {
      role: "system",
      content: `You are a document comparison expert. Output ONLY raw JSON, no markdown.
Schema: {"aspects":[{"label":"string","docA":"string","docB":"string","agreement":"agree|disagree|neutral"}],"docAStrengths":["string"],"docBStrengths":["string"],"keyDifference":"string","verdict":"string"}
Include exactly 4 aspects. Keep all values short (under 20 words each).`,
    },
    {
      role: "user",
      content: `Doc A (${docA.name}): ${truncate(docA.content, 2000)}\n\nDoc B (${docB.name}): ${truncate(docB.content, 2000)}\n\nTopic: ${topic}\n\nJSON only.`,
    },
  ]);
  return extractJSON(content);
}

// ── /api/summarize ──
export async function POST_summarize(req) {
  const { document: doc, style, focus } = req;

  const styleGuide = {
    executive: "Be decisive and concise like a C-suite brief.",
    detailed: "Be thorough and cover all major aspects.",
    academic: "Use formal academic language.",
    bullet: "Favor lists and bullet points.",
    eli5: "Use simple words and analogies for a 5-year-old.",
  };

  const content = await chat([
    {
      role: "system",
      content: `You are a document summarizer. ${styleGuide[style] || ""} Output ONLY raw JSON, no markdown.
Schema: {"tldr":"string","keyPoints":["string","string","string","string","string"],"themes":["string","string"],"terminology":["string","string","string","string"],"wordCount":"string","readingTime":"string"}
Keep each point under 15 words.`,
    },
    {
      role: "user",
      content: `Summarize${focus ? ` (focus: ${focus})` : ""}:\n\n${truncate(doc.content, 4000)}\n\nJSON only.`,
    },
  ]);
  return extractJSON(content);
}

// ── /api/chat ──
export async function POST_chat(req) {
  const { message, history, documents } = req;
  const ctx = docsContext(documents);

  const messages = [
    {
      role: "system",
      content: `You are ResearchMind, an AI research assistant. Documents available:\n\n${ctx}\n\nAnswer questions helpfully. Cite document names when relevant.`,
    },
    ...history.slice(-6),
    { role: "user", content: message },
  ];

  const reply = await chat(messages);
  return { reply };
}

// ── /api/extract-topics ──
export async function POST_extract_topics(req) {
  const { documents } = req;
  const ctx = docsContext(documents);

  const content = await chat([
    {
      role: "system",
      content: `Extract key topics from documents. Output ONLY raw JSON, no markdown.
Schema: {"topics":[{"name":"string","frequency":"high|medium|low","docs":["string"],"description":"string"}],"overallTheme":"string","suggestedQueries":["string","string","string"]}
Include exactly 5 topics. Keep descriptions under 15 words.`,
    },
    {
      role: "user",
      content: `Documents:\n${ctx}\n\nJSON only.`,
    },
  ]);
  return extractJSON(content);
}

// ── /api/timeline ──
export async function POST_timeline(req) {
  const { documents } = req;
  const ctx = docsContext(documents);

  const content = await chat([
    {
      role: "system",
      content: `Extract chronological events from documents. Output ONLY raw JSON, no markdown.
Schema: {"events":[{"date":"string","event":"string","doc":"string","importance":"high|medium|low"}],"earliestDate":"string","latestDate":"string","summary":"string"}
Include up to 8 events. Keep event descriptions under 15 words.`,
    },
    {
      role: "user",
      content: `Documents:\n${ctx}\n\nJSON only.`,
    },
  ]);
  return extractJSON(content);
}