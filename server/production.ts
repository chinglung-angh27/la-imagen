// Netlify Functions entry. Re-exports the serverless-http-wrapped
// Express handler produced in server/index.ts. Built into
// dist/server/production.mjs by vite.config.server.ts; the
// netlify/functions/api.js file imports from that bundle.
export { handler } from "./index";
