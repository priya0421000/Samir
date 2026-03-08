import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("memory.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "LUCY_CORE_STABLE", uptime: process.uptime() });
  });

  app.post("/api/memory", (req, res) => {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: "Content required" });
    
    const stmt = db.prepare("INSERT INTO memories (content) VALUES (?)");
    stmt.run(content);
    res.json({ success: true });
  });

  app.get("/api/memory", (req, res) => {
    const memories = db.prepare("SELECT * FROM memories ORDER BY timestamp DESC").all();
    res.json(memories);
  });

  app.get("/api/memory/search", (req, res) => {
    const { q } = req.query;
    const memories = db.prepare("SELECT * FROM memories WHERE content LIKE ? ORDER BY timestamp DESC").all(`%${q}%`);
    res.json(memories);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
