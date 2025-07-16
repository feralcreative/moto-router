// Express server with Nunjucks for env-injected HTML
require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const nunjucks = require("nunjucks");

const app = express();
const PORT = process.env.PORT || 3000;

// Configure Nunjucks for rendering from project root
const nunjucksEnv = nunjucks.configure(__dirname, {
  autoescape: true,
  express: app,
  noCache: true // Disable template caching for development
});

// Force Nunjucks to recognize .html files as templates
app.engine('html', nunjucksEnv.render.bind(nunjucksEnv));
app.set('view engine', 'html');

// Serve static files (JS, CSS, data, images)
app.use("/js", express.static(path.join(__dirname, "js")));
app.use("/css", express.static(path.join(__dirname, "style")));
app.use("/img", express.static(path.join(__dirname, "img")));
app.use("/data", express.static(path.join(__dirname, "demo/data")));
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/favicon.ico", express.static(path.join(__dirname, "favicon.ico")));
// Specific test route to debug Nunjucks variable processing
app.get("/test", (req, res) => {
  console.log("Rendering test template");
  console.log(`API key being injected: ${process.env.GOOGLE_MAPS_API_KEY}`);
  
  res.render("test-template.html", {
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || ""
  }, (err, html) => {
    if (err) {
      console.error("Error rendering test template:", err);
      return res.status(500).send("Template rendering error");
    }
    console.log("Test template rendered successfully");
    console.log("Rendered HTML contains API key:", html.includes(process.env.GOOGLE_MAPS_API_KEY));
    res.send(html);
  });
});

// Dynamic route for// Handle HTML files with direct file reading and string replacement
app.get("/*", (req, res, next) => {
  // Check if it's an HTML request and not a static file
  if (req.path.endsWith(".html")) {
    const template = req.path.startsWith("/") ? req.path.slice(1) : req.path;
    console.log(`Handling HTML request for ${template}`);
    
    // Read the file directly
    const filePath = path.join(__dirname, template);
    console.log(`Reading file from: ${filePath}`);
    
    fs.readFile(filePath, "utf8", (err, content) => {
      if (err) {
        console.error(`Error reading template ${template}:`, err);
        return next(err);
      }
      
      const apiKey = process.env.GOOGLE_MAPS_API_KEY || "";
      console.log(`API key being injected: ${apiKey}`);
      console.log(`API key length: ${apiKey.length}`);
      
      // Debug original content
      console.log('Original content contains placeholder:', content.includes('{{ GOOGLE_MAPS_API_KEY }}'));
      console.log('Original content contains window.GOOGLE_MAPS_API_KEY:', content.includes('window.GOOGLE_MAPS_API_KEY'));
      
      // Create a completely new script tag with the API key hardcoded
      const apiKeyScript = `<script>window.GOOGLE_MAPS_API_KEY = "${apiKey}";</script>`;
      
      // Insert this script tag at the beginning of the head section
      let processedContent = content.replace('<head>', `<head>\n  ${apiKeyScript}`);
      
      // Also replace any existing placeholders
      processedContent = processedContent.replace(/\{\{\s*GOOGLE_MAPS_API_KEY\s*\}\}/g, apiKey);
      processedContent = processedContent.replace(/window\.GOOGLE_MAPS_API_KEY\s*=\s*['"](.*?)['"];?/g, `window.GOOGLE_MAPS_API_KEY = "${apiKey}";`);
      
      console.log(`Template ${template} processed successfully`);
      console.log(`Processed content contains API key:`, processedContent.includes(apiKey));
      console.log(`Processed content still contains placeholder:`, processedContent.includes('{{ GOOGLE_MAPS_API_KEY }}'));
      
      // Debug: Check what's in the script tag that loads Google Maps
      const scriptTagRegex = /<script[^>]*maps\.googleapis\.com[^>]*>[^<]*<\/script>/;
      const scriptTag = processedContent.match(scriptTagRegex);
      if (scriptTag) {
        console.log('Google Maps script tag:', scriptTag[0]);
      } else {
        const dynamicScriptRegex = /loadGoogleMapsAPI/;
        const dynamicScript = processedContent.match(dynamicScriptRegex);
        if (dynamicScript) {
          console.log('Dynamic Google Maps script loading function found');
        } else {
          console.log('No Google Maps script loading mechanism found');
        }
      }
      
      // Add a debug script that will log the API key to console
      const debugScript = `<script>console.log('DEBUG - API Key in window:', window.GOOGLE_MAPS_API_KEY);</script>`;
      processedContent = processedContent.replace('</body>', `${debugScript}\n</body>`);
      
      // Set content type to HTML
      res.setHeader('Content-Type', 'text/html');
      res.send(processedContent);
    });
  } else {
    next();
  }
});

// Serve the project root as the web root for full portability
// Static files fallback (must come after dynamic HTML routes)
app.use(express.static(__dirname));
// Removed custom static middleware for /demo and /img

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
