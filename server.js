import express from "express";
import cors from "cors";
import instagramGetUrl from "instagram-url-direct";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("✅ GeGGa Insta Downloader is running!");
});

// 🟢 تحميل ريلز / بوست / فيديو إنستغرام
app.get("/api/download", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "No url provided" });

  try {
    const result = await instagramGetUrl(url);
    if (result?.url_list?.length) {
      res.json({ urls: result.url_list });
    } else {
      res.status(404).json({ error: "No media found" });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch media", details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));