import { NextResponse } from "next/server";
import { critiqueDraft } from "../../../lib/voiceCritic";
import { checkRateLimit } from "../../../lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const limit = checkRateLimit();
    if (!limit.allowed) {
      return NextResponse.json({ error: limit.message }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const draft = (body as { draft?: unknown }).draft;

    if (typeof draft !== "string" || !draft.trim()) {
      return NextResponse.json({ error: "Provide a non-empty draft." }, { status: 400 });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not set on the server. Add it to .env.local and restart." },
        { status: 500 },
      );
    }

    const critique = await critiqueDraft(draft);
    return NextResponse.json(critique);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Critique failed.";
    console.error("[critique]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
