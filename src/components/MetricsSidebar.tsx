import React, { useState, useEffect, useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { Input, Select, Segmented, Tabs } from 'antd';
import { Search, GripVertical, Building2, Landmark, Briefcase, PieChart, FileText, Activity, DollarSign } from 'lucide-react';
import { AVAILABLE_METRICS } from '../types';
import { VAS_INCOME_STRUCTURE, BANK_INCOME_STRUCTURE, SECURITIES_INCOME_STRUCTURE, INSURANCE_INCOME_STRUCTURE } from './VASIncomeStatement';
import { VAS_BALANCE_STRUCTURE, BANK_BALANCE_STRUCTURE, SECURITIES_BALANCE_STRUCTURE, INSURANCE_BALANCE_STRUCTURE } from './VASBalanceSheet';
import { VAS_CASHFLOW_STRUCTURE, BANK_CASHFLOW_STRUCTURE, SECURITIES_CASHFLOW_STRUCTURE, INSURANCE_CASHFLOW_STRUCTURE } from './VASCashFlow';

interface DraggableItemProps {
    id: string;
    label: string;
    isBold?: boolean;
    isAvailable?: boolean;
}

const DraggableItem: React.FC<DraggableItemProps> = ({ id, label, isBold, isAvailable }) => {
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
            className={`flex items-center space-x-2 p-2 mb-1 border border-[#333] transition-all rounded-none 
                ${transform ? 'shadow-[0_0_15px_rgba(255,152,0,0.5)] border-[#ff9800] bg-black' : 'bg-[#111]'} 
                ${isSubMetric ? 'ml-4 bg-[#0a0a0a]' : ''}
                ${isAvailable ? 'cursor-grab active:cursor-grabbing hover:border-[#ff9800]' : 'opacity-50 cursor-not-allowed border-dashed'}
            `}
        >
            <GripVertical size={10} className={`text-[#444] transition-colors ${isAvailable ? 'group-hover:text-[#ff9800]' : ''}`} />
            <span className={`text-[11px] font-mono truncate uppercase tracking-tight 
                ${isSubMetric ? 'text-[10px]' : ''}
                ${isAvailable ? 'text-[#aaa] group-hover:text-[#fff]' : 'text-[#555]'}
                ${isBold ? 'font-bold text-[#e0e0e0]' : ''}
            `}>
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
    const [industryType, setIndustryType] = useState<'vas' | 'bank' | 'securities' | 'insurance'>('vas');
    const [reportType, setReportType] = useState<'income' | 'balance' | 'cash' | 'ratios'>('income');

    React.useEffect(() => {
        const updateMetrics = () => {
            const wind = window as any;
            if (wind.dynamicMetrics && wind.dynamicMetrics.length > 0) {
                const dm = wind.dynamicMetrics;
                setDynamicMetrics(dm);
            } else {
                setDynamicMetrics([]);
            }

            // Explicit Industry Detection from Metadata
            if (wind.currentIndustry) {
                const ind = wind.currentIndustry.toLowerCase();
                if (ind.includes('ngân hàng')) {
                    setIndustryType('bank');
                } else if (ind.includes('dịch vụ tài chính') || ind.includes('chứng khoán')) {
                    setIndustryType('securities');
                } else if (ind.includes('bảo hiểm')) {
                    setIndustryType('insurance');
                } else {
                    setIndustryType('vas');
                }
            } else {
                // Fallback detection if metadata not yet available
                const dm = wind.dynamicMetrics || [];
                const dmStr = dm.join(' ').toLowerCase();
                if (dmStr.includes('thu nhập lãi thuần')) setIndustryType('bank');
                else if (dmStr.includes('doanh thu môi giới')) setIndustryType('securities');
                else if (dmStr.includes('phí bảo hiểm') || dmStr.includes('kinh doanh bảo hiểm')) setIndustryType('insurance');
            }
        };

        // Initial check
        updateMetrics();

        window.addEventListener('metricsUpdated', updateMetrics);
        return () => window.removeEventListener('metricsUpdated', updateMetrics);
    }, []);

    // Helper to get Ratio metrics (regex logic) remains same
    const ratioMetrics = useMemo(() => {
        const fullList = dynamicMetrics.length > 0
            ? Array.from(new Set([...AVAILABLE_METRICS, ...dynamicMetrics]))
            : AVAILABLE_METRICS;

        return fullList.filter(m =>
            ['P/E', 'P/B', 'ROE', 'ROA', 'EPS', 'Biên', 'ROIC', 'Thanh toán', 'Nợ', 'Vòng quay', 'Chu kỳ', 'Tăng trưởng', 'CCC', 'DSI', 'DSO', 'FAT'].some(key => m.includes(key))
        );
    }, [dynamicMetrics]);

    // Flatten structure to display items
    const getStructureItems = (structure: any[], usedKeys: Set<string>) => {
        let items: DraggableItemProps[] = [];
        const process = (list: any[]) => {
            list.forEach(item => {
                // Determine the best key to use
                let bestKey = item.name; // Default to name

                if (item.keys && item.keys.length > 0) {
                    // Try to find exact match in dynamic data
                    const match = item.keys.find((k: string) => dynamicMetrics.includes(k) || dynamicMetrics.some(dk => dk.toLowerCase() === k.toLowerCase()));
                    if (match) {
                        bestKey = dynamicMetrics.find((dk: string) => dk.toLowerCase() === match.toLowerCase()) || match;
                    } else {
                        // Fallback: Use the Vietnamese name to ensure consistency when dragging to chart
                        bestKey = item.name;
                    }
                }

                // Track used key if it exists in dynamicMetrics
                if (dynamicMetrics.includes(bestKey)) {
                    usedKeys.add(bestKey);
                }

                items.push({
                    id: bestKey,
                    label: item.name,
                    isBold: item.isBold,
                    isAvailable: true // Always available
                });

                if (item.children) process(item.children);
            });
        };
        process(structure);
        return items;
    };

    // Calculate display metrics based on selection
    const displayMetrics = useMemo(() => {
        if (reportType === 'ratios') {
            return ratioMetrics.map(m => ({ id: m, label: m, isAvailable: true, isBold: false }));
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
        } else if (industryType === 'insurance') {
            if (reportType === 'income') structure = INSURANCE_INCOME_STRUCTURE;
            else if (reportType === 'balance') structure = INSURANCE_BALANCE_STRUCTURE;
            else structure = INSURANCE_CASHFLOW_STRUCTURE;
        } else { // VAS
            if (reportType === 'income') structure = VAS_INCOME_STRUCTURE;
            else if (reportType === 'balance') structure = VAS_BALANCE_STRUCTURE;
            else structure = VAS_CASHFLOW_STRUCTURE;
        }

        const usedKeys = new Set<string>();
        const structuredItems = getStructureItems(structure, usedKeys);

        // Find Unmapped Metrics (Dynamic) with strict filtering
        // We filter out keys that are already used OR are likely metadata/garbage
        const unmapped = dynamicMetrics.filter(m =>
            !usedKeys.has(m) &&
            !['id', 'symbol', 'period_type', 'updated_at', 'created_at', 'report_period'].includes(m) &&
            !m.startsWith('_') // metrics starting with _ are usually hidden/intermediate
        );

        const unmappedItems = unmapped.map(m => ({
            id: m,
            label: m, // Show raw key name
            isBold: false,
            isAvailable: true
        }));

        if (unmappedItems.length > 0) {
            // Add a separator
            structuredItems.push({
                id: 'SEP_OTHERS',
                label: '--- OTHER METRICS ---',
                isBold: true,
                isAvailable: false
            });
            return [...structuredItems, ...unmappedItems];
        }

        return structuredItems;
    }, [reportType, industryType, dynamicMetrics, ratioMetrics]);

    const filteredAndSearched = useMemo(() => {
        return displayMetrics.filter(m => m.label.toLowerCase().includes(search.toLowerCase()));
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
                    { value: 'insurance', label: <span className="flex items-center gap-2"><Building2 size={14} /> BẢO HIỂM</span> },
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
                    { value: 'cash', icon: <DollarSign size={14} />, label: 'LCTT' },
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
                                <DraggableItem key={m.id} id={m.id} label={m.label} isBold={m.isBold} isAvailable={m.isAvailable} />
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
