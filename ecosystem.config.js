module.exports = {
  apps: [
    {
      name: "moto-rooter",
      script: "server.js",
      cwd: "/volume1/web/moto-rooter.feralcreative.dev",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "development",
        PORT: 6686,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 6686,
      },
      // Logging
      log_file: "/volume1/web/logs/combined.log",
      out_file: "/volume1/web/logs/out.log",
      error_file: "/volume1/web/logs/error.log",
      log_date_format: "YYYY-MM-DD HH:mm Z",

      // Process management
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",

      // Advanced features
      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 4000,

      // Environment variables (add your specific ones here)
      // GOOGLE_MAPS_API_KEY will be loaded from .env file via dotenv
    },
  ],
};
