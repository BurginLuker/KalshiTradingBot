import { THE_ODDS_API_KEY } from "../keys";
import SupabaseClient from "../clients/SupabaseClient";
import Logger from "../utils/Logger";
import { SPORT_CONFIG } from "../utils/sportConfig";
import type { OddsEvent, OddsEventSummary } from "../types";

class TheOddsApi {
    private DOMAIN = 'https://api.the-odds-api.com/v4/sports';
    private EVENTS_TABLE = 'events';

    private sport;
    private regions = 'us';

    private CACHE_WINDOW_MS = 12 * 60 * 60 * 1000;

    constructor(sport: string) {
        this.sport = SPORT_CONFIG[sport].oddsApiKey;
    }

    private async fetchEventsFromApi(): Promise<OddsEventSummary[]> {
        const url = `${this.DOMAIN}/${this.sport}/events/?apiKey=${THE_ODDS_API_KEY}&regions=${this.regions}`;
        const result = await fetch(url, { method: 'GET' });
        return await result.json() as OddsEventSummary[];
    }

    private async getCachedTodaysEvents() {
        const now = new Date();
        const windowEnd = new Date(now.getTime() + this.CACHE_WINDOW_MS);

        const { data } = await SupabaseClient
            .from(this.EVENTS_TABLE)
            .select('*')
            .gte('commence_time', now.toISOString())
            .lte('commence_time', windowEnd.toISOString())
            .eq('sport_key', this.sport);
        return data;
    }

    private async upsertEvents(events: OddsEventSummary[]) {
        const { data, error } = await SupabaseClient
            .from(this.EVENTS_TABLE)
            .upsert(events)
            .select();

        if (error) throw new Error(`Failed to upsert events: ${error.message}`);

        Logger.log(`Upserted ${data?.length ?? 0} events into Supabase`);
    }

    private hasNotStarted(event: OddsEventSummary): boolean {
        return new Date(event.commence_time) > new Date();
    }

    private sortByCommenceTime(events: OddsEventSummary[]): OddsEventSummary[] {
        return [...events].sort((a, b) =>
            new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime()
        );
    }

    async getTodaysEvents(): Promise<OddsEventSummary[]> {
        const cached = await this.getCachedTodaysEvents();
        if (cached && cached.length > 0) {
            const upcoming = cached.filter((event) => this.hasNotStarted(event));
            Logger.log(`Cache hit — returning ${upcoming.length} upcoming events from Supabase`);
            return this.sortByCommenceTime(upcoming);
        }

        const events = await this.fetchEventsFromApi();
        await this.upsertEvents(events);

        const upcoming = events.filter((event: OddsEventSummary) => this.hasNotStarted(event));

        return this.sortByCommenceTime(upcoming);
    }

    async getEventOdds(event: OddsEventSummary): Promise<OddsEvent> {
        const {id} = event;

        const url = `${this.DOMAIN}/${this.sport}/events/${id}/odds/?apiKey=${THE_ODDS_API_KEY}&regions=${this.regions}`
        const result = await fetch(url, { method: 'GET' });

        return await result.json() as OddsEvent;
    }
}

export default TheOddsApi;
