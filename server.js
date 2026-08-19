/**
 * Custom entry point for hosting this Next.js app under cPanel's "Setup
 * Node.js App" (Phusion Passenger). Passenger expects a plain Node HTTP
 * server it can boot directly — `next start` (a CLI command) doesn't work
 * as an app-root entry file, so this wraps Next's programmatic API instead.
 *
 * Set this file as the "Application startup file" in cPanel's Node.js App
 * screen. Passenger sets process.env.PORT itself; next() reads NODE_ENV.
 */
const { createServer } = require("http");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(process.env.PORT || 3000, () => {
    console.log(`Ready on port ${process.env.PORT || 3000} (NODE_ENV=${process.env.NODE_ENV})`);
  });
});
