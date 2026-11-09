const fs = require("fs");
const path = require("path");
const { parse } = require("dotenv");

const fileEnv = parse(fs.readFileSync(path.join(__dirname, ".env")));
const port = "3004";
const hostname = process.env.HOSTNAME || fileEnv.HOSTNAME || "0.0.0.0";
const instances = Number(process.env.PM2_INSTANCES || fileEnv.PM2_INSTANCES || 1);
const workers = Number.isInteger(instances) && instances > 0 ? instances : 1;
const maxMemory = process.env.PM2_MAX_MEMORY || fileEnv.PM2_MAX_MEMORY || "1G";

module.exports = {
  apps: [
    {
      name: "prolodki",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: `start --port ${port} --hostname ${hostname}`,
      interpreter: "node",
      instances: workers,
      exec_mode: workers > 1 ? "cluster" : "fork",
      autorestart: true,
      max_memory_restart: maxMemory,
      exp_backoff_restart_delay: 100,
      kill_timeout: 10000,
      env: {
        ...fileEnv,
        NODE_ENV: "production",
        PORT: port,
        HOSTNAME: hostname,
      },
    },
  ],
};
