import KalshiSportsEvents from '../services/KalshiSportsEvents';
import TheOddsApi from '../services/TheOddsAPI';
import EventAnalysis from '../services/EventAnalysis';
import type { EdgeOpportunity } from '../services/EventAnalysis';
import KalshiAccount from '../services/KalshiAccount';
import AuditLogger from '../services/AuditLogger';
import { computeKellySizing } from '../utils/positions';
import SupabaseClient from '../clients/SupabaseClient';
import Logger from '../utils/Logger';
import { SPORT_CONFIG } from '../utils/sportConfig';
import type { EventPair, KalshiEvent, KalshiEventMarketData, OddsEvent, OddsEventSummary } from '../types';

interface TrackedOpportunity {
    opportunity: EdgeOpportunity;
    opportunityId: string | null;
}

interface AnalyzeResult {
    opportunities: number;
    executed: number;
    skipped: number;
}

export class TradingBot {

    private MIN_BALANCE = 10;
    private SPORT: string;
    private ODDS_API_SPORT_KEY: string;
    private LOOP_DELAY_MS = 100;
    private IS_DRY_RUN = process.env.DRY_RUN === 'true';
    private CACHE_WINDOW_MS = 12 * 60 * 60 * 1000;
    private EVENT_MATCHES_TABLE = 'event_matches';

    private oddsApi: TheOddsApi;
    private kalshiSportsEvents: KalshiSportsEvents;

    constructor(sport: string) {
        this.SPORT = sport;
        this.ODDS_API_SPORT_KEY = SPORT_CONFIG[sport].oddsApiKey;
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

    private async startAuditRun(balance: number, positions: number): Promise<void> {
        if (this.IS_DRY_RUN) {
            Logger.log('=== DRY RUN — no orders will be placed, no data will be logged ===');
            return;
        }

        await AuditLogger.startRun(this.SPORT, balance);
        await AuditLogger.logAccountSnapshot(balance, positions, 'run_start');
    }

    private async execute(): Promise<void> {
        const { accountBalance: initialBalance, activePositions } = await KalshiAccount.getAccountBalance();
        Logger.log(`Account balance: $${initialBalance}`);

        if (initialBalance < this.MIN_BALANCE) {
            Logger.log(`Balance below $${this.MIN_BALANCE} minimum — stopping.`);
            return;
        }

        // Get the held event tickers to avoid double dipping in markets if the edge is found twice
        // NOTE: Logic could be written to resize positions
        const heldEventTickers: Set<string> = await this.getHeldEventTickers();

        const matched = await this.getMatchedEvents();

        if (matched.length === 0) {
            Logger.log('No cached matches found — run discovery first (npm run discover).');
            return;
        }

        await this.startAuditRun(initialBalance, activePositions);

        const { opportunities, executed, skipped } = await this.analyzeAndExecute(matched, heldEventTickers);

        const { accountBalance: finalBalance, activePositions: finalPositions } = await KalshiAccount.getAccountBalance();
        await AuditLogger.logAccountSnapshot(finalBalance, finalPositions, 'run_end');
        await AuditLogger.completeRun({ matched: matched.length, opportunities, executed, skipped });
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
            .eq('events.sport_key', this.ODDS_API_SPORT_KEY);

        if (error) {
            throw new Error(`Failed to fetch cached matches: ${error.message}`);
        }

        if (!data || data.length === 0) {
            return [];
        }

        return data.map((row: any) => this.toEventPair(row));
    }

    private async getHeldEventTickers(): Promise<Set<string>> {
        const { event_positions } = await KalshiAccount.getPositions();

        const tickers = new Set<string>();
        for (const position of event_positions) {
            if (position.event_ticker) {
                tickers.add(position.event_ticker);
            }
        }

        Logger.log(`Holding positions in ${tickers.size} events.`);
        return tickers;
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

    private async analyzeAndExecute(matched: EventPair[], heldEventTickers: Set<string>): Promise<AnalyzeResult> {
        let opportunities = 0;
        let executed = 0;
        let skipped = 0;

        for (const { kalshiEvent, oddsEvent } of matched) {
            // For events that we have already traded, there is no use in burning api calls
            // There is a caveat to this, if the edge has now spawned on the other side of the event we would not trade the event
            // But that is more logic, we would have to check we werent summing proabilities to over 100% if we were gonna risk playing both sides of the market
            if (heldEventTickers.has(kalshiEvent.event_ticker)) {
                Logger.log(`Skipping ticker ${kalshiEvent.event_ticker} as a position is already held`);

                // TODO: We could check positions for profit at some point? Unless that is bad idea bc it defeats kelly position sizing strategy
                continue;
            }

            Logger.log(`Analyzing — "${kalshiEvent.title}" ↔ "${oddsEvent.away_team} at ${oddsEvent.home_team}"`);
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

                    opportunities += 1;

                    const placed = await this.executeOpportunity({ opportunity, opportunityId });
                    if (placed) {
                        executed += 1;
                    }
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

        return { opportunities, executed, skipped };
    }

    private async executeOpportunity(tracked: TrackedOpportunity): Promise<boolean> {
        const { opportunity, opportunityId } = tracked;

        const { accountBalance, activePositions } = await KalshiAccount.getAccountBalance();

        if (accountBalance < this.MIN_BALANCE) {
            Logger.log(`Balance below $${this.MIN_BALANCE} minimum — stopping.`);
            return false;
        }

        AuditLogger.logAccountSnapshot(accountBalance, activePositions, 'pre_order');

        Logger.log(opportunity.reason);
        await this.placeOrderForOpportunity(opportunity, opportunityId, accountBalance);

        return true;
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
