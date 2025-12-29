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
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(processedDir)) fs.mkdirSync(processedDir);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve processed files statically
app.use('/processed', express.static(processedDir));

// API Routes
app.use('/api', routes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});