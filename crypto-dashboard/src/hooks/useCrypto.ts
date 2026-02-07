import { useState, useEffect } from 'react';
import axios from 'axios';
import { Coin, CoinDetail, GlobalData } from '../types';

const BASE_URL = 'https://api.coingecko.com/api/v3';

export const useCrypto = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getTopCoins = async (perPage = 100): Promise<Coin[]> => {
        setLoading(true);
        try {
            const response = await axios.get(`${BASE_URL}/coins/markets`, {
                params: {
                    vs_currency: 'usd',
                    order: 'market_cap_desc',
                    per_page: perPage,
                    page: 1,
                    sparkline: true,
                    price_change_percentage: '24h',
                },
            });
            return response.data;
        } catch (err: any) {
            setError(err.message);
            return [];
        } finally {
            setLoading(false);
        }
    };

    const getCoinDetail = async (id: string): Promise<CoinDetail | null> => {
        setLoading(true);
        try {
            const response = await axios.get(`${BASE_URL}/coins/${id}`, {
                params: {
                    localization: false,
                    tickers: false,
                    market_data: true,
                    community_data: false,
                    developer_data: false,
                    sparkline: true,
                },
            });
            return response.data;
        } catch (err: any) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    };

    const getGlobalData = async (): Promise<GlobalData | null> => {
        try {
            const response = await axios.get(`${BASE_URL}/global`);
            return response.data.data;
        } catch (err: any) {
            setError(err.message);
            return null;
        }
    };

    return { loading, error, getTopCoins, getCoinDetail, getGlobalData };
};
