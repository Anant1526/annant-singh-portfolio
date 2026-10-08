/**
 * Zero-dependency Node.js server (no npm install needed)
 * Run:  node server-native.js
 * Then open http://localhost:3026
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = process.env.PORT || 3026;
const ROOT = __dirname;
const MESSAGES_FILE = path.join(ROOT, "messages.json");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function loadMessages() {
  try {
    if (fs.existsSync(MESSAGES_FILE)) return JSON.parse(fs.readFileSync(MESSAGES_FILE, "utf8"));
  } catch (_) {}
  return [];
}

function saveMessage(msg) {
  const list = loadMessages();
  const entry = { id: Date.now(), ...msg, receivedAt: new Date().toISOString() };
  list.push(entry);
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify(list, null, 2));
  return entry;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      const ct = req.headers["content-type"] || "";
      try {
        if (ct.includes("application/json")) resolve(JSON.parse(raw || "{}"));
        else if (ct.includes("application/x-www-form-urlencoded")) {
          const obj = {};
          new URLSearchParams(raw).forEach((v, k) => (obj[k] = v));
          resolve(obj);
        } else resolve({ raw });
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function send(res, status, body, type = "application/json") {
  const data = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": type,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(data);
}

function serveStatic(req, res, pathname) {
  let filePath = path.join(ROOT, pathname === "/" ? "index.html" : pathname);
  // Security: stay inside root
  if (!filePath.startsWith(ROOT)) return send(res, 403, { error: "Forbidden" });

  if (!path.extname(filePath) && !fs.existsSync(filePath)) {
    const html = filePath + ".html";
    if (fs.existsSync(html)) filePath = html;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return send(res, 404, { error: "Not found" });
  }

  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": type });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);

  // CORS preflight
  if (req.method === "OPTIONS") {
    return send(res, 204, "");
  }

  // API: contact form
  if (pathname === "/api/contact" && req.method === "POST") {
    try {
      const body = await readBody(req);
      const { name, email, message } = body;
      if (!name || !email || !message) {
        return send(res, 400, { success: false, error: "Please fill in name, email and message." });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return send(res, 400, { success: false, error: "Please enter a valid email address." });
      }
      const saved = saveMessage({ name, email, message });
      console.log("New message:", saved);
      return send(res, 200, {
        success: true,
        message: "Thanks! Your message has been received. I'll get back to you soon.",
      });
    } catch (err) {
      console.error(err);
      return send(res, 500, { success: false, error: "Something went wrong." });
    }
  }

  // API: list messages
  if (pathname === "/api/messages" && req.method === "GET") {
    return send(res, 200, loadMessages());
  }

  // Static files
  serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log(`\n  Portfolio running at http://localhost:${PORT}`);
  console.log(`  Contact API:  POST /api/contact`);
  console.log(`  Messages:     GET  /api/messages\n`);
});
