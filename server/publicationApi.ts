import type { Express } from "express";
import { getPublicationFeed } from "./db";

const destinationCodes = new Set(["visit_libya", "libya_atlas"]);

/**
 * Public, read-only publication contract for approved data.
 * A destination returns no records until an administrator marks it ready.
 */
export function registerPublicationApi(app: Express) {
  app.get("/api/publication/v1/:destination", async (req, res) => {
    const destination = req.params.destination;
    if (!destinationCodes.has(destination)) {
      res.status(404).json({ version: "v1", ready: false, records: [], message: "وجهة النشر غير معرفة." });
      return;
    }
    try {
      const feed = await getPublicationFeed(destination as "visit_libya" | "libya_atlas");
      res.setHeader("Cache-Control", "public, max-age=300");
      res.json(feed);
    } catch {
      res.status(500).json({ version: "v1", ready: false, records: [], message: "تعذر تجهيز حزمة البيانات." });
    }
  });
}
