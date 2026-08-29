// Netlify function entry. Imports the prebuilt server bundle
// (produced by `npm run build:server` → dist/server/production.mjs)
// and re-exports its handler. This avoids re-bundling Express on
// every cold start and keeps the function file a one-liner.

export { handler } from "../../dist/server/production.mjs";
