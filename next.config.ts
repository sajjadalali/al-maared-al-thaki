import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Everything the browser loads comes from this site: the chat calls /api/chat,
// the font is self-hosted by next/font, and car photos are in /public. WhatsApp
// and phone are plain links, which a CSP does not restrict.
//
// No nonces: a nonce forces every page to render per request, and the pages
// here are prerendered and cached. So inline scripts stay allowed, which is
// the setup the Next.js CSP guide gives for apps without nonces.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  // Two years, this host and any subdomain. No "preload": that is a separate
  // submission to the browsers' list and hard to undo.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // For older browsers; frame-ancestors above does the same in current ones.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
