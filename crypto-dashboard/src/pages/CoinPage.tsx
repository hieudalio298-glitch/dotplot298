import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { createChart, ColorType } from 'lightweight-charts';
import { ArrowLeft, ExternalLink, Globe, Twitter, Github, Info, Activity } from 'lucide-react';
import { useCrypto } from '../hooks/useCrypto';
import { CoinDetail } from '../types';

const CoinPage = () => {
    const { id } = useParams();
    const { getCoinDetail, loading } = useCrypto();
    const [coin, setCoin] = useState<CoinDetail | null>(null);
    const chartContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchDetail = async () => {
            if (id) {
                const data = await getCoinDetail(id);
                setCoin(data);
            }
        };
        fetchDetail();
    }, [id]);

    useEffect(() => {
        if (!coin || !chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#9ca3af',
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
            },
            width: chartContainerRef.current.clientWidth,
            height: 400,
        });

        const lineSeries = chart.addAreaSeries({
            lineColor: '#00f2ff',
            topColor: 'rgba(0, 242, 255, 0.4)',
            bottomColor: 'rgba(0, 242, 255, 0)',
            lineWidth: 2,
        });

        // Use sparkline data for simplified chart since we don't have historical OHLC easily without extra calls
        if (coin.market_data?.sparkline_7d?.price) {
            const data = coin.market_data.sparkline_7d.price.map((p, i) => ({
                time: (Math.floor(Date.now() / 1000) - (168 - i) * 3600) as any,
                value: p,
            }));
            lineSeries.setData(data);
        }

        chart.timeScale().fitContent();

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [coin]);

    if (!coin && loading) return <div className="text-center py-20">Loading coin details...</div>;
    if (!coin) return <div className="text-center py-20">Coin not found.</div>;

    return (
        <div className="space-y-8 pb-20">
            <Link to="/markets" className="inline-flex items-center text-gray-400 hover:text-neon-cyan transition-colors">
                <ArrowLeft size={18} className="mr-2" /> Back to Markets
            </Link>

            {/* Coin Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center space-x-6">
                    <img src={coin.image.large} alt={coin.name} className="w-16 h-16 rounded-full" />
                    <div>
                        <div className="flex items-center space-x-3">
                            <h1 className="text-4xl font-black text-white">{coin.name}</h1>
                            <span className="bg-white/10 px-3 py-1 rounded text-sm font-bold text-gray-400 uppercase">{coin.symbol}</span>
                            <span className="bg-neon-gradient px-3 py-1 rounded text-xs font-bold text-white">RANK #{coin.market_cap_rank}</span>
                        </div>
                        <div className="flex items-center space-x-4 mt-2">
                            {coin.links.homepage[0] && <a href={coin.links.homepage[0]} target="_blank" className="text-gray-500 hover:text-neon-cyan"><Globe size={18} /></a>}
                            {coin.links.twitter_screen_name && <a href={`https://twitter.com/${coin.links.twitter_screen_name}`} target="_blank" className="text-gray-500 hover:text-neon-cyan"><Twitter size={18} /></a>}
                            {coin.links.repos_url.github[0] && <a href={coin.links.repos_url.github[0]} target="_blank" className="text-gray-500 hover:text-neon-cyan"><Github size={18} /></a>}
                        </div>
                    </div>
                </div>
                <div className="text-left lg:text-right">
                    <div className="text-sm text-gray-400 font-medium mb-1">{coin.name} Price ({coin.symbol.toUpperCase()})</div>
                    <div className="flex items-center lg:justify-end space-x-4">
                        <span className="text-4xl font-black text-white">${coin.market_data.current_price.usd.toLocaleString()}</span>
                        <span className={`px-4 py-1 rounded-full text-sm font-bold ${coin.market_data.price_change_percentage_24h >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {coin.market_data.price_change_percentage_24h > 0 ? '+' : ''}{coin.market_data.price_change_percentage_24h.toFixed(2)}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Chart Container */}
            <div className="glass-card p-6 bg-black/40">
                <h3 className="text-lg font-bold mb-6 flex items-center"><Activity className="mr-2 text-neon-cyan" size={18} /> Price Action (7 Days)</h3>
                <div ref={chartContainerRef} className="w-full"></div>
            </div>

            {/* Market Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass-card">
                    <div className="text-gray-400 text-xs font-bold uppercase mb-2">Market Cap</div>
                    <div className="text-xl font-bold">${coin.market_data.market_cap.usd.toLocaleString()}</div>
                </div>
                <div className="glass-card">
                    <div className="text-gray-400 text-xs font-bold uppercase mb-2">24h Volume</div>
                    <div className="text-xl font-bold">${coin.market_data.total_volume.usd.toLocaleString()}</div>
                </div>
                <div className="glass-card">
                    <div className="text-gray-400 text-xs font-bold uppercase mb-2">Circulating Supply</div>
                    <div className="text-xl font-bold">{coin.market_data.circulating_supply.toLocaleString()} <span className="text-xs text-gray-500 uppercase">{coin.symbol}</span></div>
                </div>
                <div className="glass-card">
                    <div className="text-gray-400 text-xs font-bold uppercase mb-2">All Time High</div>
                    <div className="text-xl font-bold text-green-400">${coin.market_data.ath.usd.toLocaleString()}</div>
                </div>
            </div>

            {/* Description */}
            <div className="glass-card">
                <h3 className="text-xl font-bold mb-4 flex items-center"><Info className="mr-2 text-neon-purple" size={18} /> About {coin.name}</h3>
                <div
                    className="text-gray-400 leading-relaxed space-y-4 prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: coin.description.en }}
                />
            </div>
        </div>
    );
};

export default CoinPage;
