import { put, head, del } from "@vercel/blob";

const BLOB_PATH = "loa-plans.json";

async function readPlans() {
  try {
    const meta = await head(BLOB_PATH, { token: process.env.BLOB_READ_WRITE_TOKEN }).catch(() => null);
    if (!meta) return [];
    const res = await fetch(meta.downloadUrl, {
      headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('readPlans error:', err.message);
    return [];
  }
}

async function writePlans(plans) {
  try { await del(BLOB_PATH, { token: process.env.BLOB_READ_WRITE_TOKEN }); } catch {}
  await put(BLOB_PATH, JSON.stringify(plans), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(await readPlans());
  }

  if (req.method === "POST") {
    try {
      const plan = req.body;
      if (!plan || !plan.id) return res.status(400).json({ error: "Missing id" });
      const plans = await readPlans();
      await writePlans([plan, ...plans.filter(p => p.id !== plan.id)]);
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Missing id" });
    await writePlans((await readPlans()).filter(p => p.id !== id));
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
