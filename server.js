// Express server with Nunjucks for env-injected HTML
require("dotenv").config();
const express = require("express");
const nunjucks = require("nunjucks");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Configure Nunjucks for demo rendering
nunjucks.configure("demo", {
  autoescape: true,
  express: app,
  noCache: true, // Disable template caching for development
});

// Serve static files (JS, CSS, data, images)
app.use("/js", express.static(path.join(__dirname, "js")));
app.use("/css", express.static(path.join(__dirname, "style")));
app.use("/img", express.static(path.join(__dirname, "img")));
app.use("/data", express.static(path.join(__dirname, "demo/data")));
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/favicon.ico", express.static(path.join(__dirname, "favicon.ico")));

// Main HTML route with env key injection
app.get("/", (req, res) => {
  res.render("index.html", {
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || "",
  });
}); // now serves demo/index.html

// Fallback for other HTML files in demo/
app.get("/:page", (req, res) => {
  res.render(req.params.page, {
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || "",
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
