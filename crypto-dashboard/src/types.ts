export interface Coin {
    id: string;
    symbol: string;
    name: string;
    image: string;
    current_price: number;
    market_cap: number;
    market_cap_rank: number;
    price_change_percentage_24h: number;
    total_volume: number;
    sparkline_in_7d?: {
        price: number[];
    };
}

export interface CoinDetail {
    id: string;
    symbol: string;
    name: string;
    image: {
        thumb: string;
        small: string;
        large: string;
    };
    market_cap_rank: number;
    description: { en: string };
    links: {
        homepage: string[];
        blockchain_site: string[];
        official_forum_url: string[];
        chat_url: string[];
        announcement_url: string[];
        twitter_screen_name: string;
        facebook_username: string;
        bitcointalk_thread_identifier: number;
        telegram_channel_identifier: string;
        subreddit_url: string;
        repos_url: {
            github: string[];
            bitbucket: string[];
        };
    };
    market_data: {
        current_price: { [key: string]: number };
        total_volume: { [key: string]: number };
        market_cap: { [key: string]: number };
        high_24h: { [key: string]: number };
        low_24h: { [key: string]: number };
        price_change_24h: number;
        price_change_percentage_24h: number;
        circulating_supply: number;
        total_supply: number;
        max_supply: number;
        ath: { [key: string]: number };
        atl: { [key: string]: number };
        sparkline_7d: {
            price: number[];
        };
    };
}

export interface GlobalData {
    active_cryptocurrencies: number;
    upcoming_icos: number;
    ongoing_icos: number;
    ended_icos: number;
    markets: number;
    total_market_cap: { [key: string]: number };
    total_volume: { [key: string]: number };
    market_cap_percentage: { [key: string]: number };
    market_cap_change_percentage_24h_usd: number;
    updated_at: number;
}
