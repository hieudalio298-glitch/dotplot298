import React from 'react';
import { Row, Col, Card } from 'antd';
import YieldCurveChart from './YieldCurveChart';

const BondMarketDashboard: React.FC = () => {
    return (
        <div className="p-4 bg-black min-h-screen text-[#e0e0e0]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#0a0a0a] border border-[#333] p-4">
                    <YieldCurveChart />
                </div>
                {/* Placeholders for other charts */}
                <div className="bg-[#0a0a0a] border border-[#333] p-4 flex items-center justify-center">
                    <span className="text-gray-600 font-mono text-xs uppercase">Interbank Rates (Coming Soon)</span>
                </div>
                <div className="bg-[#0a0a0a] border border-[#333] p-4 flex items-center justify-center">
                    <span className="text-gray-600 font-mono text-xs uppercase">Auction Results (Coming Soon)</span>
                </div>
                <div className="bg-[#0a0a0a] border border-[#333] p-4 flex items-center justify-center">
                    <span className="text-gray-600 font-mono text-xs uppercase">Market Summary (Coming Soon)</span>
                </div>
            </div>
        </div>
    );
};

export default BondMarketDashboard;
