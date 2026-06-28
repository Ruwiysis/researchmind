import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "llama-3.3-70b-versatile";

function truncate(text, max = 2000) {
  return text.length > max ? text.slice(0, max) + "\n...[truncated]" : text;
}

function docsContext(docs) {
  return docs
    .map((d, i) => `=== DOC ${i + 1}: ${d.name} ===\n${truncate(d.content, 1500)}`)
    .join("\n\n");
}

function extractJSON(text) {
  console.log("RAW MODEL OUTPUT:", text.slice(0, 500));
  try { return JSON.parse(text.trim()); } catch {}
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) { try { return JSON.parse(fenced[1].trim()); } catch {} }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch {}
  }
  // Last resort: return the raw text wrapped in a valid object
  return { answer: text, keyInsights: [], themes: [], citations: [], confidence: "medium", docsUsed: 1 };
}

async function chat(messages) {
  const res = await groq.chat.completions.create({
    model: MODEL,
    messages,
    temperature: 0.1,
    max_tokens: 2000,
  });
  return res.choices[0].message.content;
}

// ── /api/research ──
export async function POST_research(req) {
  const { query, documents } = req;
  const ctx = docsContext(documents);

  const content = await chat([
    {
      role: "user",
      content: `You are a research assistant. Read these documents and answer the query.

${ctx}

Query: ${query}

Reply with ONLY this JSON (no other text, no markdown):
{"answer":"your detailed answer here","keyInsights":["insight1","insight2","insight3"],"themes":["theme1","theme2"],"citations":[{"doc":"docname","excerpt":"brief quote","relevance":"why relevant"}],"confidence":"high","docsUsed":${documents.length}}`,
    },
  ]);
  return extractJSON(content);
}

// ── /api/compare ──
export async function POST_compare(req) {
  const { docA, docB, topic } = req;

  const content = await chat([
    {
      role: "user",
      content: `Compare these two documents on the topic: ${topic}

Document A - ${docA.name}:
${truncate(docA.content, 1500)}

Document B - ${docB.name}:
${truncate(docB.content, 1500)}

Reply with ONLY this JSON (no other text, no markdown):
{"aspects":[{"label":"Aspect 1","docA":"what A says","docB":"what B says","agreement":"agree"},{"label":"Aspect 2","docA":"what A says","docB":"what B says","agreement":"disagree"},{"label":"Aspect 3","docA":"what A says","docB":"what B says","agreement":"neutral"},{"label":"Aspect 4","docA":"what A says","docB":"what B says","agreement":"disagree"}],"docAStrengths":["strength1","strength2"],"docBStrengths":["strength1","strength2"],"keyDifference":"the main difference","verdict":"overall verdict"}`,
    },
  ]);
  return extractJSON(content);
}

// ── /api/summarize ──
export async function POST_summarize(req) {
  const { document: doc, style, focus } = req;

  const styleNote = {
    executive: "Write as a concise executive brief.",
    detailed: "Write a thorough detailed analysis.",
    academic: "Write in formal academic style.",
    bullet: "Use bullet point style.",
    eli5: "Explain simply like to a 5-year-old.",
  }[style] || "";

  const content = await chat([
    {
      role: "user",
      content: `Summarize this document. ${styleNote}${focus ? ` Focus on: ${focus}.` : ""}

${truncate(doc.content, 3000)}

Reply with ONLY this JSON (no other text, no markdown):
{"tldr":"one sentence summary","keyPoints":["point1","point2","point3","point4","point5"],"themes":["theme1","theme2"],"terminology":["term1","term2","term3","term4"],"wordCount":"~${Math.round(doc.content.split(/\s+/).length / 100) * 100} words","readingTime":"${Math.max(1, Math.round(doc.content.split(/\s+/).length / 200))} min"}`,
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
      content: `You are ResearchMind, a helpful AI research assistant. Here are the user's documents:\n\n${ctx}\n\nAnswer questions about these documents. Be helpful and cite document names.`,
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
      role: "user",
      content: `Analyze these documents and extract key topics.

${ctx}

Reply with ONLY this JSON (no other text, no markdown):
{"topics":[{"name":"Topic Name","frequency":"high","docs":["doc1.txt"],"description":"brief description"},{"name":"Topic 2","frequency":"medium","docs":["doc1.txt"],"description":"brief description"},{"name":"Topic 3","frequency":"low","docs":["doc1.txt"],"description":"brief description"},{"name":"Topic 4","frequency":"medium","docs":["doc1.txt"],"description":"brief description"},{"name":"Topic 5","frequency":"high","docs":["doc1.txt"],"description":"brief description"}],"overallTheme":"the main unifying theme","suggestedQueries":["question 1?","question 2?","question 3?"]}`,
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
      role: "user",
      content: `Extract all dates, events and milestones from these documents chronologically.

${ctx}

Reply with ONLY this JSON (no other text, no markdown):
{"events":[{"date":"2024","event":"something happened","doc":"source.txt","importance":"high"},{"date":"2025","event":"another event","doc":"source.txt","importance":"medium"}],"earliestDate":"earliest date","latestDate":"latest date","summary":"overall timeline summary"}`,
    },
  ]);
  return extractJSON(content);
}