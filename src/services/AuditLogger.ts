import SupabaseClient from '../clients/SupabaseClient';
import Logger from '../utils/Logger';
import type { EdgeOpportunity } from './EventAnalysis';
import type { KalshiEvent, OddsEventSummary } from '../types';

interface RunCounts {
    matched: number;
    opportunities: number;
    executed: number;
    skipped: number;
}

interface OrderLogParams {
    opportunityId: string;
    ticker: string;
    yesSide: string;
    yesPriceCents: number;
    contractCount: number;
    kellyFraction: number;
    dollarAmount: number;
    accountBalance: number;
    kalshiResponse: any;
}

class AuditLogger {

    private runId: string | null = null;

    async startRun(sport: string, initialBalance: number): Promise<void> {
        const { data, error } = await SupabaseClient
            .from('bot_runs')
            .insert({ sport, initial_balance_dollars: initialBalance, status: 'running' })
            .select('id')
            .single();

        if (error) {
            Logger.log(`AuditLogger: failed to start run — ${error.message}`);
            return;
        }

        this.runId = data.id;
        Logger.log(`AuditLogger: run ${this.runId} started`);
    }

    async completeRun(counts: RunCounts): Promise<void> {
        if (!this.runId) return;

        const { error } = await SupabaseClient
            .from('bot_runs')
            .update({
                completed_at: new Date().toISOString(),
                status: 'completed',
                events_matched_count: counts.matched,
                opportunities_found_count: counts.opportunities,
                opportunities_executed_count: counts.executed,
                events_skipped_count: counts.skipped,
            })
            .eq('id', this.runId);

        if (error) Logger.log(`AuditLogger: failed to complete run — ${error.message}`);
    }

    async failRun(errorMessage: string): Promise<void> {
        if (!this.runId) return;

        const { error } = await SupabaseClient
            .from('bot_runs')
            .update({
                completed_at: new Date().toISOString(),
                status: 'failed',
                error_message: errorMessage,
            })
            .eq('id', this.runId);

        if (error) Logger.log(`AuditLogger: failed to mark run as failed — ${error.message}`);
    }

    async logAccountSnapshot(balance: number, activePositions: number, reason: string): Promise<void> {
        if (!this.runId) return;

        const { error } = await SupabaseClient
            .from('account_snapshots')
            .insert({
                run_id: this.runId,
                balance_dollars: balance,
                active_positions_dollars: activePositions,
                snapshot_reason: reason,
            });

        if (error) Logger.log(`AuditLogger: failed to log account snapshot — ${error.message}`);
    }

    async logEventMatch(kalshiEvent: KalshiEvent, oddsEvent: OddsEventSummary): Promise<string | null> {
        if (!this.runId) return null;

        const { data, error } = await SupabaseClient
            .from('event_matches')
            .update({ run_id: this.runId })
            .eq('kalshi_event_ticker', kalshiEvent.event_ticker)
            .eq('odds_event_id', oddsEvent.id)
            .select('id')
            .single();

        if (error) {
            Logger.log(`AuditLogger: failed to log event match — ${error.message}`);
            return null;
        }

        return data.id;
    }

    async logEdgeOpportunity(matchId: string, opportunity: EdgeOpportunity): Promise<string | null> {
        if (!this.runId) return null;

        const { ticker, yesSide, kalshiYesAskPrice, fairProbability, edge, expectedValue } = opportunity.edge_event;

        const { data, error } = await SupabaseClient
            .from('edge_opportunities')
            .insert({
                run_id: this.runId,
                match_id: matchId,
                ticker,
                yes_side: yesSide,
                kalshi_yes_ask_price: kalshiYesAskPrice,
                fair_probability: fairProbability,
                edge,
                expected_value: expectedValue,
                reason: opportunity.reason,
                order_placed: false,
            })
            .select('id')
            .single();

        if (error) {
            Logger.log(`AuditLogger: failed to log edge opportunity — ${error.message}`);
            return null;
        }

        return data.id;
    }

    async markOpportunityPlaced(opportunityId: string): Promise<void> {
        if (!this.runId) return;

        const { error } = await SupabaseClient
            .from('edge_opportunities')
            .update({ order_placed: true })
            .eq('id', opportunityId);

        if (error) Logger.log(`AuditLogger: failed to mark opportunity as placed — ${error.message}`);
    }

    async logOrder(params: OrderLogParams): Promise<void> {
        if (!this.runId) return;

        const { error } = await SupabaseClient
            .from('orders')
            .insert({
                run_id: this.runId,
                opportunity_id: params.opportunityId,
                ticker: params.ticker,
                yes_side: params.yesSide,
                yes_price_cents: params.yesPriceCents,
                contract_count: params.contractCount,
                kelly_fraction: params.kellyFraction,
                dollar_amount: params.dollarAmount,
                account_balance_at_order: params.accountBalance,
                kalshi_response: params.kalshiResponse,
            });

        if (error) Logger.log(`AuditLogger: failed to log order — ${error.message}`);
    }

    async logSkippedEvent(kalshiEventTicker: string, oddsEventId: string | null, errorMessage: string): Promise<void> {
        if (!this.runId) return;

        const { error } = await SupabaseClient
            .from('skipped_events')
            .insert({
                run_id: this.runId,
                kalshi_event_ticker: kalshiEventTicker,
                odds_event_id: oddsEventId,
                error_message: errorMessage,
            });

        if (error) Logger.log(`AuditLogger: failed to log skipped event — ${error.message}`);
    }

}

export default new AuditLogger();
