import { put, list } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

async function readBlob(url: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
    cache: "no-store",
  });
  return res.json();
}

export async function GET() {
  try {
    const { blobs } = await list({ prefix: "bricx-drafts/" });
    const drafts = await Promise.all(
      blobs
        .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
        .map((blob) => readBlob(blob.url))
    );
    return NextResponse.json(drafts);
  } catch {
    return NextResponse.json([]);
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
  });

  return NextResponse.json({ id });
}
