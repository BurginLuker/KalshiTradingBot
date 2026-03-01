import KalshiSportsEvents from '../services/KalshiSportsEvents';
import TheOddsApi from '../services/TheOddsAPI';
import SupabaseClient from '../clients/SupabaseClient';
import Logger from '../utils/Logger';
import { aggregateFairProbabilities } from '../utils/oddsUtils';
import type { KalshiEvent, OddsEventSummary } from '../types';

export interface SnapshotContext {
    ticker: string;
    eventTicker: string;
    entryPriceCents: number;
    entryFairProbability: number;
    sport: string;
    kalshiEvent: KalshiEvent;
    oddsEvent: OddsEventSummary;
}

class OddsSnapshotBot {

    private SNAPSHOTS_TABLE = 'odds_snapshots';
    private CENTS_PER_DOLLAR = 100;
    private CHECK_INTERVALS = [
        { label: '5m',  delayMs:  5 * 60 * 1000 },
        { label: '30m', delayMs: 30 * 60 * 1000 },
        { label: '1hr', delayMs: 60 * 60 * 1000 },
        { label: '6hr',  delayMs:  6 * 60 * 60 * 1000 },
        { label: '12hr', delayMs: 12 * 60 * 60 * 1000 },
        { label: '24hr', delayMs: 24 * 60 * 60 * 1000 },
    ];

    scheduleChecks(context: SnapshotContext): void {
        Logger.log(`OddsSnapshotBot: scheduling 3 snapshots for ${context.ticker}`);

        for (const interval of this.CHECK_INTERVALS) {
            setTimeout(() => {
                this.captureSnapshot(context, interval.label).catch((error) => {
                    Logger.log(`OddsSnapshotBot: snapshot failed for ${context.ticker} at ${interval.label}: ${error}`);
                });
            }, interval.delayMs);
        }
    }

    private async captureSnapshot(context: SnapshotContext, checkInterval: string): Promise<void> {
        const kalshiSportsEvents = new KalshiSportsEvents(context.sport);
        const oddsApi = new TheOddsApi(context.sport);

        const [kalshiMarketData, oddsData] = await Promise.all([
            kalshiSportsEvents.getEventMarketData(context.kalshiEvent),
            oddsApi.getEventOdds(context.oddsEvent),
        ]);

        if (!oddsData.bookmakers) {
            Logger.log(`OddsSnapshotBot: odds data missing bookmakers for ${context.oddsEvent.home_team} vs ${context.oddsEvent.away_team} at ${checkInterval} — skipping`);
            return;
        }

        const market = kalshiMarketData.markets.find((m: any) => m.ticker === context.ticker);

        if (!market) {
            Logger.log(`OddsSnapshotBot: market not found for ticker ${context.ticker} at ${checkInterval} — skipping`);
            return;
        }

        // Using midpoint of yes_bid and yes_ask as the Kalshi implied price
        const kalshiMidpoint = (market.yes_bid + market.yes_ask) / 2 / this.CENTS_PER_DOLLAR;

        const fairProbs = aggregateFairProbabilities(oddsData);
        const snapshotFairProb = this.resolveFairProbability(market.yes_sub_title, fairProbs);

        if (snapshotFairProb === null) {
            Logger.log(`OddsSnapshotBot: could not resolve fair probability for "${market.yes_sub_title}" at ${checkInterval} — skipping`);
            return;
        }

        const entryKalshiPrice = context.entryPriceCents / this.CENTS_PER_DOLLAR;
        const laggingBook = this.determineLaggingBook(entryKalshiPrice, context.entryFairProbability, kalshiMidpoint, snapshotFairProb);

        await SupabaseClient
            .from(this.SNAPSHOTS_TABLE)
            .insert({
                sport: context.sport,
                ticker: context.ticker,
                event_ticker: context.eventTicker,
                check_interval: checkInterval,
                entry_kalshi_price_cents: context.entryPriceCents,
                entry_fair_probability: context.entryFairProbability,
                kalshi_midpoint_cents: Math.round(kalshiMidpoint * this.CENTS_PER_DOLLAR),
                books_fair_probability: snapshotFairProb,
                lagging_book: laggingBook,
            });

        Logger.log(
            `OddsSnapshotBot [${checkInterval}] ${context.ticker} | ` +
            `KalshiMid: ${Math.round(kalshiMidpoint * this.CENTS_PER_DOLLAR)}¢ | ` +
            `FairProb: ${(snapshotFairProb * this.CENTS_PER_DOLLAR).toFixed(1)}% | ` +
            `LaggingBook: ${laggingBook}`
        );
    }

    // The fairProbs map is keyed by full Odds API team names (e.g. "Los Angeles Lakers"),
    // but market.yes_sub_title is Kalshi's short label (e.g. "LA Lakers"). We first try
    // an exact lookup in case the names happen to match, then fall back to a
    // case-insensitive substring check in both directions — the same logic used by
    // matchOddsTeamName in oddsUtils.ts during the trading loop.
    private resolveFairProbability(yesSubTitle: string, fairProbs: Record<string, number>): number | null {
        if (fairProbs[yesSubTitle] !== undefined) {
            return fairProbs[yesSubTitle];
        }

        const lowerSubTitle = yesSubTitle.toLowerCase();
        const matchedKey = Object.keys(fairProbs).find((key) => {
            const lowerKey = key.toLowerCase();
            return lowerKey.includes(lowerSubTitle) || lowerSubTitle.includes(lowerKey);
        });

        return matchedKey !== undefined ? fairProbs[matchedKey] : null;
    }

    private determineLaggingBook(
        entryKalshiPrice: number,
        entryFairProb: number,
        snapshotKalshiMid: number,
        snapshotFairProb: number,
    ): string {
        const kalshiMovement = Math.abs(snapshotKalshiMid - entryKalshiPrice);
        const booksMovement = Math.abs(snapshotFairProb - entryFairProb);

        if (kalshiMovement > booksMovement) return 'kalshi';

        return 'odds_api';
    }

}

export { OddsSnapshotBot };
export default new OddsSnapshotBot();
