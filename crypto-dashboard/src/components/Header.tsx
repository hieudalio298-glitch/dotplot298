import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Wallet, Moon, Sun, TrendingUp, BarChart2, Briefcase, Home } from 'lucide-react';
import { useAppStore } from '../store';

const NavLink = ({ to, children, icon: Icon }: { to: string; children: React.ReactNode, icon: any }) => {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <Link
            to={to}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 ${isActive
                    ? 'text-neon-cyan bg-white/10 shadow-neon-cyan/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
        >
            <Icon size={18} />
            <span className="font-medium">{children}</span>
        </Link>
    );
};

const Header = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { isDarkMode, toggleDarkMode, walletAddress, connectWallet, disconnectWallet } = useAppStore();

    return (
        <header className="fixed top-0 left-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-white/10">
            <div className="container mx-auto px-4 h-20 flex items-center justify-between">
                <Link to="/" className="flex items-center space-x-2 group">
                    <div className="w-10 h-10 bg-neon-gradient rounded-xl flex items-center justify-center group-hover:shadow-neon-purple transition-all duration-300">
                        <TrendingUp className="text-white" />
                    </div>
                    <span className="text-2xl font-black bg-clip-text text-transparent bg-neon-gradient tracking-tighter">
                        NEONX
                    </span>
                </Link>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center space-x-2">
                    <NavLink to="/" icon={Home}>Home</NavLink>
                    <NavLink to="/markets" icon={BarChart2}>Markets</NavLink>
                    <NavLink to="/portfolio" icon={Briefcase}>Portfolio</NavLink>
                </nav>

                <div className="hidden md:flex items-center space-x-4">
                    <button
                        onClick={toggleDarkMode}
                        className="p-2 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-neon-cyan hover:border-neon-cyan transition-all"
                    >
                        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>

                    <button
                        onClick={walletAddress ? disconnectWallet : connectWallet}
                        className="flex items-center space-x-2 px-6 py-2 rounded-full bg-neon-gradient font-bold text-white hover:opacity-90 transition-all shadow-neon-purple/20 hover:shadow-neon-purple"
                    >
                        <Wallet size={18} />
                        <span>{walletAddress ? walletAddress : 'Connect Wallet'}</span>
                    </button>
                </div>

                {/* Mobile Toggle */}
                <button onClick={() => setIsOpen(!isOpen)} className="md:hidden text-white">
                    {isOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Nav */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="md:hidden bg-background border-b border-white/10 overflow-hidden"
                    >
                        <div className="flex flex-col space-y-4 p-4">
                            <NavLink to="/" icon={Home}>Home</NavLink>
                            <NavLink to="/markets" icon={BarChart2}>Markets</NavLink>
                            <NavLink to="/portfolio" icon={Briefcase}>Portfolio</NavLink>
                            <div className="pt-4 flex justify-between items-center border-t border-white/10">
                                <button
                                    onClick={toggleDarkMode}
                                    className="p-2 rounded-full bg-white/5 border border-white/10 text-gray-400"
                                >
                                    {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                                </button>
                                <button
                                    onClick={walletAddress ? disconnectWallet : connectWallet}
                                    className="flex items-center space-x-2 px-6 py-2 rounded-full bg-neon-gradient font-bold text-white"
                                >
                                    <Wallet size={18} />
                                    <span>{walletAddress ? walletAddress : 'Connect'}</span>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
};

export default Header;
