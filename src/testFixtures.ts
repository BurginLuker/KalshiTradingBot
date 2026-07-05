export const TEST_SPORTS_EVENT = {
  kalshiEvent: {
    available_on_brokers: true,
    category: 'Sports',
    collateral_return_type: 'MECNET',
    event_ticker: 'KXNCAAMBGAME-26FEB21ISUBYU',
    mutually_exclusive: true,
    product_metadata: {
      competition: 'College Basketball (M)',
      competition_scope: 'Game'
    },
    series_ticker: 'KXNCAAMBGAME',
    strike_period: '',
    sub_title: 'ISU at BYU (Feb 21)',
    title: 'Iowa St. at BYU'
  },
  oddsEvent: {
    id: '282639cb35a85482a44dcc2e20999de9',
    sport_key: 'basketball_ncaab',
    sport_title: 'NCAAB',
    commence_time: '2026-02-22T03:30:21+00:00',
    home_team: 'BYU Cougars',
    away_team: 'Iowa State Cyclones',
    fetched_date: '2026-02-21'
  }
};

export const TEST_ODDS_DATA = {
    'id': '282639cb35a85482a44dcc2e20999de9',
    'sport_key': 'basketball_ncaab',
    'sport_title': 'NCAAB',
    'commence_time': '2026-02-22T03:30:21Z',
    'home_team': 'BYU Cougars',
    'away_team': 'Iowa State Cyclones',
    'bookmakers': [
        {
            'key': 'fanduel',
            'title': 'FanDuel',
            'markets': [
                {
                    'key': 'h2h',
                    'last_update': '2026-02-21T19:42:16Z',
                    'outcomes': [
                        { 'name': 'BYU Cougars', 'price': 2.36 },
                        { 'name': 'Iowa State Cyclones', 'price': 1.61 }
                    ]
                }
            ]
        },
        {
            'key': 'betrivers',
            'title': 'BetRivers',
            'markets': [
                {
                    'key': 'h2h',
                    'last_update': '2026-02-21T19:41:07Z',
                    'outcomes': [
                        { 'name': 'BYU Cougars', 'price': 2.3 },
                        { 'name': 'Iowa State Cyclones', 'price': 1.62 }
                    ]
                }
            ]
        },
        {
            'key': 'betonlineag',
            'title': 'BetOnline.ag',
            'markets': [
                {
                    'key': 'h2h',
                    'last_update': '2026-02-21T19:42:17Z',
                    'outcomes': [
                        { 'name': 'BYU Cougars', 'price': 2.4 },
                        { 'name': 'Iowa State Cyclones', 'price': 1.62 }
                    ]
                }
            ]
        },
        {
            'key': 'lowvig',
            'title': 'LowVig.ag',
            'markets': [
                {
                    'key': 'h2h',
                    'last_update': '2026-02-21T19:41:21Z',
                    'outcomes': [
                        { 'name': 'BYU Cougars', 'price': 2.4 },
                        { 'name': 'Iowa State Cyclones', 'price': 1.62 }
                    ]
                }
            ]
        },
        {
            'key': 'betus',
            'title': 'BetUS',
            'markets': [
                {
                    'key': 'h2h',
                    'last_update': '2026-02-21T19:41:52Z',
                    'outcomes': [
                        { 'name': 'BYU Cougars', 'price': 2.38 },
                        { 'name': 'Iowa State Cyclones', 'price': 1.62 }
                    ]
                }
            ]
        },
        {
            'key': 'bovada',
            'title': 'Bovada',
            'markets': [
                {
                    'key': 'h2h',
                    'last_update': '2026-02-21T19:38:59Z',
                    'outcomes': [
                        { 'name': 'BYU Cougars', 'price': 2.3 },
                        { 'name': 'Iowa State Cyclones', 'price': 1.67 }
                    ]
                }
            ]
        }
    ]
};

