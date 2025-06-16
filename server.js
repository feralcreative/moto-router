// Express server with Nunjucks for env-injected HTML
require('dotenv').config();
const express = require('express');
const nunjucks = require('nunjucks');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure Nunjucks for template rendering
nunjucks.configure('template', {
  autoescape: true,
  express: app
});

// Serve static files (JS, CSS, data, images)
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/style', express.static(path.join(__dirname, 'style')));
app.use('/img', express.static(path.join(__dirname, 'img')));
app.use('/data', express.static(path.join(__dirname, 'template/data')));

// Main HTML route with env key injection
app.get('/', (req, res) => {
  res.render('index.html', {
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || ''
  });
});

// Fallback for other HTML files in template/
app.get('/:page', (req, res) => {
  res.render(req.params.page, {
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || ''
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
