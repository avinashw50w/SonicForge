
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure directories exist
const uploadDir = path.join(__dirname, '../uploads');
const processedDir = path.join(__dirname, '../processed');
const tempDir = path.join(uploadDir, 'temp');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(processedDir)) fs.mkdirSync(processedDir);
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve processed files statically
app.use('/processed', express.static(processedDir));

// API Routes
app.use('/api', routes);

// --- Cleanup Task ---
const cleanupFiles = (directory, maxAgeMs) => {
  fs.readdir(directory, (err, files) => {
    if (err) return console.error(`Failed to read dir ${directory} for cleanup:`, err);
    
    const now = Date.now();
    files.forEach(file => {
      const filePath = path.join(directory, file);
      fs.stat(filePath, (err, stats) => {
        if (err) return;
        
        if (stats.isFile() && (now - stats.mtimeMs > maxAgeMs)) {
          fs.unlink(filePath, (err) => {
             if (err) console.error(`Failed to delete ${file}:`, err);
             // else console.log(`Deleted old file: ${file}`);
          });
        }
      });
    });
  });
};

// Run cleanup every 10 minutes (600,000 ms)
// Delete files older than 30 minutes (1,800,000 ms)
const CLEANUP_INTERVAL = 10 * 60 * 1000;
const MAX_FILE_AGE = 30 * 60 * 1000;

setInterval(() => {
  cleanupFiles(uploadDir, MAX_FILE_AGE);
  cleanupFiles(processedDir, MAX_FILE_AGE);
}, CLEANUP_INTERVAL);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
