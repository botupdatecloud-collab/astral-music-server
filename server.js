const express   = require('express');
const cors      = require('cors');
const { exec }  = require('child_process');
const YoutubeSearchApi = require('youtube-search-api');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ── Health check ───────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'ASTRAL MUSIC SERVER' });
});

// ── Search songs ───────────────────────────────────────────
// GET /search?q=song+name
app.get('/search', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: 'Query required' });

  try {
    const results = await YoutubeSearchApi.GetListByKeyword(q, false, 12);
    const songs   = (results.items || [])
      .filter(i => i.type === 'video' && i.length)
      .map(i => ({
        id:        i.id,
        title:     i.title,
        artist:    i.channelTitle ?? 'Unknown',
        duration:  i.length?.simpleText ?? '',
        thumbnail: i.thumbnail?.thumbnails?.slice(-1)[0]?.url ?? '',
        url:       `https://www.youtube.com/watch?v=${i.id}`,
      }));

    res.json({ songs });
  } catch (e) {
    res.status(500).json({ error: 'Search failed', detail: e.message });
  }
});

// ── Get audio stream URL ───────────────────────────────────
// GET /stream?url=https://youtu.be/xxx
app.get('/stream', (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'URL required' });

  const cmd = `yt-dlp -f bestaudio --get-url "${url}"`;

  exec(cmd, { timeout: 30000 }, (err, stdout, stderr) => {
    if (err) return res.status(500).json({ error: 'Stream failed', detail: stderr });
    const streamUrl = stdout.trim().split('\n')[0];
    res.json({ streamUrl });
  });
});

// ── Get song info ──────────────────────────────────────────
// GET /info?url=https://youtu.be/xxx
app.get('/info', (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'URL required' });

  const cmd = `yt-dlp --dump-json "${url}"`;

  exec(cmd, { timeout: 30000 }, (err, stdout) => {
    if (err) return res.status(500).json({ error: 'Info failed' });
    try {
      const data = JSON.parse(stdout);
      res.json({
        id:        data.id,
        title:     data.title,
        artist:    data.uploader,
        duration:  data.duration_string,
        thumbnail: data.thumbnail,
        url:       data.webpage_url,
      });
    } catch {
      res.status(500).json({ error: 'Parse failed' });
    }
  });
});

// ── Get download URL ───────────────────────────────────────
// GET /download?url=https://youtu.be/xxx
app.get('/download', (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'URL required' });

  const cmd = `yt-dlp -f bestaudio --get-url "${url}"`;

  exec(cmd, { timeout: 30000 }, (err, stdout) => {
    if (err) return res.status(500).json({ error: 'Download failed' });
    const downloadUrl = stdout.trim().split('\n')[0];
    res.json({ downloadUrl });
  });
});

app.listen(PORT, () => {
  console.log(`🎵 ASTRAL MUSIC SERVER running on port ${PORT}`);
});
