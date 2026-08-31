module.exports = {
  apps: [
    {
      name: "intern-board",
      script: "dist/index.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      min_uptime: "10s",
      restart_delay: 5000,
      kill_timeout: 5000,
      time: true,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
