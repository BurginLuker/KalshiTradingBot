import TradingBot from './agents/TradingBot';
import EventDiscovery from './agents/EventDiscovery';

const MENS_PRO_BASKETBALL = 'mens_pro_basketball';                                                                                                                                                                                            
const MENS_COLLEGE_BASKETBALL = 'mens_college_basketball';                                                                                                                                                                                    
const MENS_MLS_SOCCER = 'mls_soccer';  
const AMERICAN_HOCKY_LEAGUE = 'american_hocky_league';


const sport = MENS_PRO_BASKETBALL;

if (process.env.DISCOVER === 'true') {
    const discovery = new EventDiscovery(sport);
    discovery.run();
} else {
    const tradingBot = new TradingBot(sport);
    tradingBot.run();
}
