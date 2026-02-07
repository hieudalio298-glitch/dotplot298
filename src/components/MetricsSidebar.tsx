import React, { useState, useEffect, useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { Input, Select, Segmented, Tabs } from 'antd';
import { Search, GripVertical, Building2, Landmark, Briefcase, PieChart, FileText, Activity, DollarSign } from 'lucide-react';
import { AVAILABLE_METRICS } from '../types';
import { VAS_INCOME_STRUCTURE, BANK_INCOME_STRUCTURE, SECURITIES_INCOME_STRUCTURE } from './VASIncomeStatement';
import { VAS_BALANCE_STRUCTURE, BANK_BALANCE_STRUCTURE, SECURITIES_BALANCE_STRUCTURE } from './VASBalanceSheet';
import { VAS_CASHFLOW_STRUCTURE, BANK_CASHFLOW_STRUCTURE, SECURITIES_CASHFLOW_STRUCTURE } from './VASCashFlow';

interface DraggableItemProps {
    id: string;
    label: string;
}

const DraggableItem: React.FC<DraggableItemProps> = ({ id, label }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: id,
        data: { label }
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 999,
    } : {};

    const isSubMetric = /^([0-9]+\.|[IVXLCDM]+\.|-)\s+/.test(label);

    return (
        <motion.div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            whileHover={{ x: 2 }}
            className={`flex items-center space-x-2 p-2 mb-1 bg-[#111] border border-[#333] cursor-grab active:cursor-grabbing hover:border-[#ff9800] group transition-all rounded-none ${transform ? 'shadow-[0_0_15px_rgba(255,152,0,0.5)] border-[#ff9800] bg-black' : ''} ${isSubMetric ? 'ml-4 bg-[#0a0a0a]' : ''}`}
        >
            <GripVertical size={10} className="text-[#444] group-hover:text-[#ff9800] transition-colors" />
            <span className={`text-[11px] font-mono text-[#aaa] group-hover:text-[#fff] truncate uppercase tracking-tight ${isSubMetric ? 'text-[10px]' : ''}`}>
                {label.length > 35 ? label.substring(0, 33) + '...' : label}
            </span>
        </motion.div>
    );
};

const getAllKeys = (structure: any[]): string[] => {
    let keys: string[] = [];
    structure.forEach(item => {
        if (item.keys) keys.push(...item.keys);
        if (item.children) keys.push(...getAllKeys(item.children));
    });
    return keys;
};

