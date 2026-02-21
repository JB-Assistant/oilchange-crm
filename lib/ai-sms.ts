import Anthropic from "@anthropic-ai/sdk";

export interface AIMessageContext {
  customerFirstName: string;
  shopName: string;
  shopPhone: string;
  serviceType: string;
  vehicleYear: number;
  vehicleMake: string;
  vehicleModel: string;
  dueDate: string;
  daysSinceLastService: number;
  mileageAtLastService: number | null;
  isOverdue: boolean;
  daysOverdue: number;
  tone: "friendly" | "professional" | "casual";
  sequenceNumber: number;
}

export interface AIMessageResult {
  body: string;
  fallbackUsed: boolean;
}

export interface OrgAiConfig {
  provider: string;
  model: string;
  apiKey: string;
}

const SYSTEM_PROMPT = `You are an SMS copywriter for an auto repair shop. Generate a single SMS message following these rules:

- Preferred length: under 160 characters. Hard maximum: 320 characters (2 SMS segments).
- Always end with "Reply STOP to opt out."
- Never fabricate information. Only reference data explicitly provided.
- Include the shop phone number so the customer can call to book.
- When appropriate, include "reply BOOK to schedule" as a call-to-action.
- Output ONLY the SMS text. No quotes, labels, or explanations.`;

function buildUserPrompt(ctx: AIMessageContext): string {
  const toneLabel =
    ctx.tone === "friendly"
      ? "warm and friendly"
      : ctx.tone === "casual"
        ? "casual and conversational"
        : "polite and professional";

  const urgency =
    ctx.sequenceNumber >= 3
      ? "This is a follow-up reminder. Use more urgent language and emphasize the importance of timely maintenance."
      : "This is an early reminder. Keep the tone gentle and informative.";

  const overdueNote = ctx.isOverdue
    ? `The service is ${ctx.daysOverdue} day${ctx.daysOverdue === 1 ? "" : "s"} overdue. Stress the importance of scheduling soon.`
    : "The service is not yet overdue.";

  const mileageNote =
    ctx.mileageAtLastService !== null
      ? `Mileage at last service: ${ctx.mileageAtLastService.toLocaleString()}.`
      : "";

  return [
    `Customer first name: ${ctx.customerFirstName}`,
    `Shop name: ${ctx.shopName}`,
    `Shop phone: ${ctx.shopPhone}`,
    `Service type: ${ctx.serviceType}`,
    `Vehicle: ${ctx.vehicleYear} ${ctx.vehicleMake} ${ctx.vehicleModel}`,
    `Due date: ${ctx.dueDate}`,
    `Days since last service: ${ctx.daysSinceLastService}`,
    mileageNote,
    `Reminder sequence: #${ctx.sequenceNumber}`,
    `Tone: ${toneLabel}`,
    urgency,
    overdueNote,
    "Generate the SMS now.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function generateWithAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model,
    max_tokens: 150,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });
  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock ? textBlock.text.trim() : "";
}

async function generateWithOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 150,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    console.error(`OpenAI error (${res.status}):`, errBody);
    return "";
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

async function generateWithGoogle(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: { maxOutputTokens: 150 },
    }),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    console.error(`Google AI error (${res.status}):`, errBody);
    return "";
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
}

export async function generateAIMessage(
  context: AIMessageContext,
  orgConfig?: OrgAiConfig
): Promise<AIMessageResult> {
  try {
    const userPrompt = buildUserPrompt(context);
    const provider = orgConfig?.provider ?? "anthropic";
    const apiKey = orgConfig?.apiKey ?? process.env.ANTHROPIC_API_KEY ?? "";
    const model = orgConfig?.model ?? "claude-haiku-4-5-20251001";

    if (!apiKey) {
      console.error("AI SMS: No API key available");
      return { body: "", fallbackUsed: true };
    }

    console.log(`AI SMS: Using provider=${provider}, model=${model}`);
    let body = "";

    switch (provider) {
      case "openai":
        body = await generateWithOpenAI(apiKey, model, SYSTEM_PROMPT, userPrompt);
        break;
      case "google":
        body = await generateWithGoogle(apiKey, model, SYSTEM_PROMPT, userPrompt);
        break;
      default:
        body = await generateWithAnthropic(apiKey, model, SYSTEM_PROMPT, userPrompt);
        break;
    }

    if (!body) return { body: "", fallbackUsed: true };
    return { body, fallbackUsed: false };
  } catch (error) {
    console.error("AI SMS generation error:", error);
    return { body: "", fallbackUsed: true };
  }
}

export function isAIAvailable(orgConfig?: OrgAiConfig): boolean {
  if (orgConfig?.apiKey) return true;
  return !!process.env.ANTHROPIC_API_KEY;
}
