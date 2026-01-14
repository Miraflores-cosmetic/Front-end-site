module.exports = {
    apps: [
      {
        name: 'cdek-proxy',
        script: 'server/cdek-proxy.mjs',
        env: {
          NODE_ENV: 'production',
          PORT: 3001
        },
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '500M',
        error_file: './logs/cdek-error.log',
        out_file: './logs/cdek-out.log'
      },
      {
        name: 'yookassa-proxy',
        script: 'server/yookassa-api.mjs',
        env: {
          NODE_ENV: 'production',
          PORT: 3002
        },
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '500M',
        error_file: './logs/yookassa-error.log',
        out_file: './logs/yookassa-out.log'
      }
    ]
  };