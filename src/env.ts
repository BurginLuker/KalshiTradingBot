import 'dotenv/config';

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) throw new Error(`Missing required environment variable: ${name}`);
    return value;
}

export const THE_ODDS_API_KEY = requireEnv('THE_ODDS_API_KEY');
export const KALSHI_API_KEY = requireEnv('KALSHI_API_KEY');
export const ANTHROPIC_API_KEY = requireEnv('ANTHROPIC_API_KEY');
export const SUPABASE_API_KEY = requireEnv('SUPABASE_API_KEY');
export const SUPABASE_URL = requireEnv('SUPABASE_URL');
export const DISCORD_WEBHOOK = requireEnv('DISCORD_WEBHOOK');
