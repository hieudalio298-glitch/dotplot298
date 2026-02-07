import React from 'react';
import { motion } from 'framer-motion';

interface MetricCardProps {
    title: string;
    value: string | number;
    change?: number;
    icon: React.ReactNode;
    delay?: number;
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, icon, delay = 0 }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5 }}
            className="glass-card flex flex-col justify-between"
        >
            <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-neon-cyan/10 rounded-xl text-neon-cyan">
                    {icon}
                </div>
                {change !== undefined && (
                    <span className={`text-sm font-bold ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                    </span>
                )}
            </div>
            <div>
                <h3 className="text-gray-400 text-sm font-medium mb-1">{title}</h3>
                <p className="text-2xl font-bold tracking-tight text-white">{value}</p>
            </div>
            <div className="absolute -bottom-1 -right-1 w-20 h-20 bg-neon-cyan/5 rounded-full blur-2xl -z-10 group-hover:bg-neon-cyan/10 transition-all"></div>
        </motion.div>
    );
};
