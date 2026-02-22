// ── The Odds API ──

export interface OddsOutcome {
    name: string;
    price: number;
}

export interface OddsMarket {
    key: string;
    last_update: string;
    outcomes: OddsOutcome[];
}

export interface Bookmaker {
    key: string;
    title: string;
    markets: OddsMarket[];
}

export interface OddsEvent {
    id: string;
    sport_key: string;
    sport_title: string;
    commence_time: string;
    home_team: string;
    away_team: string;
    bookmakers: Bookmaker[];
}

export interface OddsEventSummary {
    id: string;
    sport_key: string;
    sport_title: string;
    commence_time: string;
    home_team: string;
    away_team: string;
    fetched_date?: string;
}

// ── Kalshi ──

export interface KalshiPriceRange {
    start: string;
    end: string;
    step: string;
}

export interface KalshiMarket {
    ticker: string;
    event_ticker: string;
    title: string;
    subtitle: string;
    yes_sub_title: string;
    no_sub_title: string;
    yes_ask: number;
    yes_bid: number;
    yes_ask_dollars: string;
    yes_bid_dollars: string;
    no_ask: number;
    no_bid: number;
    no_ask_dollars: string;
    no_bid_dollars: string;
    last_price: number;
    last_price_dollars: string;
    status: string;
    market_type: string;
    volume: number;
    volume_24h: number;
    volume_fp: string;
    volume_24h_fp: string;
    open_interest: number;
    open_interest_fp: string;
    open_time: string;
    close_time: string;
    expiration_time: string;
    expected_expiration_time: string;
    latest_expiration_time: string;
    expiration_value: string;
    result: string;
    can_close_early: boolean;
    early_close_condition: string;
    created_time: string;
    updated_time: string;
    price_ranges: KalshiPriceRange[];
    price_level_structure: string;
    response_price_units: string;
    notional_value: number;
    notional_value_dollars: string;
    tick_size: number;
    rules_primary: string;
    rules_secondary: string;
    settlement_timer_seconds: number;
    strike_type: string;
    custom_strike: Record<string, string>;
    fractional_trading_enabled: boolean;
    liquidity: number;
    liquidity_dollars: string;
    previous_price: number;
    previous_price_dollars: string;
    previous_yes_ask: number;
    previous_yes_ask_dollars: string;
    previous_yes_bid: number;
    previous_yes_bid_dollars: string;
}

export interface KalshiProductMetadata {
    competition: string;
    competition_scope: string;
}

export interface KalshiEvent {
    event_ticker: string;
    title: string;
    sub_title: string;
    series_ticker: string;
    category: string;
    mutually_exclusive: boolean;
    available_on_brokers: boolean;
    collateral_return_type: string;
    strike_period: string;
    product_metadata: KalshiProductMetadata;
}

export interface KalshiEventMarketData {
    event: KalshiEvent;
    markets: KalshiMarket[];
}

// ── Kalshi Account ──

export interface AccountBalance {
    accountBalance: number;
    activePositions: number;
}

export interface OrderBody {
    ticker: string;
    side: string;
    action: string;
    type: string;
    yes_price: number;
    count: number;
}

// ── Event Matching ──

export interface EventPair {
    kalshiEvent: KalshiEvent;
    oddsEvent: OddsEventSummary;
}

export interface MatchResult {
    matched: EventPair[];
    unmatched: KalshiEvent[];
}