export const TEST_KALSHI_DATA = {
    'event': {
        'available_on_brokers': true,
        'category': 'Sports',
        'collateral_return_type': 'MECNET',
        'event_ticker': 'KXNCAAMBGAME-26FEB21ISUBYU',
        'mutually_exclusive': true,
        'product_metadata': {
            'competition': 'College Basketball (M)',
            'competition_scope': 'Game'
        },
        'series_ticker': 'KXNCAAMBGAME',
        'strike_period': '',
        'sub_title': 'ISU at BYU (Feb 21)',
        'title': 'Iowa St. at BYU'
    },
    'markets': [
        {
            'can_close_early': true,
            'close_time': '2026-03-08T03:30:00Z',
            'created_time': '0001-01-01T00:00:00Z',
            'custom_strike': { 'basketball_team': '96df7ed9-6c18-4b67-ae83-fa27baabf8e3' },
            'early_close_condition': 'This market will close and expire after a winner is declared.',
            'event_ticker': 'KXNCAAMBGAME-26FEB21ISUBYU',
            'expected_expiration_time': '2026-02-22T06:30:00Z',
            'expiration_time': '2026-03-08T03:30:00Z',
            'expiration_value': '',
            'fractional_trading_enabled': false,
            'last_price': 39,
            'last_price_dollars': '0.3900',
            'latest_expiration_time': '2026-03-08T03:30:00Z',
            'liquidity': 0,
            'liquidity_dollars': '0.0000',
            'market_type': 'binary',
            'no_ask': 62,
            'no_ask_dollars': '0.6200',
            'no_bid': 61,
            'no_bid_dollars': '0.6100',
            'no_sub_title': 'BYU',
            'notional_value': 100,
            'notional_value_dollars': '1.0000',
            'open_interest': 37191,
            'open_interest_fp': '37191.00',
            'open_time': '2026-02-20T01:53:00Z',
            'previous_price': 0,
            'previous_price_dollars': '0.0000',
            'previous_yes_ask': 0,
            'previous_yes_ask_dollars': '0.0000',
            'previous_yes_bid': 0,
            'previous_yes_bid_dollars': '0.0000',
            'price_level_structure': 'linear_cent',
            'price_ranges': [{ 'end': '1.0000', 'start': '0.0000', 'step': '0.0100' }],
            'response_price_units': 'usd_cent',
            'result': '',
            'rules_primary': 'If BYU wins the Iowa St. at BYU men\'s college basketball game originally scheduled for Feb 21, 2026, then the market resolves to Yes.',
            'rules_secondary': 'The following market refers to the team who wins the Iowa St. at BYU men\'s college basketball game originally scheduled for Feb 21, 2026. If this game is postponed or delayed, the market will remain open and close after the rescheduled game has finished (within two weeks). If the cancelled game is not played or is rescheduled further than two weeks out, the market will resolve to a fair price for each team in accordance with the rules. Kalshi is not affiliated,  associated,  authorized, endorsed by, or in any way officially connected with the NCAA. All trademarks, logos, and brand names are the property of their respective owners.',
            'settlement_timer_seconds': 300,
            'status': 'active',
            'strike_type': 'structured',
            'subtitle': '',
            'tick_size': 1,
            'ticker': 'KXNCAAMBGAME-26FEB21ISUBYU-BYU',
            'title': 'Iowa St. at BYU Winner?',
            'updated_time': '0001-01-01T00:00:00Z',
            'volume': 37467,
            'volume_24h': 31801,
            'volume_24h_fp': '31801.00',
            'volume_fp': '37467.00',
            'yes_ask': 39,
            'yes_ask_dollars': '0.3900',
            'yes_bid': 38,
            'yes_bid_dollars': '0.3800',
            'yes_sub_title': 'BYU'
        },
        {
            'can_close_early': true,
            'close_time': '2026-03-08T03:30:00Z',
            'created_time': '0001-01-01T00:00:00Z',
            'custom_strike': { 'basketball_team': '3e806ca2-b0f4-4840-8165-c7e548892a50' },
            'early_close_condition': 'This market will close and expire after a winner is declared.',
            'event_ticker': 'KXNCAAMBGAME-26FEB21ISUBYU',
            'expected_expiration_time': '2026-02-22T06:30:00Z',
            'expiration_time': '2026-03-08T03:30:00Z',
            'expiration_value': '',
            'fractional_trading_enabled': false,
            'last_price': 60,
            'last_price_dollars': '0.6000',
            'latest_expiration_time': '2026-03-08T03:30:00Z',
            'liquidity': 0,
            'liquidity_dollars': '0.0000',
            'market_type': 'binary',
            'no_ask': 41,
            'no_ask_dollars': '0.4100',
            'no_bid': 40,
            'no_bid_dollars': '0.4000',
            'no_sub_title': 'Iowa St.',
            'notional_value': 100,
            'notional_value_dollars': '1.0000',
            'open_interest': 46293,
            'open_interest_fp': '46293.00',
            'open_time': '2026-02-20T01:53:00Z',
            'previous_price': 0,
            'previous_price_dollars': '0.0000',
            'previous_yes_ask': 0,
            'previous_yes_ask_dollars': '0.0000',
            'previous_yes_bid': 0,
            'previous_yes_bid_dollars': '0.0000',
            'price_level_structure': 'linear_cent',
            'price_ranges': [{ 'end': '1.0000', 'start': '0.0000', 'step': '0.0100' }],
            'response_price_units': 'usd_cent',
            'result': '',
            'rules_primary': 'If Iowa St. wins the Iowa St. at BYU men\'s college basketball game originally scheduled for Feb 21, 2026, then the market resolves to Yes.',
            'rules_secondary': 'The following market refers to the team who wins the Iowa St. at BYU men\'s college basketball game originally scheduled for Feb 21, 2026. If this game is postponed or delayed, the market will remain open and close after the rescheduled game has finished (within two weeks). If the cancelled game is not played or is rescheduled further than two weeks out, the market will resolve to a fair price for each team in accordance with the rules. Kalshi is not affiliated,  associated,  authorized, endorsed by, or in any way officially connected with the NCAA. All trademarks, logos, and brand names are the property of their respective owners.',
            'settlement_timer_seconds': 300,
            'status': 'active',
            'strike_type': 'structured',
            'subtitle': '',
            'tick_size': 1,
            'ticker': 'KXNCAAMBGAME-26FEB21ISUBYU-ISU',
            'title': 'Iowa St. at BYU Winner?',
            'updated_time': '0001-01-01T00:00:00Z',
            'volume': 48979,
            'volume_24h': 47533,
            'volume_24h_fp': '47533.00',
            'volume_fp': '48979.00',
            'yes_ask': 60,
            'yes_ask_dollars': '0.6000',
            'yes_bid': 59,
            'yes_bid_dollars': '0.5900',
            'yes_sub_title': 'Iowa St.'
        }
    ]
};
