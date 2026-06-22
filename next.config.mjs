/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure the voice rubric + examples ship with the serverless function bundle on Vercel.
  outputFileTracingIncludes: {
    "/api/critique": ["./tone-agent/**"],
  },
};

export default nextConfig;
