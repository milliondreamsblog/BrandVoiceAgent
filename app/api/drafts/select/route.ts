import { put, list } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

const TOKEN = (process.env.BLOB_READ_WRITE_TOKEN ?? "").replace(/^﻿/, "");

export async function POST(req: NextRequest) {
  const { id, selected } = await req.json();

  const { blobs } = await list({ prefix: `bricx-drafts/${id}.json`, token: TOKEN });
  if (!blobs.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const res = await fetch(blobs[0].url, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    cache: "no-store",
  });
  const draft = await res.json();

  const updated = {
    ...draft,
    selected,
    status: "approved",
    selected_at: new Date().toISOString(),
  };

  await put(`bricx-drafts/${id}.json`, JSON.stringify(updated), {
    access: "private",
    addRandomSuffix: false,
    contentType: "application/json",
    token: TOKEN,
  });

  return NextResponse.json({ ok: true });
}
