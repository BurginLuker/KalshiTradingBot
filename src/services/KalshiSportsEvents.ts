import KalshiConfiguration from "../clients/KalshiConfiguration";
import {
    EventsApi,
    SeriesApi,
    MarketsApi
} from 'kalshi-typescript';
import { SPORT_CONFIG } from '../utils/sportConfig';
import type { KalshiEvent, KalshiEventMarketData } from '../types';

class KalshiSportsEvents {
    private series: string;
    private eventsApi;
    private marketsApi;
    private seriesApi;

    constructor(sport: string) {
        this.series = SPORT_CONFIG[sport].kalshiSeries;
        this.eventsApi = new EventsApi(KalshiConfiguration);
        this.marketsApi = new MarketsApi(KalshiConfiguration);
        this.seriesApi = new SeriesApi(KalshiConfiguration);
    }

    async getSportsEvents(): Promise<KalshiEvent[]> {
        const eventLimit = 200;
        const pageCursor = undefined;
        const includedNested = false;
        const eventStatus = 'open';

        const {data} = await this.eventsApi.getEvents(
            eventLimit,
            pageCursor,
            includedNested,
            eventStatus,
            this.series,
            undefined
        );

        if(!data.events){
            throw new Error('Failed to get events');
        }

        return data.events;
    }

    async getEventMarketData(e: KalshiEvent): Promise<KalshiEventMarketData> {
        const {event_ticker} = e;
        const {data} = await this.eventsApi.getEvent(event_ticker);

        return data;
    }

}

export default KalshiSportsEvents;
