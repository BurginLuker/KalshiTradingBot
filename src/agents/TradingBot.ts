import KalshiSportsEvents from '../services/KalshiSportsEvents';
import TheOddsApi from '../services/TheOddsAPI';
import EventAnalysis from '../services/EventAnalysis';
import type { EdgeOpportunity } from '../services/EventAnalysis';
import KalshiAccount from '../services/KalshiAccount';
import AuditLogger from '../services/AuditLogger';
import { computeKellySizing } from '../utils/positions';
import SupabaseClient from '../clients/SupabaseClient';
import Logger from '../utils/Logger';
import type { EventPair, KalshiEvent, KalshiEventMarketData, OddsEvent, OddsEventSummary } from '../types';

interface TrackedOpportunity {
    opportunity: EdgeOpportunity;
    opportunityId: string | null;
}

interface CollectResult {
    tracked: TrackedOpportunity[];
    skipped: number;
}

export class TradingBot {

    private MIN_BALANCE = 10;
    private SPORT: string;
    private LOOP_DELAY_MS = 100;
    private IS_DRY_RUN = process.env.DRY_RUN === 'true';
    private CACHE_WINDOW_MS = 12 * 60 * 60 * 1000;
    private EVENT_MATCHES_TABLE = 'event_matches';

    private oddsApi: TheOddsApi;
    private kalshiSportsEvents: KalshiSportsEvents;

    constructor(sport: string) {
        this.SPORT = sport;
        this.oddsApi = new TheOddsApi(sport);
        this.kalshiSportsEvents = new KalshiSportsEvents(sport);
    }

    async run(): Promise<void> {
        try {
            await this.execute();
        } catch (error) {
            Logger.log(`Run failed: ${error}`);
            await AuditLogger.failRun(String(error));
        }
    }

    private async execute(): Promise<void> {
        const { accountBalance: initialBalance, activePositions } = await KalshiAccount.getAccountBalance();
        Logger.log(`Account balance: $${initialBalance}`);

        if (this.IS_DRY_RUN) {
            Logger.log('=== DRY RUN — no orders will be placed, no data will be logged ===');
        } else {
            await AuditLogger.startRun(this.SPORT, initialBalance);
        }

        await AuditLogger.logAccountSnapshot(initialBalance, activePositions, 'run_start');

        if (initialBalance < this.MIN_BALANCE) {
            Logger.log(`Balance below $${this.MIN_BALANCE} minimum — stopping.`);
            await AuditLogger.completeRun({ matched: 0, opportunities: 0, executed: 0, skipped: 0 });
            return;
        }

        const matched = await this.getMatchedEvents();

        if (matched.length === 0) {
            Logger.log('No cached matches found — run discovery first (npm run discover).');
            await AuditLogger.completeRun({ matched: 0, opportunities: 0, executed: 0, skipped: 0 });
            return;
        }

        Logger.log(`Matched ${matched.length} events.`);

        const { tracked, skipped } = await this.collectOpportunities(matched);

        if (tracked.length === 0) {
            Logger.log('No qualifying opportunities found.');
            await AuditLogger.completeRun({ matched: matched.length, opportunities: 0, executed: 0, skipped });
            return;
        }

        const label = tracked.length === 1 ? 'opportunity' : 'opportunities';
        Logger.log(`Found ${tracked.length} qualifying ${label}.`);

        const executed = await this.executeOpportunities(tracked);

        const { accountBalance: finalBalance, activePositions: finalPositions } = await KalshiAccount.getAccountBalance();
        await AuditLogger.logAccountSnapshot(finalBalance, finalPositions, 'run_end');
        await AuditLogger.completeRun({ matched: matched.length, opportunities: tracked.length, executed, skipped });
    }

    private async getMatchedEvents(): Promise<EventPair[]> {
        const now = new Date();
        const windowEnd = new Date(now.getTime() + this.CACHE_WINDOW_MS);

        const { data, error } = await SupabaseClient
            .from(this.EVENT_MATCHES_TABLE)
            .select(`
                kalshi_event_ticker,
                kalshi_event_title,
                kalshi_series_ticker,
                odds_event_id,
                events!inner(id, sport_key, sport_title, commence_time, home_team, away_team)
            `)
            .gte('events.commence_time', now.toISOString())
            .lte('events.commence_time', windowEnd.toISOString())
            .eq('events.sport_key', this.SPORT);

        if (error) {
            throw new Error(`Failed to fetch cached matches: ${error.message}`);
        }

        if (!data || data.length === 0) {
            return [];
        }

        return data.map((row: any) => this.toEventPair(row));
    }

