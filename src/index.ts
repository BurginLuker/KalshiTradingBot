import TradingBot from './agents/TradingBot';
import EventDiscovery from './agents/EventDiscovery';

const MENS_PRO_BASKETBALL = 'mens_pro_basketball';
const MENS_COLLEGE_BASKETBALL = 'mens_college_basketball';
const MENS_MLS_SOCCER = 'mls_soccer';
const AMERICAN_HOCKY_LEAGUE = 'american_hocky_league';
const WOMENS_COLLEGE_BASKETBALL = 'womens_college_basketball'

//const SPORTS = [MENS_COLLEGE_BASKETBALL, MENS_PRO_BASKETBALL];
const SPORTS = [WOMENS_COLLEGE_BASKETBALL];

const LOOP_INTERVAL_MS = 20 * 60 * 1000; // 20 minutes
const DISCOVERY_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    if (process.env.DISCOVER === 'true') {
        await Promise.all(SPORTS.map(sport => new EventDiscovery(sport).run()));
        return;
    }

    let lastDiscoveryTime = 0;

    while (true) {
        const timeSinceLastDiscovery = Date.now() - lastDiscoveryTime;
        if (timeSinceLastDiscovery >= DISCOVERY_INTERVAL_MS) {
            await Promise.all(SPORTS.map(sport => new EventDiscovery(sport).run()));
            lastDiscoveryTime = Date.now();
        }

        await Promise.all(SPORTS.map(sport => new TradingBot(sport).run()));
        await sleep(LOOP_INTERVAL_MS);
    }
})();
