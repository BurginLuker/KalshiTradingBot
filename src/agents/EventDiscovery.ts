import TheOddsApi from '../services/TheOddsAPI';
import KalshiSportsEvents from '../services/KalshiSportsEvents';
import matchEvents from '../utils/EventMatcher';
import Logger from '../utils/Logger';

class EventDiscovery {

    private sport: string;
    private oddsApi: TheOddsApi;
    private kalshiSportsEvents: KalshiSportsEvents;

    constructor(sport: string) {
        this.sport = sport;
        this.oddsApi = new TheOddsApi(sport);
        this.kalshiSportsEvents = new KalshiSportsEvents(sport);
    }

    async run(): Promise<void> {
        try {
            await this.execute();
        } catch (error) {
            Logger.log(`Discovery failed: ${error}`);
        }
    }

    private async execute(): Promise<void> {
        Logger.log(`Starting event discovery for ${this.sport}`);

        const [oddsEvents, kalshiEvents] = await Promise.all([
            this.oddsApi.getUpcomingEvents(),
            this.kalshiSportsEvents.getSportsEvents(),
        ]);

        Logger.log(`Fetched ${oddsEvents.length} odds events, ${kalshiEvents.length} Kalshi events`);

        const { matched, unmatched } = await matchEvents(kalshiEvents, oddsEvents);

        Logger.log(`Discovery complete — matched: ${matched.length}, unmatched: ${unmatched.length}`);
    }

}

export default EventDiscovery;
