import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { execFile } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('✅ GeGGa Insta Proxy — running');
});

// helper: try multiple scraper endpoints for post/reel URL
async function tryScrapersForUrl(url) {
  const enc = encodeURIComponent(url);
  const endpoints = [
  `https://snapinsta.app/action.php?url=${enc}`,
  `https://saveig.app/api/ajaxSearch?query=${enc}`,
  `https://igram.world/api/ig?url=${enc}`
];

  for (const ep of endpoints) {
    try {
      const r = await axios.get(ep, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 });
      const data = r.data;
      if (!data) continue;
      const candidates = [];
      function walk(o) {
        if (!o) return;
        if (typeof o === 'string') {
          if (o.match(/https?:\/\/.*\.(mp4|mov|webm|jpg|jpeg|png)(\?.*)?$/i)) candidates.push(o);
        } else if (Array.isArray(o)) o.forEach(walk);
        else if (typeof o === 'object') Object.values(o).forEach(walk);
      }
      walk(data);
      if (candidates.length) return Array.from(new Set(candidates));
    } catch (e) {
      // ignore and continue
    }
  }
  return null;
}

// endpoint: /api/download?url=...
app.get('/api/download', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'No url provided' });

  try {
    const media = await tryScrapersForUrl(url);
    if (media && media.length) {
      return res.json({ urls: media });
    }
    return res.status(502).json({ error: 'No media found from public scrapers' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// endpoint: /api/stories?username=...
// This requires optional Instaloader (python) and IG credentials in env: IG_USER & IG_PASS
app.get('/api/stories', async (req, res) => {
  const username = req.query.username;
  if (!username) return res.status(400).json({ error: 'No username provided' });

  const IG_USER = process.env.IG_USER || '';
  const IG_PASS = process.env.IG_PASS || '';

  if (!IG_USER || !IG_PASS) {
    return res.status(400).json({ error: 'Stories require IG_USER and IG_PASS environment variables (instaloader login).' });
  }

  // call instaloader via subprocess to download stories to temp and list files
  const outdir = join(__dirname, 'insta_temp');
  if (!fs.existsSync(outdir)) fs.mkdirSync(outdir, { recursive: true });

  const pyScript = `
import instaloader, sys, os
L = instaloader.Instaloader(dirname_pattern='${outdir}', download_videos=True, download_pictures=True, save_metadata=False, post_metadata_txt_pattern='')
username = '${username}'
try:
    L.login('${IG_USER}', '${IG_PASS}')
except Exception as e:
    print('LOGIN_ERROR:' + str(e))
    sys.exit(2)
try:
    profile = instaloader.Profile.from_username(L.context, username)
    stories = L.get_stories(userids=[profile.userid])
    count = 0
    for s in stories:
        for item in s.get_items():
            L.download_storyitem(item, '${outdir}')
            count += 1
    print('DONE:' + str(count))
except Exception as e:
    print('ERROR:' + str(e))
    sys.exit(3)
`;

  const scriptPath = join(outdir, `run_instaloader_${Date.now()}.py`);
  fs.writeFileSync(scriptPath, pyScript, 'utf8');

  execFile('python3', [scriptPath], { timeout: 120000 }, (err, stdout, stderr) => {
    try { fs.unlinkSync(scriptPath); } catch(e){}
    if (err) {
      return res.status(500).json({ error: 'Instaloader execution failed', details: stderr || err.message });
    }
    const out = stdout.toString();
    if (out.startsWith('LOGIN_ERROR:')) {
      return res.status(500).json({ error: 'Instagram login failed', details: out });
    }
    if (!out.startsWith('DONE:')) {
      return res.status(500).json({ error: 'Instaloader unknown response', details: out + '\n' + stderr });
    }
    const files = fs.readdirSync(outdir).filter(f => f.toLowerCase().includes(username.toLowerCase()));
    const urls = files.map(f => '/insta_temp/' + f);
    return res.json({ files: urls });
  });
});

// serve static files in insta_temp so they can be downloaded (if desired)
app.use('/insta_temp', express.static(join(__dirname, 'insta_temp')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`GeGGa proxy running on port ${PORT}`));
