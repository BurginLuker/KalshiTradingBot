import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { jsonToToon } from '@jojojoseph/toon-json-converter';
import ClaudeClient from '../clients/ClaudeClient';
import SupabaseClient from '../clients/SupabaseClient';
import Logger from './Logger';
import type { KalshiEvent, OddsEventSummary, EventPair, MatchResult } from '../types';

const MODEL = 'claude-haiku-4-5';
const MAX_TOKENS = 4096;
const DATE_WINDOW_MS = 24 * 60 * 60 * 1000;

const TICKER_DATE_REGEX = /^(\d{2})([A-Z]{3})(\d{2})/;

const MONTH_MAP: Record<string, number> = {
    JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
    JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
};

const MATCH_SCHEMA = z.object({
    matches: z.array(z.object({
        id: z.string(),
        event_ticker: z.string(),
    }))
});

const SYSTEM_PROMPT = `You are a sports event matching engine.

You receive two lists:
1. Kalshi prediction market events (with event_ticker and title)
2. Odds API sporting events (with id, home_team, away_team, and commence_time)

Your job is to match each Kalshi event to its corresponding Odds API event based on team names and game dates.

Rules:
- Accuracy is imperative — an incorrect match will cause financial loss.
- Only return matches you are highly confident about.
- If a Kalshi event has no clear match in the Odds API list, omit it entirely.
- Match based on team names appearing in the Kalshi title and the Odds API home_team/away_team fields.
- The Kalshi title format is typically "Away Team at Home Team".`;


function parseTickerDate(ticker: string): Date | null {
    const lastSegment = ticker.split('-').pop() ?? '';
    const match = lastSegment.match(TICKER_DATE_REGEX);
    if (!match) return null;

    const year = 2000 + parseInt(match[1], 10);
    const month = MONTH_MAP[match[2]];
    const day = parseInt(match[3], 10);

    if (month === undefined) return null;

    return new Date(Date.UTC(year, month, day));
}

function getCommenceDate(commenceTime: string): Date {
    const iso = new Date(commenceTime);
    return new Date(Date.UTC(iso.getUTCFullYear(), iso.getUTCMonth(), iso.getUTCDate()));
}

function isWithinDateWindow(tickerDate: Date, commenceDate: Date): boolean {
    const diff = Math.abs(tickerDate.getTime() - commenceDate.getTime());
    return diff <= DATE_WINDOW_MS;
}

function filterKalshiByDate(kalshiEvents: KalshiEvent[], oddsEvents: OddsEventSummary[]): KalshiEvent[] {
    const commenceDates = oddsEvents.map(e => getCommenceDate(e.commence_time));

    return kalshiEvents.filter(kalshiEvent => {
        const tickerDate = parseTickerDate(kalshiEvent.event_ticker);
        if (!tickerDate) {
            Logger.log(`Filtered out — unparseable ticker date: ${kalshiEvent.event_ticker}`);
            return false;
        }

        const withinWindow = commenceDates.some(cd => isWithinDateWindow(tickerDate, cd));
        if (!withinWindow) Logger.log(`Filtered out — no matching date: "${kalshiEvent.title}" (${kalshiEvent.event_ticker})`);
        return withinWindow;
    });
}

function buildPrompt(kalshiEvents: KalshiEvent[], oddsEvents: OddsEventSummary[]): string {
    const kalshiData = kalshiEvents.map(e => ({
        event_ticker: e.event_ticker,
        title: e.title,
    }));

    const oddsData = oddsEvents.map(e => ({
        id: e.id,
        home_team: e.home_team,
        away_team: e.away_team,
        commence_time: e.commence_time,
    }));

    const kalshiToon = jsonToToon(kalshiData);
    const oddsToon = jsonToToon(oddsData);

    return `## Kalshi Events\n${kalshiToon}\n\n## Odds API Events\n${oddsToon}`;
}

async function callHaiku(prompt: string): Promise<z.infer<typeof MATCH_SCHEMA>['matches']> {
    const response = await ClaudeClient.messages.parse({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
        output_config: { format: zodOutputFormat(MATCH_SCHEMA) },
    });

    const { input_tokens, output_tokens } = response.usage;
    Logger.log(`Haiku usage — input: ${input_tokens}, output: ${output_tokens}, total: ${input_tokens + output_tokens}`);

    return response.parsed_output!.matches;
}

