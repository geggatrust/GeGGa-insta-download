GeGGa Insta Proxy (Render-ready)

What it does:
- /api/download?url=INSTAGRAM_POST_URL
  Tries multiple public scraper endpoints to extract media URLs (posts/reels).
- /api/stories?username=USERNAME
  Optional: uses Python Instaloader to download stories; requires IG_USER and IG_PASS env vars and instaloader installed.

How to deploy on Render (manual deploy without GitHub):
1. Download this ZIP and extract.
2. Create a new Web Service on Render and choose 'Manual' upload (drag & drop ZIP).
3. Set Environment:
   - Node version >= 18 is recommended.
   - (Optional for stories) Set IG_USER and IG_PASS env vars with Instagram credentials.
4. Build Command: leave default (Render will run 'npm install').
5. Start Command: 'npm start'
6. After deploy, you'll have a public URL like: https://your-service.onrender.com

Notes:
- Public scrapers may stop working occasionally. If downloads fail, check Render logs and consider adding/replacing scraper endpoints in server.js.
- Stories feature requires Python and instaloader available on the Render instance; official Render images may not include instaloader by default. If instaloader is not available, use a separate Python worker or hosted solution.
