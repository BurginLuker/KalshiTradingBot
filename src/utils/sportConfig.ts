export interface SportConfig {
    oddsApiKey: string;
    kalshiSeries: string;
}

export const SPORT_CONFIG: Record<string, SportConfig> = {
    'mens_college_basketball': {
        oddsApiKey: 'basketball_ncaab',
        kalshiSeries: 'KXNCAAMBGAME',
    },
    'mens_pro_basketball': {
        oddsApiKey: 'basketball_nba',
        kalshiSeries: 'KXNBAGAME',
    },
    'mls_soccer':{
        oddsApiKey:'soccer_usa_mls',
        kalshiSeries:'KXMLSGAME'
    },
    'american_hocky_league':{
        oddsApiKey:'icehockey_ahl',
        kalshiSeries:'KXAHLGAME'
    }
};