const MetricsSidebar: React.FC = () => {
    const [search, setSearch] = useState('');
    const [dynamicMetrics, setDynamicMetrics] = useState<string[]>([]);

    // UI State
    const [industryType, setIndustryType] = useState<'vas' | 'bank' | 'securities'>('vas');
    const [reportType, setReportType] = useState<'income' | 'balance' | 'cash' | 'ratios'>('income');

    React.useEffect(() => {
        const updateMetrics = () => {
            const wind = window as any;
            if (wind.dynamicMetrics && wind.dynamicMetrics.length > 0) {
                const dm = wind.dynamicMetrics;
                setDynamicMetrics(dm);

                // Auto-detect Industry
                const dmStr = dm.join(' ').toLowerCase();
                if (dmStr.includes('thu nhập lãi thuần') || dmStr.includes('tiền gửi của khách hàng') || dmStr.includes('cho vay khách hàng')) {
                    setIndustryType('bank');
                } else if (dmStr.includes('doanh thu môi giới') || dmStr.includes('tự doanh') || dmStr.includes('fvtpl')) {
                    setIndustryType('securities');
                } else {
                    setIndustryType('vas');
                }
            } else {
                setDynamicMetrics([]);
            }
        };

        // Initial check
        updateMetrics();

        window.addEventListener('metricsUpdated', updateMetrics);
        return () => window.removeEventListener('metricsUpdated', updateMetrics);
    }, []);

    // Helper to get Ratio metrics (regex logic)
    const ratioMetrics = useMemo(() => {
        const fullList = dynamicMetrics.length > 0
            ? Array.from(new Set([...AVAILABLE_METRICS, ...dynamicMetrics]))
            : AVAILABLE_METRICS;

        return fullList.filter(m =>
            ['P/E', 'P/B', 'ROE', 'ROA', 'EPS', 'Biên', 'ROIC', 'Thanh toán', 'Nợ', 'Vòng quay', 'Chu kỳ', 'Tăng trưởng', 'CCC', 'DSI', 'DSO', 'FAT'].some(key => m.includes(key))
        );
    }, [dynamicMetrics]);

    // Calculate display metrics based on selection
    const displayMetrics = useMemo(() => {
        if (reportType === 'ratios') {
            return ratioMetrics;
        }

        let structure: any[] = [];
        if (industryType === 'bank') {
            if (reportType === 'income') structure = BANK_INCOME_STRUCTURE;
            else if (reportType === 'balance') structure = BANK_BALANCE_STRUCTURE;
            else structure = BANK_CASHFLOW_STRUCTURE;
        } else if (industryType === 'securities') {
            if (reportType === 'income') structure = SECURITIES_INCOME_STRUCTURE;
            else if (reportType === 'balance') structure = SECURITIES_BALANCE_STRUCTURE;
            else structure = SECURITIES_CASHFLOW_STRUCTURE;
        } else { // VAS
            if (reportType === 'income') structure = VAS_INCOME_STRUCTURE;
            else if (reportType === 'balance') structure = VAS_BALANCE_STRUCTURE;
            else structure = VAS_CASHFLOW_STRUCTURE;
        }

        const validKeys = getAllKeys(structure);

        // Filter dynamic metrics that match the structure keys
        // We use loose matching because DB keys might be slightly different or structure keys might be aliases
        // Priority: exact match in dynamicMetrics
        const matched = dynamicMetrics.filter(dm =>
            validKeys.includes(dm) || validKeys.some(vk => dm.toLowerCase() === vk.toLowerCase())
        );

        // If no dynamic metrics found (e.g. initial load or no data), use structure keys directly as fallback suggestions?
        // No, only show what's available.
        // However, if matched is empty but dynamicMetrics has specific items not in structure, maybe show them in 'Others'?
        // For now, adhere to structure.

        // Also combine with ratioMetrics removal if any slipped in?
        // ratioMetrics are separate.

        return matched;
    }, [reportType, industryType, dynamicMetrics, ratioMetrics]);

    const filteredAndSearched = useMemo(() => {
        return displayMetrics.filter(m => m.toLowerCase().includes(search.toLowerCase()));
    }, [displayMetrics, search]);

    return (
        <div className="flex flex-col h-full gap-2 bg-black p-2 border-r border-[#333]">
            {/* Industry Selector */}
            <Select
                value={industryType}
                onChange={setIndustryType}
                className="w-full"
                options={[
                    { value: 'vas', label: <span className="flex items-center gap-2"><Building2 size={14} /> SẢN XUẤT - TM</span> },
                    { value: 'bank', label: <span className="flex items-center gap-2"><Landmark size={14} /> NGÂN HÀNG</span> },
                    { value: 'securities', label: <span className="flex items-center gap-2"><Briefcase size={14} /> CHỨNG KHOÁN</span> },
                ]}
                popupMatchSelectWidth={false}
                style={{ fontFamily: 'monospace' }}
            />

            {/* Report Type Tabs */}
            <Segmented
                value={reportType}
                onChange={(val) => setReportType(val as any)}
                options={[
                    { value: 'income', icon: <FileText size={14} />, label: 'KQKD' },
                    { value: 'balance', icon: <PieChart size={14} />, label: 'CĐKT' },
                    { value: 'cash', icon: <DollarSign size={14} />, label: 'LCTT' }, // DollarSign not imported, use PieChart or something else? I imported DollarSign above? No I imported Building2... wait.
                    // Correcting imports in my head: I imported Building2, Landmark, Briefcase, PieChart, FileText, Activity.
                    // Let's use available icons.
                    { value: 'ratios', icon: <Activity size={14} />, label: 'CHỈ SỐ' },
                ]}
                block
                className="bg-[#111] text-[#aaa] metrics-segmented"
                size="small"
            />

            <Input
                placeholder="SEARCH..."
                prefix={<Search size={12} className="text-[#ff9800]" />}
                className="bg-[#0a0a0a] border-[#333] text-[#e0e0e0] hover:border-[#ff9800] focus:border-[#ff9800] rounded-none font-mono text-xs h-8 placeholder:text-[#444] uppercase"
                value={search}
                onChange={e => setSearch(e.target.value)}
                allowClear
            />

            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-1">
                <AnimatePresence mode="popLayout">
                    {filteredAndSearched.length > 0 ? (
                        <motion.div
                            key={`${industryType}-${reportType}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="text-[10px] font-bold text-[#666] uppercase tracking-widest mb-2 px-1 flex items-center gap-2 font-mono mt-2">
                                <div className={`w-1 h-3 ${reportType === 'ratios' ? 'bg-[#ff9800]' : 'bg-[#1677ff]'}`} />
                                {reportType === 'ratios' ? 'KEY RATIOS' :
                                    reportType === 'income' ? 'INCOME STATEMENT' :
                                        reportType === 'balance' ? 'BALANCE SHEET' : 'CASH FLOW'}
                            </div>

                            {filteredAndSearched.map(m => (
                                <DraggableItem key={m} id={m} label={m} />
                            ))}
                        </motion.div>
                    ) : (
                        <div className="text-center py-10 text-[#444] text-[10px] font-mono uppercase">
                            NO METRICS FOUND
                        </div>
                    )}
                </AnimatePresence>
            </div>

            <style>{`
                .metrics-segmented .ant-segmented-item {
                    color: #666;
                }
                .metrics-segmented .ant-segmented-item-selected {
                    background-color: #333 !important;
                    color: #ff9800 !important;
                }
                .metrics-segmented .ant-segmented-item:hover {
                    color: #ccc;
                }
            `}</style>
        </div>
    );
};

export default MetricsSidebar;
