// Cloudflare R2 client (S3-compatible). The browser uploads bytes straight to R2
// via a short-lived presigned PUT URL, so big image/video files never pass through
// the serverless function. Public reads come from the bucket's public base URL.

import { S3Client } from "@aws-sdk/client-s3";

// PowerShell-pasted env vars sometimes carry a leading BOM — strip it everywhere.
function clean(v: string | undefined): string {
  return (v ?? "").replace(/^﻿/, "").trim();
}

const accountId = clean(process.env.R2_ACCOUNT_ID);
const accessKeyId = clean(process.env.R2_ACCESS_KEY_ID);
const secretAccessKey = clean(process.env.R2_SECRET_ACCESS_KEY);

export const R2_BUCKET = clean(process.env.R2_BUCKET);
// e.g. https://pub-xxxx.r2.dev  (or a custom domain). Trailing slash trimmed.
export const R2_PUBLIC_BASE_URL = clean(process.env.R2_PUBLIC_BASE_URL).replace(/\/+$/, "");

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

export function r2Configured(): boolean {
  return Boolean(accountId && accessKeyId && secretAccessKey && R2_BUCKET && R2_PUBLIC_BASE_URL);
}
