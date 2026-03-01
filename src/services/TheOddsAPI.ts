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

    private CACHE_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

    constructor(sport: string) {
        this.sport = SPORT_CONFIG[sport].oddsApiKey;
    }

    private async fetchEventsFromApi(): Promise<OddsEventSummary[]> {
        const url = `${this.DOMAIN}/${this.sport}/events/?apiKey=${THE_ODDS_API_KEY}&regions=${this.regions}`;
        const result = await fetch(url, { method: 'GET' });
        return await result.json() as OddsEventSummary[];
    }

    private async getCachedUpcomingEvents() {
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

    private sortByCommenceTime(events: OddsEventSummary[]): OddsEventSummary[] {
        return [...events].sort((a, b) =>
            new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime()
        );
    }

    async getUpcomingEvents(): Promise<OddsEventSummary[]> {
        const cached = await this.getCachedUpcomingEvents();
        if (cached && cached.length > 0) {
            Logger.log(`Cache hit — returning ${cached.length} events from Supabase`);
            return this.sortByCommenceTime(cached);
        }

        const events = await this.fetchEventsFromApi();
        await this.upsertEvents(events);

        return this.sortByCommenceTime(events);
    }

    async getEventOdds(event: OddsEventSummary): Promise<OddsEvent> {
        const {id} = event;

        const url = `${this.DOMAIN}/${this.sport}/events/${id}/odds/?apiKey=${THE_ODDS_API_KEY}&regions=${this.regions}`
        const result = await fetch(url, { method: 'GET' });

        return await result.json() as OddsEvent;
    }
}

export default TheOddsApi;
