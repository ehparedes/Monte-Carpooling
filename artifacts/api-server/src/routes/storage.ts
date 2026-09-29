import express, { Router, type IRouter, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { RequestUploadUrlBody, RequestUploadUrlResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const UPLOAD_ROOT = process.env.UPLOAD_DIR || "/var/www/monte-uploads";
const UPLOADS_DIR = path.join(UPLOAD_ROOT, "uploads");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const MAX_BYTES = 5 * 1024 * 1024;
const TICKET_TTL_MS = 10 * 60 * 1000;
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

type Ticket = { userId: string; expires: number };
const tickets = new Map<string, Ticket>();

function pruneTickets() {
  const now = Date.now();
  for (const [id, t] of tickets) if (t.expires < now) tickets.delete(id);
}

function detectImage(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (buf.toString("ascii", 0, 4) === "GIF8") return "gif";
  return null;
}

function getOrigin(req: Request): string {
  const proto = (req.headers["x-forwarded-proto"] as string) || "https";
  const host = (req.headers["x-forwarded-host"] as string) || req.headers.host || "localhost";
  return `${proto}://${host}`;
}

router.post("/storage/uploads/request-url", (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  const { name, size, contentType } = parsed.data;
  if (!Object.values(TYPES).includes(contentType)) {
    res.status(415).json({ error: "Formato no soportado. Usá JPG, PNG o WebP." });
    return;
  }
  if (size > MAX_BYTES) {
    res.status(413).json({ error: "La imagen no puede superar 5MB" });
    return;
  }

  pruneTickets();
  const id = randomUUID();
  tickets.set(id, { userId: req.user.id, expires: Date.now() + TICKET_TTL_MS });

  res.json(
    RequestUploadUrlResponse.parse({
      uploadURL: `${getOrigin(req)}/api/storage/uploads/${id}`,
      objectPath: `/objects/uploads/${id}`,
      metadata: { name, size, contentType },
    }),
  );
});

router.put(
  "/storage/uploads/:id",
  express.raw({ type: () => true, limit: MAX_BYTES }),
  (req: Request, res: Response) => {
    const id = String(req.params.id);
    const ticket = tickets.get(id);

    if (!ID_RE.test(id) || !ticket || ticket.expires < Date.now()) {
      res.status(403).json({ error: "El permiso de subida venció. Probá de nuevo." });
      return;
    }
    if (!req.isAuthenticated() || req.user.id !== ticket.userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const buf = req.body as Buffer;
    if (!Buffer.isBuffer(buf) || buf.length === 0) {
      res.status(400).json({ error: "Archivo vacío" });
      return;
    }

    const ext = detectImage(buf);
    if (!ext) {
      res.status(415).json({ error: "El archivo no es una imagen válida" });
      return;
    }

    fs.writeFileSync(path.join(UPLOADS_DIR, `${id}.${ext}`), buf);
    tickets.delete(id);
    res.status(200).json({ ok: true });
  },
);

router.get("/storage/objects/uploads/:file", (req: Request, res: Response) => {
  const id = String(req.params.file);
  if (!ID_RE.test(id)) {
    res.status(404).json({ error: "Object not found" });
    return;
  }

  for (const [ext, mime] of Object.entries(TYPES)) {
    const filePath = path.join(UPLOADS_DIR, `${id}.${ext}`);
    if (fs.existsSync(filePath)) {
      res.type(mime);
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.sendFile(filePath);
      return;
    }
  }

  res.status(404).json({ error: "Object not found" });
});

export default router;
