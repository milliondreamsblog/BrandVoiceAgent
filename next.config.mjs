/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure the voice rubric + examples ship with each serverless function bundle
  // on Vercel. Every route that reads tone-agent/* at module scope must be listed
  // — @vercel/nft can't statically trace a path built from process.cwd(), so an
  // un-listed route 500s at cold start with ENOENT (passes `next build` + local
  // e2e, fails only on Vercel). Keep this in sync with the readFileSync sites in
  // lib/voiceCritic.ts (/api/critique), lib/generateRewrites.ts (/api/posts),
  // and app/api/rewrites/rehook/route.ts (/api/rewrites/rehook).
  outputFileTracingIncludes: {
    "/api/critique": ["./tone-agent/**"],
    "/api/posts": ["./tone-agent/**"],
    "/api/rewrites/rehook": ["./tone-agent/**"],
  },
};

export default nextConfig;
