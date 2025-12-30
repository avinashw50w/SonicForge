
const express = require('express');
const router = express.Router();
const upload = require('./uploadConfig');
const ffmpegService = require('./ffmpegService');
const path = require('path');
const fs = require('fs');

// Extract audio from video
router.post('/extract', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const outputPath = await ffmpegService.extractAudio(req.file.path);
    const filename = path.basename(outputPath);
    res.json({ url: `/processed/${filename}`, filename });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Extraction failed' });
  }
});

// Process single audio file
router.post('/process-single', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    let config = {};
    if (req.body.config) {
        try {
            config = JSON.parse(req.body.config);
        } catch (e) {
            config = {};
        }
    }

    const outputPath = await ffmpegService.processAudio(req.file.path, config);
    const filename = path.basename(outputPath);
    const uploadedFilename = path.basename(req.file.path);
    
    res.json({ url: `/processed/${filename}`, filename, uploadedFilename });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Processing failed' });
  }
});

// Process multiple files (Join/Mix)
router.post('/process-multi', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length < 2) return res.status(400).json({ error: 'Upload at least 2 files' });
    
    const operation = req.body.operation || 'join'; // 'join' or 'mix'
    const filePaths = req.files.map(f => f.path);
    
    const outputPath = await ffmpegService.processMulti(filePaths, operation);
    const filename = path.basename(outputPath);
    res.json({ url: `/processed/${filename}`, filename });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Multi-process failed' });
  }
});

// Cleanup files
router.post('/cleanup', async (req, res) => {
  const { targets } = req.body; 
  if (!targets || !Array.isArray(targets)) return res.status(400).json({ error: 'Invalid targets' });

  const uploadDir = path.join(__dirname, '../uploads');
  const processedDir = path.join(__dirname, '../processed');

  targets.forEach(t => {
    let dir;
    if (t.type === 'upload') dir = uploadDir;
    else if (t.type === 'processed') dir = processedDir;
    
    if (dir && t.filename) {
        const filePath = path.join(dir, path.basename(t.filename));
        if (fs.existsSync(filePath)) {
            fs.unlink(filePath, err => {
                if (err) console.error(`Failed to delete ${filePath}`, err);
            });
        }
    }
  });
  res.json({ success: true });
});

module.exports = router;
