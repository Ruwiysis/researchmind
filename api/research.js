import { POST_research } from "../api/index.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const data = await POST_research(req.body);
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Research failed" });
  }
}
