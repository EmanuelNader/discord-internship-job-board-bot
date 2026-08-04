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
      time: true,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
