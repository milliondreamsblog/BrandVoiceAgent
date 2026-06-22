import { put, list } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

const TOKEN = (process.env.BLOB_READ_WRITE_TOKEN ?? "").replace(/^﻿/, "");

async function readBlob(url: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    cache: "no-store",
  });
  return res.json();
}

export async function GET() {
  try {
    const { blobs } = await list({ prefix: "bricx-drafts/", token: TOKEN });
    const settled = await Promise.allSettled(
      blobs
        .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
        .map((blob) => readBlob(blob.url))
    );
    const drafts = settled
      .filter((r): r is PromiseFulfilledResult<unknown> => r.status === "fulfilled")
      .map((r) => r.value);
    return NextResponse.json(drafts);
  } catch (e) {
    console.error("GET /api/drafts failed:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = Date.now().toString();

  const draft = {
    id,
    status: "pending",
    source: body.source ?? "critic",
    original: body.original,
    versions: body.versions,
    selected: null,
    selected_at: null,
    created_at: new Date().toISOString(),
  };

  await put(`bricx-drafts/${id}.json`, JSON.stringify(draft), {
    access: "private",
    addRandomSuffix: false,
    contentType: "application/json",
    token: TOKEN,
  });

  return NextResponse.json({ id });
}
