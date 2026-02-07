import React, { useEffect, useState } from 'react';
import { Search, ChevronUp, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useCrypto } from '../hooks/useCrypto';
import { Coin } from '../types';

const Markets = () => {
    const { getTopCoins, loading } = useCrypto();
    const [coins, setCoins] = useState<Coin[]>([]);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetchCoins = async () => {
            const data = await getTopCoins(100);
            setCoins(data);
        };
        fetchCoins();
    }, []);

    const filteredCoins = coins.filter(coin =>
        coin.name.toLowerCase().includes(search.toLowerCase()) ||
        coin.symbol.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <h1 className="text-4xl font-black neon-text-cyan">MARKET OVERVIEW</h1>
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                    <input
                        type="text"
                        placeholder="Search coins (BTC, ETH, etc)"
                        className="w-full bg-white/5 border border-white/10 rounded-full py-3 pl-12 pr-4 text-white focus:outline-none focus:border-neon-cyan transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="glass-card p-0 overflow-hidden border-white/5">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 text-gray-400 text-sm">
                                <th className="px-6 py-5 font-medium">#</th>
                                <th className="px-6 py-5 font-medium">Name</th>
                                <th className="px-6 py-5 font-medium">Price</th>
                                <th className="px-6 py-5 font-medium">24h Change</th>
                                <th className="px-6 py-5 font-medium hidden lg:table-cell">Market Cap</th>
                                <th className="px-6 py-5 font-medium hidden xl:table-cell">Volume (24h)</th>
                                <th className="px-6 py-5 font-medium">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-10 text-center text-gray-400">Loading market data...</td>
                                </tr>
                            ) : filteredCoins.map((coin) => (
                                <motion.tr
                                    key={coin.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="hover:bg-white/5 transition-colors group"
                                >
                                    <td className="px-6 py-5 text-gray-500 font-bold">{coin.market_cap_rank}</td>
                                    <td className="px-6 py-5">
                                        <Link to={`/coin/${coin.id}`} className="flex items-center space-x-3">
                                            <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full" />
                                            <div>
                                                <div className="font-bold text-white group-hover:text-neon-cyan transition-colors">{coin.name}</div>
                                                <div className="text-xs text-gray-500">{coin.symbol.toUpperCase()}</div>
                                            </div>
                                        </Link>
                                    </td>
                                    <td className="px-6 py-5 font-medium text-white">${coin.current_price.toLocaleString()}</td>
                                    <td className={`px-6 py-5 font-bold ${coin.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        <div className="flex items-center">
                                            {coin.price_change_percentage_24h >= 0 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-gray-400 hidden lg:table-cell">${coin.market_cap.toLocaleString()}</td>
                                    <td className="px-6 py-5 text-gray-400 hidden xl:table-cell">${coin.total_volume.toLocaleString()}</td>
                                    <td className="px-6 py-5">
                                        <Link to={`/coin/${coin.id}`} className="text-xs font-bold uppercase tracking-wider text-neon-purple hover:text-neon-cyan transition-colors">Details</Link>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Markets;
