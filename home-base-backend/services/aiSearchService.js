const SYSTEM_PROMPT = `You turn a short, casual search phrase for a Nigerian rental listings site into structured filters.
Respond with ONLY a JSON object, no other text, matching exactly this shape:
{"type": "apartment" | "hostel" | null, "location": string | null, "maxPrice": number | null, "keywords": string[]}

Rules:
- "type" is "apartment" or "hostel" only if clearly implied, otherwise null.
- "location" is a place name (city, area, or landmark) if mentioned, otherwise null. Do not guess a location that isn't stated.
- "maxPrice" is a plain number in Naira (e.g. "300k" -> 300000, "500,000" -> 500000, "1.2m" -> 1200000), or null if no price limit is mentioned.
- "keywords" is a short list (0-4) of other meaningful descriptive words from the query (e.g. "quiet", "near campus", "furnished"), lowercase, excluding words already captured above.
- If the query is empty or meaningless, return all nulls and an empty keywords array.`;

async function parseWithClaude(query) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: query }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API returned ${response.status}`);
  }

  const data = await response.json();
  const textBlock = (data.content || []).find(b => b.type === 'text');
  if (!textBlock) throw new Error('No text in Anthropic response');

  // Strip accidental markdown fences, just in case
  const cleaned = textBlock.text.trim().replace(/^```json\s*|```$/g, '');
  const parsed = JSON.parse(cleaned);

  return {
    type: parsed.type === 'apartment' || parsed.type === 'hostel' ? parsed.type : null,
    location: typeof parsed.location === 'string' && parsed.location.trim() ? parsed.location.trim() : null,
    maxPrice: Number.isFinite(parsed.maxPrice) && parsed.maxPrice > 0 ? parsed.maxPrice : null,
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords.filter(k => typeof k === 'string').slice(0, 4) : [],
  };
}

// Used when no API key is configured, or the API call fails — a plain
// keyword/regex parser so the feature still does something useful.
function parseHeuristically(query) {
  const q = query.toLowerCase();
  let maxPrice = null;

  const priceMatch = q.match(/(?:under|below|less than|max)?\s*₦?\s*([\d,.]+)\s*(k|thousand|m|million)?/i);
  if (priceMatch && priceMatch[1]) {
    let num = parseFloat(priceMatch[1].replace(/,/g, ''));
    const unit = (priceMatch[2] || '').toLowerCase();
    if (unit === 'k' || unit === 'thousand') num *= 1000;
    if (unit === 'm' || unit === 'million') num *= 1000000;
    if (Number.isFinite(num) && num > 1000) maxPrice = Math.round(num);
  }

  let type = null;
  if (/\bapartment(s)?\b/.test(q)) type = 'apartment';
  else if (/\bhostel(s)?\b/.test(q)) type = 'hostel';

  let location = null;
  const nearMatch = q.match(/\b(?:near|in|around|at)\s+([a-z\s]{2,25})/i);
  if (nearMatch) location = nearMatch[1].trim().split(/\s+(?:under|below|less|max|with|for)\b/)[0].trim();

  return { type, location: location || null, maxPrice, keywords: [] };
}

async function parseSearchQuery(query) {
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await parseWithClaude(query);
    } catch (err) {
      console.error('AI search parse failed, falling back to heuristic:', err.message);
    }
  }
  return parseHeuristically(query);
}

module.exports = { parseSearchQuery };