    private toEventPair(row: any): EventPair {
        const event = row.events;

        const kalshiEvent: KalshiEvent = {
            event_ticker: row.kalshi_event_ticker,
            title: row.kalshi_event_title,
            series_ticker: row.kalshi_series_ticker,
            sub_title: '',
            category: '',
            mutually_exclusive: false,
            available_on_brokers: false,
            collateral_return_type: '',
            strike_period: '',
            product_metadata: { competition: '', competition_scope: '' },
        };

        const oddsEvent: OddsEventSummary = {
            id: event.id,
            sport_key: event.sport_key,
            sport_title: event.sport_title,
            commence_time: event.commence_time,
            home_team: event.home_team,
            away_team: event.away_team,
        };

        return { kalshiEvent, oddsEvent };
    }

    private async collectOpportunities(matched: EventPair[]): Promise<CollectResult> {
        const tracked: TrackedOpportunity[] = [];
        let skipped = 0;

        for (const { kalshiEvent, oddsEvent } of matched) {
            await this.sleep(this.LOOP_DELAY_MS);

            try {
                const [kalshiMarketData, oddsData]: [KalshiEventMarketData, OddsEvent] = await Promise.all([
                    this.kalshiSportsEvents.getEventMarketData(kalshiEvent),
                    this.oddsApi.getEventOdds(oddsEvent),
                ]);

                if (!oddsData.bookmakers) {
                    throw new Error(JSON.stringify(oddsData) + '' + JSON.stringify(oddsEvent));
                }

                const matchId = await AuditLogger.logEventMatch(kalshiEvent, oddsEvent);

                const eventOpportunities = EventAnalysis.analyzeEvent(kalshiMarketData, oddsData);

                for (const opportunity of eventOpportunities) {
                    const opportunityId = matchId
                        ? await AuditLogger.logEdgeOpportunity(matchId, opportunity)
                        : null;

                    tracked.push({ opportunity, opportunityId });
                }
            } catch (error) {
                Logger.log(`Skipping event — analysis failed: ${error}`);
                await AuditLogger.logSkippedEvent(
                    kalshiEvent.event_ticker,
                    oddsEvent?.id ?? null,
                    String(error),
                );
                skipped += 1;
            }
        }

        Logger.log(`Skipped: ${skipped} events`);

        const sorted = tracked.sort((a, b) => b.opportunity.edge_event.edge - a.opportunity.edge_event.edge);
        return { tracked: sorted, skipped };
    }

    private async executeOpportunities(tracked: TrackedOpportunity[]): Promise<number> {
        let executed = 0;

        for (const { opportunity, opportunityId } of tracked) {
            const { accountBalance, activePositions } = await KalshiAccount.getAccountBalance();

            if (accountBalance < this.MIN_BALANCE) {
                Logger.log(`Balance below $${this.MIN_BALANCE} minimum — stopping.`);
                break;
            }

            await AuditLogger.logAccountSnapshot(accountBalance, activePositions, 'pre_order');

            Logger.log(opportunity.reason);
            await this.placeOrderForOpportunity(opportunity, opportunityId, accountBalance);
            executed += 1;
        }

        return executed;
    }

    private async placeOrderForOpportunity(
        opportunity: EdgeOpportunity,
        opportunityId: string | null,
        bankroll: number,
    ): Promise<void> {
        const { ticker, kalshiYesAskPrice, fairProbability, yesSide } = opportunity.edge_event;

        const sizing = computeKellySizing(fairProbability, kalshiYesAskPrice, bankroll);

        this.logOrderDetails(yesSide, sizing, kalshiYesAskPrice);

        if (this.IS_DRY_RUN) {
            Logger.log(`DRY RUN: would place ${sizing.contractCount} contracts — no order sent`);
            return;
        }

        const result = await KalshiAccount.placeOrder(ticker, kalshiYesAskPrice, sizing.contractCount);
        Logger.log(`Order result: ${JSON.stringify(result)}`);

        if (!opportunityId) return;

        await AuditLogger.markOpportunityPlaced(opportunityId);
        await AuditLogger.logOrder({
            opportunityId,
            ticker,
            yesSide,
            yesPriceCents: Math.round(kalshiYesAskPrice * 100),
            contractCount: sizing.contractCount,
            kellyFraction: sizing.kellyFraction,
            dollarAmount: sizing.dollarAmount,
            accountBalance: bankroll,
            kalshiResponse: result,
        });
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private logOrderDetails(yesSide: string, sizing: ReturnType<typeof computeKellySizing>, askPrice: number): void {
        const price = (askPrice * 100).toFixed(0);
        const kelly = (sizing.kellyFraction * 100).toFixed(1);
        const dollars = sizing.dollarAmount.toFixed(2);

        Logger.log(
            `Placing order: ${yesSide} YES | ${sizing.contractCount} contracts @ ` +
            `${price}¢ | Kelly: ${kelly}% of bankroll | $${dollars}`
        );
    }

}

export default TradingBot;
