module.exports = {
    apps: [
        {
            name: 'kalshi-bot',
            script: 'dist/index.js',
            cwd: '/Users/burginluker/Desktop/kalshi-bot',
            env: {
                NODE_ENV: 'production',
            },
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            merge_logs: true,
            autorestart: true,
            max_restarts: 10,
            restart_delay: 5000,
        },
    ],
};
