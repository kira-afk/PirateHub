

const fs = require('fs');
const path = require('path');

// CONFIG: JSON file containing all your Google Drive links
const DRIVE_JSON_FILE = path.join(__dirname, 'drive_videos.txt');
if (!fs.existsSync(DRIVE_JSON_FILE)) {
  console.error('❌ drive_videos.json not found. Create it with an array of Drive URLs.');
  process.exit(1);
}
const driveVideos = JSON.parse(fs.readFileSync(DRIVE_JSON_FILE, 'utf-8'));

// PUBLIC DIR where data.json will be written
const PUBLIC_DIR = path.join(__dirname, 'public');
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR);
const DATA_FILE = path.join(PUBLIC_DIR, 'data.json');

// helper to extract fileId from a Google Drive link
function extractFileId(url) {
  const match = url.match(/[-\w]{25,}/); // simple regex to catch fileId
  return match ? match[0] : null;
}

// build lectures array
const lectures = driveVideos.map((url, index) => {
  const fileId = extractFileId(url);
  if (!fileId) {
    console.warn('Invalid URL skipped:', url);
    return null;
  }
  return {
    id: Buffer.from(fileId).toString('base64').slice(0, 12),
    title: `Lecture ${index + 1}`, // default titles, can customize
    path: `https://drive.google.com/uc?export=download&id=${fileId}`,
    size: 0, // size not available for Drive videos
    mtime: Date.now(),
    mime: 'video/mp4'
  };
}).filter(l => l !== null);

// write data.json
const data = {
  updated: Date.now(),
  lectures
};
fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
console.log('✅ data.json generated with', lectures.length, 'lectures at', DATA_FILE);