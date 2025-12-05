module.exports = {
  apps: [{
    name: 'truewish-bot',
    script: './src/index.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './pm2-logs/err.log',
    out_file: './pm2-logs/out.log',
    log_file: './pm2-logs/combined.log',
    time: true,
    merge_logs: true,
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    shutdown_with_message: true,
    // Стратегия перезапуска
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000,
    // Мониторинг
    instance_var: 'INSTANCE_ID',
  }]
};
