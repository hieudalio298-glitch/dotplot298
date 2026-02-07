import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Activity, PieChart, Zap, ArrowRight, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MetricCard } from '../components/MetricCard';
import { useCrypto } from '../hooks/useCrypto';
import { GlobalData, Coin } from '../types';

const Home = () => {
    const { getGlobalData, getTopCoins, loading } = useCrypto();
    const [global, setGlobal] = useState<GlobalData | null>(null);
    const [topCoins, setTopCoins] = useState<Coin[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const gData = await getGlobalData();
            const cData = await getTopCoins(10);
            setGlobal(gData);
            setTopCoins(cData);
        };
        fetchData();
    }, []);

    const gainers = [...topCoins].sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h).slice(0, 4);
    const actualLosers = [...topCoins].sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h).slice(0, 4);

    return (
        <div className="space-y-12">
            {/* Hero Section */}
            <section className="text-center py-20 relative overflow-hidden">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8 }}
                >
                    <h1 className="text-5xl md:text-8xl font-black mb-6 tracking-tighter leading-none">
                        FUTURE OF <br />
                        <span className="bg-clip-text text-transparent bg-neon-gradient">CRYPTO ASSETS</span>
                    </h1>
                    <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10">
                        Real-time data visualization for the modern digital economy. Track, analyze, and manage your assets with neon-powered clarity.
                    </p>
                    <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                        <Link to="/markets" className="btn-neon text-lg px-10 py-4 flex items-center group">
                            Explore Markets <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <button className="px-10 py-4 rounded-full font-bold text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                            Watch Demo
                        </button>
                    </div>
                </motion.div>
            </section>

            {/* Global Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Market Cap"
                    value={`$${((global?.total_market_cap?.usd || 0) / 1e12).toFixed(2)}T`}
                    change={global?.market_cap_change_percentage_24h_usd}
                    icon={<PieChart size={24} />}
                    delay={0.1}
                />
                <MetricCard
                    title="24h Volume"
                    value={`$${((global?.total_volume?.usd || 0) / 1e9).toFixed(2)}B`}
                    icon={<Activity size={24} />}
                    delay={0.2}
                />
                <MetricCard
                    title="BTC Dominance"
                    value={`${global?.market_cap_percentage?.btc.toFixed(1)}%`}
                    icon={<TrendingUp size={24} />}
                    delay={0.3}
                />
                <MetricCard
                    title="Active Assets"
                    value={global?.active_cryptocurrencies?.toLocaleString() || '---'}
                    icon={<Zap size={24} />}
                    delay={0.4}
                />
            </div>

            {/* Gainers & Losers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <h2 className="text-2xl font-bold mb-6 flex items-center">
                        <TrendingUp className="mr-2 text-green-400" /> Top Gainers
                    </h2>
                    <div className="space-y-4">
                        {gainers.map((coin, i) => (
                            <Link key={coin.id} to={`/coin/${coin.id}`} className="block">
                                <div className="glass-card hover:border-green-400/30 flex items-center justify-between p-4 bg-white/2">
                                    <div className="flex items-center space-x-3">
                                        <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full" />
                                        <div>
                                            <div className="font-bold text-white">{coin.name}</div>
                                            <div className="text-xs text-gray-400">{coin.symbol.toUpperCase()}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-white font-medium">${coin.current_price.toLocaleString()}</div>
                                        <div className="text-green-400 text-sm font-bold">+{coin.price_change_percentage_24h.toFixed(2)}%</div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                    <h2 className="text-2xl font-bold mb-6 flex items-center">
                        <TrendingDown className="mr-2 text-red-400" /> Top Losers
                    </h2>
                    <div className="space-y-4">
                        {actualLosers.map((coin, i) => (
                            <Link key={coin.id} to={`/coin/${coin.id}`} className="block">
                                <div className="glass-card hover:border-red-400/30 flex items-center justify-between p-4 bg-white/2">
                                    <div className="flex items-center space-x-3">
                                        <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full" />
                                        <div>
                                            <div className="font-bold text-white">{coin.name}</div>
                                            <div className="text-xs text-gray-400">{coin.symbol.toUpperCase()}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-white font-medium">${coin.current_price.toLocaleString()}</div>
                                        <div className="text-red-400 text-sm font-bold">{coin.price_change_percentage_24h.toFixed(2)}%</div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Home;