function buildMatchResult(
    matches: { id: string; event_ticker: string }[],
    kalshiEvents: KalshiEvent[],
    oddsEvents: OddsEventSummary[],
): MatchResult {
    const kalshiMap = new Map<string, KalshiEvent>();
    for (const e of kalshiEvents) kalshiMap.set(e.event_ticker, e);

    const oddsMap = new Map<string, OddsEventSummary>();
    for (const e of oddsEvents) oddsMap.set(e.id, e);

    const matched: EventPair[] = [];
    const matchedKalshiTickers = new Set<string>();
    const matchedOddsIds = new Set<string>();

    for (const { id, event_ticker } of matches) {
        const kalshiEvent = kalshiMap.get(event_ticker);
        const oddsEvent = oddsMap.get(id);

        if (!kalshiEvent || !oddsEvent) {
            Logger.log(`Skipping invalid match — ticker: ${event_ticker}, odds id: ${id}`);
            continue;
        }

        matched.push({ kalshiEvent, oddsEvent });
        matchedKalshiTickers.add(event_ticker);
        matchedOddsIds.add(id);
    }

    const unmatched = kalshiEvents.filter(e => !matchedKalshiTickers.has(e.event_ticker));
    for (const e of unmatched) {
        Logger.log(`Unmatched Kalshi event — "${e.title}" (ticker: ${e.event_ticker})`);
    }

    const unmatchedOdds = oddsEvents.filter(e => !matchedOddsIds.has(e.id));
    for (const e of unmatchedOdds) {
        Logger.log(`Unmatched Odds API event — "${e.away_team} at ${e.home_team}" (id: ${e.id})`);
    }

    return { matched, unmatched };
}

const EVENT_MATCHES_TABLE = 'event_matches';

async function getCachedMatches(
    kalshiTickers: string[],
    oddsIds: string[],
): Promise<{ kalshi_event_ticker: string; odds_event_id: string }[]> {
    const { data } = await SupabaseClient
        .from(EVENT_MATCHES_TABLE)
        .select('kalshi_event_ticker, odds_event_id')
        .in('kalshi_event_ticker', kalshiTickers)
        .in('odds_event_id', oddsIds);

    return data ?? [];
}

function buildCachedPairs(
    cachedMatches: { kalshi_event_ticker: string; odds_event_id: string }[],
    kalshiMap: Map<string, KalshiEvent>,
    oddsMap: Map<string, OddsEventSummary>,
): EventPair[] {
    const pairs: EventPair[] = [];

    for (const { kalshi_event_ticker, odds_event_id } of cachedMatches) {
        const kalshiEvent = kalshiMap.get(kalshi_event_ticker);
        const oddsEvent = oddsMap.get(odds_event_id);

        if (!kalshiEvent || !oddsEvent) continue;

        pairs.push({ kalshiEvent, oddsEvent });
    }

    return pairs;
}

async function insertNewMatches(pairs: EventPair[]): Promise<void> {
    if (pairs.length === 0) return;

    const rows = pairs.map(({ kalshiEvent, oddsEvent }) => ({
        kalshi_event_ticker: kalshiEvent.event_ticker,
        kalshi_event_title: kalshiEvent.title,
        kalshi_series_ticker: kalshiEvent.series_ticker,
        odds_event_id: oddsEvent.id,
        odds_data_teams: `${oddsEvent.home_team} vs ${oddsEvent.away_team}`,
    }));

    const { error } = await SupabaseClient
        .from(EVENT_MATCHES_TABLE)
        .insert(rows);

    if (error) {
        Logger.log(`Failed to insert new matches — ${error.message}`);
        return;
    }

    Logger.log(`Inserted ${rows.length} new matches into cache`);
}

async function matchEvents(kalshiEvents: KalshiEvent[], oddsEvents: OddsEventSummary[]): Promise<MatchResult> {
    const filtered = filterKalshiByDate(kalshiEvents, oddsEvents);
    Logger.log(`Filtered ${kalshiEvents.length} Kalshi events to ${filtered.length} by date`);

    if (filtered.length === 0 || oddsEvents.length === 0) {
        return { matched: [], unmatched: kalshiEvents };
    }

    const kalshiMap = new Map<string, KalshiEvent>();
    for (const e of kalshiEvents) kalshiMap.set(e.event_ticker, e);

    const oddsMap = new Map<string, OddsEventSummary>();
    for (const e of oddsEvents) oddsMap.set(e.id, e);

    const kalshiTickers = filtered.map(e => e.event_ticker);
    const oddsIds = oddsEvents.map(e => e.id);

    const cachedMatches = await getCachedMatches(kalshiTickers, oddsIds);
    const cachedPairs = buildCachedPairs(cachedMatches, kalshiMap, oddsMap);

    const cachedTickers = new Set(cachedPairs.map(p => p.kalshiEvent.event_ticker));
    Logger.log(`Resolved ${cachedPairs.length} matches from cache`);

    const uncached = filtered.filter(e => !cachedTickers.has(e.event_ticker));

    if (uncached.length === 0) {
        const unmatched = kalshiEvents.filter(e => !cachedTickers.has(e.event_ticker));
        return { matched: cachedPairs, unmatched };
    }

    Logger.log(`Sending ${uncached.length} unmatched events to Haiku`);
    const prompt = buildPrompt(uncached, oddsEvents);
    const haikuMatches = await callHaiku(prompt);
    const haikuResult = buildMatchResult(haikuMatches, kalshiEvents, oddsEvents);

    await insertNewMatches(haikuResult.matched);

    const allMatched = [...cachedPairs, ...haikuResult.matched];
    const allMatchedTickers = new Set(allMatched.map(p => p.kalshiEvent.event_ticker));
    const unmatched = kalshiEvents.filter(e => !allMatchedTickers.has(e.event_ticker));

    return { matched: allMatched, unmatched };
}

export default matchEvents;
