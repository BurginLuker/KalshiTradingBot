# Kalshi Sports Trading Bot

An automated sports prediction market trading bot that identifies and exploits pricing inefficiencies between the [Kalshi](https://kalshi.com) prediction market and real-money sportsbooks.

## How It Works

The bot runs a continuous two-phase loop:

### 1. Event Discovery
Fetches upcoming sports events from both the Kalshi API and The Odds API, then fuzzy-matches them across the two data sources and persists the mappings to Supabase. Discovery runs every 6 hours automatically (or on-demand via `npm run discover`).

### 2. Trading Loop
Every 20 minutes, the bot:
1. Checks the current account balance and open positions
2. Loads upcoming matched events from Supabase (3-day rolling window)
3. For each event, fetches live Kalshi market prices and live sportsbook odds in parallel
4. Computes a **fair probability** for each outcome by aggregating and de-vigging odds across multiple bookmakers
5. Compares the fair probability against Kalshi's ask price to find **edges** (minimum 3.5% edge threshold)
6. Sizes positions using a **fractional Kelly criterion** (1/3 Kelly) and places orders on Kalshi
7. Sends a trade notification to Discord with full order details and odds freshness

## Architecture

```
src/
├── agents/
│   ├── TradingBot.ts          # Core trading loop — analyze and execute
│   ├── EventDiscovery.ts      # Match events across Kalshi and The Odds API
│   └── PositionMonitorBot.ts  # Snapshots positions post-trade for trend monitoring
├── clients/
│   ├── KalshiConfiguration.ts # Kalshi API auth/config
│   └── SupabaseClient.ts      # Supabase client singleton
├── services/
│   ├── EventAnalysis.ts       # Edge detection — fair prob vs Kalshi price
│   ├── KalshiAccount.ts       # Account balance, positions, order placement
│   ├── KalshiSportsEvents.ts  # Kalshi sports market data
│   ├── TheOddsAPI.ts          # Sportsbook odds fetching
│   ├── AuditLogger.ts         # Full run/order audit trail in Supabase
│   └── DiscordNotifier.ts     # Trade and alert notifications via Discord webhook
└── utils/
    ├── EventMatcher.ts        # Fuzzy matching between Kalshi and Odds API events
    ├── oddsUtils.ts           # Fair probability aggregation, edge calculation
    ├── positions.ts           # Kelly criterion sizing
    └── sportConfig.ts         # Sport key mappings
```

## Supported Sports

- Men's Pro Basketball (NBA)
- Men's College Basketball
- Women's College Basketball

## Prerequisites

- Node.js 18+
- A [Kalshi](https://kalshi.com) account with API access
- [The Odds API](https://the-odds-api.com) key
- [Anthropic](https://anthropic.com) API key
- [Supabase](https://supabase.com) project (for event caching and audit logging)
- A Discord webhook URL (for trade notifications)

## Setup

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the project root:
   ```env
   THE_ODDS_API_KEY=your_odds_api_key
   KALSHI_API_KEY=your_kalshi_api_key
   ANTHROPIC_API_KEY=your_anthropic_api_key
   SUPABASE_API_KEY=your_supabase_api_key
   SUPABASE_URL=your_supabase_url
   DISCORD_WEBHOOK=your_discord_webhook_url
   ```

3. Build the project:
   ```bash
   npm run build
   ```

## Usage

| Command | Description |
|---|---|
| `npm run discover` | Run event discovery only — matches and caches upcoming events |
| `npm run trade` | Run the full trading loop (discovery + trading every 20 min) |
| `npm run dry-run` | Run without placing any orders — logs what would be traded |
| `npm run dev` | Run via ts-node (no build required, development only) |
| `npm run get-positions` | Print current open positions to the console |

## Strategy

### Fair Value Estimation
Sportsbook odds are collected from multiple bookmakers and converted from American odds to implied probabilities. The vig (bookmaker margin) is removed by normalizing the probabilities, then they are averaged across bookmakers to produce a fair probability estimate.

### Edge Detection
An edge exists when Kalshi's ask price for a YES contract is meaningfully below the fair probability. Only edges exceeding the minimum threshold (3.5%) are traded.

```
Edge = Fair Probability − Kalshi Ask Price
```

### Position Sizing
Positions are sized using 1/3 Kelly criterion to manage variance:

```
Full Kelly  = (Fair Probability − Ask Price) / (1 − Ask Price)
Bet Size    = (1/3 × Full Kelly) × Bankroll
```

## Dry Run Mode

Set `DRY_RUN=true` (or use `npm run dry-run`) to run the full analysis pipeline without placing any real orders. All edge opportunities will be logged as if they were executed.

## Disclaimer

This is an experimental automated trading bot. Prediction market trading involves financial risk. Past performance is not indicative of future results. Use at your own risk.
