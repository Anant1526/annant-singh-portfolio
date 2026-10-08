const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3026;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (HTML, CSS, JS, images)
app.use(express.static(path.join(__dirname)));

// Messages storage (simple JSON file)
const MESSAGES_FILE = path.join(__dirname, "messages.json");

function loadMessages() {
  try {
    if (fs.existsSync(MESSAGES_FILE)) {
      return JSON.parse(fs.readFileSync(MESSAGES_FILE, "utf8"));
    }
  } catch (e) {
    console.error("Error reading messages:", e.message);
  }
  return [];
}

function saveMessage(msg) {
  const messages = loadMessages();
  messages.push({
    id: Date.now(),
    ...msg,
    receivedAt: new Date().toISOString(),
  });
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2));
  return messages[messages.length - 1];
}

// Contact form API
app.post("/api/contact", (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      error: "Please fill in name, email and message.",
    });
  }

  // Basic email check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      success: false,
      error: "Please enter a valid email address.",
    });
  }

  try {
    const saved = saveMessage({ name, email, message });
    console.log("New contact message:", saved);
    res.json({
      success: true,
      message: "Thanks! Your message has been received. I'll get back to you soon.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: "Something went wrong. Please try again later.",
    });
  }
});

// Optional: view messages (for you only - protect in production)
app.get("/api/messages", (req, res) => {
  res.json(loadMessages());
});

// SPA-style fallback for clean URLs (optional)
app.get("/:page", (req, res, next) => {
  const page = req.params.page;
  const file = path.join(__dirname, page.endsWith(".html") ? page : `${page}.html`);
  if (fs.existsSync(file)) {
    return res.sendFile(file);
  }
  next();
});

app.listen(PORT, () => {
  console.log(`\n  Portfolio running at http://localhost:${PORT}`);
  console.log(`  Contact API: POST http://localhost:${PORT}/api/contact\n`);
});
