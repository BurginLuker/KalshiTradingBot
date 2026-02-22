import type { OddsEvent, OddsOutcome, Bookmaker, KalshiMarket } from '../types';

const H2H_MARKET_KEY = 'h2h';
const CENTS_PER_DOLLAR = 100;

export interface NormalizedKalshiMarket {
    ticker: string;
    yesSide: string;
    noSide: string;
    yesMidPrice: number;
    yesAskPrice: number;
    yesBidPrice: number;
}

export interface EdgeAnalysis {
    ticker: string;
    yesSide: string;
    kalshiYesAskPrice: number;
    fairProbability: number;
    edge: number;
    expectedValue: number;
    hasEdge: boolean;
}

// Converts a decimal (European) odds price to raw implied probability.
// e.g. 7.8 → 0.1282
export function decimalToImpliedProb(decimal: number): number {
    return 1 / decimal;
}

// Strips the bookmaker's overround from a set of implied probabilities.
// Returns fair (vig-free) probabilities that sum to 1.
// e.g. [0.917, 0.128] (sum 1.045) → [0.877, 0.123]
export function removeVig(probs: number[]): number[] {
    const overround = probs.reduce((sum, p) => sum + p, 0);
    return probs.map(p => p / overround);
}

// Aggregates fair win probabilities across all bookmakers for one event.
// Returns a map of team name → average fair probability.
export function aggregateFairProbabilities(oddsEvent: OddsEvent): Record<string, number> {
    const bookmakerFairProbs = oddsEvent.bookmakers
        .map((b) => extractH2HOutcomes(b))
        .filter((outcomes): outcomes is OddsOutcome[] => outcomes !== null)
        .map(computeBookmakerFairProbs);

    if (bookmakerFairProbs.length === 0) return {};

    const teamNames = [...new Set(bookmakerFairProbs.flatMap(fp => Object.keys(fp)))];
    const averaged: Record<string, number> = {};

    for (const team of teamNames) {
        const probs = bookmakerFairProbs
            .map((fp: Record<string, number>) => fp[team])
            .filter((p: number) => p !== undefined);
        averaged[team] = probs.reduce((sum: number, p: number) => sum + p, 0) / probs.length;
    }

    return averaged;
}

// Converts a raw Kalshi market object into a normalized structure
// with prices expressed as decimals in [0, 1].
export function normalizeKalshiMarket(market: KalshiMarket): NormalizedKalshiMarket {
    return {
        ticker: market.ticker,
        yesSide: market.yes_sub_title,
        noSide: market.no_sub_title,
        yesMidPrice: (market.yes_ask + market.yes_bid) / 2 / CENTS_PER_DOLLAR,
        yesAskPrice: market.yes_ask / CENTS_PER_DOLLAR,
        yesBidPrice: market.yes_bid / CENTS_PER_DOLLAR,
    };
}

// Returns the ROI per dollar invested on a Kalshi YES buy.
// A $1 contract costs yesAskPrice and pays $1 on resolution.
// Profit if YES: (1 - yesAskPrice), loss if NO: yesAskPrice
// EV per dollar wagered = (fairProb * (1 - yesAskPrice) - (1 - fairProb) * yesAskPrice) / yesAskPrice
//                       = (fairProb - yesAskPrice) / yesAskPrice
export function calculateExpectedValue(fairProb: number, yesAskPrice: number): number {
    return (fairProb - yesAskPrice) / yesAskPrice;
}

// Computes edge analysis for each Kalshi market against pre-aggregated
// fair probabilities from the already-matched Odds API event.
export function findEdges(kalshiMarkets: KalshiMarket[], fairProbs: Record<string, number>): EdgeAnalysis[] {
    const oddsTeamNames = Object.keys(fairProbs);

    return kalshiMarkets
        .map(rawMarket => computeMarketEdge(rawMarket, fairProbs, oddsTeamNames))
        .filter((edge): edge is EdgeAnalysis => edge !== null);
}

// --- Private helpers ---

function extractH2HOutcomes(bookmaker: Bookmaker): OddsOutcome[] | null {
    const market = bookmaker.markets.find((m) => m.key === H2H_MARKET_KEY);
    return market?.outcomes ?? null;
}

function computeBookmakerFairProbs(outcomes: OddsOutcome[]): Record<string, number> {
    const rawProbs = outcomes.map((o) => decimalToImpliedProb(o.price));
    const fairProbs = removeVig(rawProbs);
    return Object.fromEntries(outcomes.map((o, i) => [o.name, fairProbs[i]]));
}

// Matches a Kalshi short team name (e.g. "Texas Tech") against the full
// Odds API team names (e.g. "Texas Tech Red Raiders") for the same game.
function matchOddsTeamName(kalshiShortName: string, oddsNames: string[]): string | null {
    const shortNorm = normalizeTeamName(kalshiShortName);
    return oddsNames.find(name => {
        const fullNorm = normalizeTeamName(name);
        return fullNorm.includes(shortNorm) || shortNorm.includes(fullNorm);
    }) ?? null;
}

function normalizeTeamName(name: string): string {
    return name
        .toLowerCase()
        .replace(/\./g, '')
        .replace(/-/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function computeMarketEdge(
    rawMarket: KalshiMarket,
    fairProbs: Record<string, number>,
    oddsTeamNames: string[],
): EdgeAnalysis | null {
    const market = normalizeKalshiMarket(rawMarket);
    const matchedName = matchOddsTeamName(market.yesSide, oddsTeamNames);

    if (!matchedName) return null;

    const fairProb = fairProbs[matchedName];
    const edge = fairProb - market.yesAskPrice;

    return {
        ticker: market.ticker,
        yesSide: market.yesSide,
        kalshiYesAskPrice: market.yesAskPrice,
        fairProbability: fairProb,
        edge,
        expectedValue: calculateExpectedValue(fairProb, market.yesAskPrice),
        hasEdge: edge > 0,
    };
}
