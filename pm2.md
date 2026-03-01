# PM2 Commands

```bash
# Start the bot
pm2 start ecosystem.config.js

# Watch logs live
pm2 logs kalshi-bot

# Check status
pm2 status

# Stop the bot
pm2 stop kalshi-bot

# Restart after code changes
pm2 restart kalshi-bot

# Remove from pm2 process list entirely
pm2 delete kalshi-bot
```

## Notes

- The bot survives screen lock and terminal close — only a full machine shutdown or `pm2 stop` will kill it.
- Auto-restarts on crashes (max 10 restarts, 5s delay between each).
- Logs are stored in `~/.pm2/logs/` — `kalshi-bot-out.log` for stdout, `kalshi-bot-error.log` for stderr.
