// Presign an upload to Cloudflare R2. The client POSTs {filename, contentType},
// we hand back a short-lived PUT URL the browser uploads to directly, plus the
// public URL the file will live at. Bytes never touch this function.

import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, R2_BUCKET, R2_PUBLIC_BASE_URL, r2Configured } from "../../../lib/r2";

export const runtime = "nodejs";

const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

export async function POST(request: Request): Promise<NextResponse> {
  if (!r2Configured()) {
    return NextResponse.json(
      { error: "Storage not configured — set the R2_* env vars in .env.local." },
      { status: 500 }
    );
  }

  let body: { filename?: string; contentType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const contentType = (body.contentType ?? "").toLowerCase();
  const ext = ALLOWED[contentType];
  if (!ext) {
    return NextResponse.json(
      { error: `Unsupported file type: ${contentType || "unknown"}` },
      { status: 415 }
    );
  }

  // Random key so two files with the same name don't collide.
  const key = `uploads/${crypto.randomUUID()}.${ext}`;

  try {
    const uploadUrl = await getSignedUrl(
      r2,
      new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, ContentType: contentType }),
      { expiresIn: 600 } // 10 minutes
    );
    const publicUrl = `${R2_PUBLIC_BASE_URL}/${key}`;
    return NextResponse.json({ uploadUrl, publicUrl, key, contentType });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
