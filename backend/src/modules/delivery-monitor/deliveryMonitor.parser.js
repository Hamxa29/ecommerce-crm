import Anthropic from '@anthropic-ai/sdk';

// ── Parse a raw group message into structured data using Claude AI ────────────
// Returns one of: delivery | remittance | follow_up | stock_update | other

export async function parseGroupMessage({ rawMessage, senderName, groupName }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[DeliveryParser] No ANTHROPIC_API_KEY — skipping AI parse');
    return { type: 'other' };
  }

  const client = new Anthropic({ apiKey });

  const prompt = `You parse WhatsApp messages from a Nigerian e-commerce delivery group.
Extract structured data and return JSON ONLY — no explanation, no markdown.

Sender: "${senderName ?? 'unknown'}"
Group: "${groupName ?? 'unknown'}"
Message: "${rawMessage}"

Rules:
- "delivered", "don", "done", order numbers, "customer collected" → type delivery
- "remit", "remittance", "i'm sending", "paying", total amount summary → type remittance
- "not picking", "not answering", "number switched off", "customer unreachable", "follow up", "call customer" → type follow_up
- "stock", "units left", "remaining", "restock", "finish", "out of stock" → type stock_update
- anything else → type other

Return exactly ONE of these shapes:

{"type":"delivery","orderNumber":"ORD-XXX or null","customerName":"string or null","amountCollected":number_or_null,"notes":"string or null"}
{"type":"remittance","totalAmount":number,"orderNumbers":["ORD-XXX"],"period":"string or null"}
{"type":"follow_up","issue":"NOT_PICKING|SWITCHED_OFF|WRONG_ADDRESS|REFUSED_DELIVERY|OTHER","customerPhone":"string or null","orderNumber":"string or null","customerName":"string or null"}
{"type":"stock_update","productName":"string","quantity":number_or_null,"note":"string or null"}
{"type":"other"}`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = response.content?.[0]?.text?.trim() ?? '';
    // Strip markdown code fences if present
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(clean);

    // Normalise issue enum
    if (parsed.type === 'follow_up' && parsed.issue) {
      parsed.issue = parsed.issue.toUpperCase();
    }

    return parsed;
  } catch (e) {
    console.error('[DeliveryParser] AI parse failed:', e.message);
    return { type: 'other' };
  }
}
