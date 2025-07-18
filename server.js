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
  noCache: true, // Disable template caching for development
});

// Force Nunjucks to recognize .html files as templates
app.engine("html", nunjucksEnv.render.bind(nunjucksEnv));
app.set("view engine", "html");

// Serve static files (JS, CSS, data, images)
app.use("/js", express.static(path.join(__dirname, "js")));
app.use("/style", express.static(path.join(__dirname, "style")));
// Serve /img from root for main crater lake image and all universal assets
app.use("/img", express.static(path.join(__dirname, "img")));
// Serve the entire project root statically for true portability
app.use(express.static(__dirname));
app.use("/favicon.ico", express.static(path.join(__dirname, "favicon.ico")));

// Dynamic route for handling HTML files with direct file reading and string replacement
app.get("/*", (req, res, next) => {
  // Ignore Chrome DevTools requests
  if (req.path.includes(".well-known/appspecific/com.chrome.devtools")) {
    return next();
  }

  // Only handle .html files or directory requests
  if (req.path.endsWith(".html") || req.path.endsWith("/") || (!req.path.includes(".") && req.path !== "/")) {
    let template = req.path.startsWith("/") ? req.path.slice(1) : req.path;

    // Handle directory requests by appending index.html
    if (req.path.endsWith("/") || !req.path.includes(".")) {
      template = template.endsWith("/") ? `${template}index.html` : `${template}/index.html`;
    }

    const filePath = path.join(__dirname, template);
    fs.readFile(filePath, "utf8", (err, content) => {
      if (err) {
        console.error(`Error reading template ${template}:`, err);
        return next(err);
      }
      const apiKey = process.env.GOOGLE_MAPS_API_KEY || "";
      const apiKeyScript = `<script>window.GOOGLE_MAPS_API_KEY = "${apiKey}";</script>`;
      let processedContent = content.replace("<head>", `<head>\n  ${apiKeyScript}`);
      processedContent = processedContent.replace(/\{\{\s*GOOGLE_MAPS_API_KEY\s*\}\}/g, apiKey);
      processedContent = processedContent.replace(
        /window\\.GOOGLE_MAPS_API_KEY\\s*=\\s*['\"](.*?)['\"];?/g,
        `window.GOOGLE_MAPS_API_KEY = "${apiKey}";`
      );
      res.setHeader("Content-Type", "text/html");
      res.send(processedContent);
    });
  } else {
    next();
  }
});
// Test route for Nunjucks template rendering
app.get("/test", (req, res) => {
  res.render(
    "test-template.html",
    {
      GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || "",
    },
    (err, html) => {
      if (err) {
        console.error("Error rendering test template:", err);
        return res.status(500).send("Template rendering error");
      }
      res.send(html);
    }
  );
});

// Dynamic route for handling HTML files with direct file reading and string replacement
app.get("/*", (req, res, next) => {
  // Ignore Chrome DevTools requests
  if (req.path.includes(".well-known/appspecific/com.chrome.devtools")) {
    return next();
  }

  // Check if it's an HTML request or a directory request
  if (req.path.endsWith(".html") || req.path.endsWith("/") || req.path.split("/").pop() === req.path.split("/").pop()) {
    let template = req.path.startsWith("/") ? req.path.slice(1) : req.path;

    // Handle directory requests by appending index.html
    if (req.path.endsWith("/") || !req.path.includes(".")) {
      // If path ends with / or doesn't contain a file extension, assume it's a directory
      // and append index.html
      template = template.endsWith("/") ? `${template}index.html` : `${template}/index.html`;
    }

    // Read the file directly
    const filePath = path.join(__dirname, template);

    fs.readFile(filePath, "utf8", (err, content) => {
      if (err) {
        console.error(`Error reading template ${template}:`, err);
        return next(err);
      }

      const apiKey = process.env.GOOGLE_MAPS_API_KEY || "";

      // Create a completely new script tag with the API key hardcoded
      const apiKeyScript = `<script>window.GOOGLE_MAPS_API_KEY = "${apiKey}";</script>`;

      // Insert this script tag at the beginning of the head section
      let processedContent = content.replace("<head>", `<head>\n  ${apiKeyScript}`);

      // Also replace any existing placeholders
      processedContent = processedContent.replace(/\{\{\s*GOOGLE_MAPS_API_KEY\s*\}\}/g, apiKey);
      processedContent = processedContent.replace(
        /window\.GOOGLE_MAPS_API_KEY\s*=\s*['"](.*?)['"];?/g,
        `window.GOOGLE_MAPS_API_KEY = "${apiKey}";`
      );

      // Set content type to HTML
      res.setHeader("Content-Type", "text/html");
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
