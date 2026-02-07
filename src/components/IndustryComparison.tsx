import React, { useEffect, useState, useMemo } from 'react';
import { Card, Select, Button, Table, Empty, Spin, Input, Modal, Tooltip, Space, Dropdown, Statistic, Tag, Popover, Checkbox, Divider } from 'antd';
import { Plus, Trash2, Save, FolderOpen, BarChart3, LineChart, TrendingUp, Search, RefreshCw, Settings, Eye, EyeOff, Download, Layers, Activity } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { supabase } from '../supabaseClient';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface StockSymbol {
    symbol: string;
    company_name: string;
    icb_name2?: string;
}

interface Watchlist {
    id: string;
    name: string;
    symbols: string[];
}

interface FinancialData {
    symbol: string;
    period: string;
    [key: string]: any;
}

// ==================== COMPREHENSIVE FINANCIAL METRICS ====================
const METRIC_CATEGORIES = {
    // Key Ratios
    RATIOS: {
        name: '📊 CHỈ SỐ TÀI CHÍNH',
        color: '#ff9800',
        metrics: [
            { key: 'ROE (%)', label: 'ROE (%)' },
            { key: 'ROA (%)', label: 'ROA (%)' },
            { key: 'ROIC (%)', label: 'ROIC (%)' },
            { key: 'P/E', label: 'P/E' },
            { key: 'P/B', label: 'P/B' },
            { key: 'P/S', label: 'P/S' },
            { key: 'EV/EBITDA', label: 'EV/EBITDA' },
            { key: 'EPS', label: 'EPS' },
            { key: 'BVPS', label: 'BVPS' },
            { key: 'Biên lợi nhuận gộp (%)', label: 'Gross Margin (%)' },
            { key: 'Biên lợi nhuận ròng (%)', label: 'Net Margin (%)' },
            { key: 'Biên EBITDA (%)', label: 'EBITDA Margin (%)' },
        ]
    },
    // Income Statement
    INCOME: {
        name: '📈 BÁO CÁO THU NHẬP',
        color: '#00e676',
        metrics: [
            { key: 'Doanh thu thuần', label: 'Doanh thu thuần' },
            { key: 'Giá vốn hàng bán', label: 'Giá vốn hàng bán' },
            { key: 'Lợi nhuận gộp', label: 'Lợi nhuận gộp' },
            { key: 'Chi phí bán hàng', label: 'Chi phí bán hàng' },
            { key: 'Chi phí quản lý doanh nghiệp', label: 'Chi phí QLDN' },
            { key: 'Chi phí tài chính', label: 'Chi phí tài chính' },
            { key: 'Lợi nhuận thuần từ hoạt động kinh doanh', label: 'LNTT từ HĐKD' },
            { key: 'Lợi nhuận trước thuế', label: 'Lợi nhuận trước thuế' },
            { key: 'Lợi nhuận sau thuế', label: 'Lợi nhuận sau thuế' },
            { key: 'EBITDA', label: 'EBITDA' },
        ]
    },
    // Balance Sheet - Assets
    BALANCE_ASSETS: {
        name: '💰 TÀI SẢN',
        color: '#2196f3',
        metrics: [
            { key: 'Tổng tài sản', label: 'Tổng tài sản' },
            { key: 'Tài sản ngắn hạn', label: 'Tài sản ngắn hạn' },
            { key: 'Tiền và tương đương tiền', label: 'Tiền mặt' },
            { key: 'Đầu tư tài chính ngắn hạn', label: 'ĐTTC ngắn hạn' },
            { key: 'Các khoản phải thu ngắn hạn', label: 'Phải thu ngắn hạn' },
            { key: 'Hàng tồn kho', label: 'Hàng tồn kho' },
            { key: 'Tài sản dài hạn', label: 'Tài sản dài hạn' },
            { key: 'Tài sản cố định', label: 'Tài sản cố định' },
            { key: 'Bất động sản đầu tư', label: 'BĐS đầu tư' },
            { key: 'Lợi thế thương mại', label: 'Goodwill' },
        ]
    },
    // Balance Sheet - Liabilities & Equity
    BALANCE_LIAB: {
        name: '📋 NỢ & VỐN CSH',
        color: '#e91e63',
        metrics: [
            { key: 'Tổng nợ phải trả', label: 'Tổng nợ phải trả' },
            { key: 'Nợ ngắn hạn', label: 'Nợ ngắn hạn' },
            { key: 'Nợ dài hạn', label: 'Nợ dài hạn' },
            { key: 'Vay ngắn hạn', label: 'Vay ngắn hạn' },
            { key: 'Vay dài hạn', label: 'Vay dài hạn' },
            { key: 'Vốn chủ sở hữu', label: 'Vốn CSH' },
            { key: 'Vốn điều lệ', label: 'Vốn điều lệ' },
            { key: 'Lợi nhuận chưa phân phối', label: 'LNCPP' },
            { key: 'Tỷ lệ nợ/vốn CSH', label: 'D/E Ratio' },
        ]
    },
    // Cash Flow
    CASHFLOW: {
        name: '💵 LƯU CHUYỂN TIỀN',
        color: '#9c27b0',
        metrics: [
            { key: 'Lưu chuyển tiền thuần từ hoạt động kinh doanh', label: 'CF từ HĐKD' },
            { key: 'Lưu chuyển tiền thuần từ hoạt động đầu tư', label: 'CF từ HĐĐT' },
            { key: 'Lưu chuyển tiền thuần từ hoạt động tài chính', label: 'CF từ HĐTC' },
            { key: 'Lưu chuyển tiền thuần trong kỳ', label: 'CF thuần trong kỳ' },
            { key: 'Tiền và tương đương tiền đầu kỳ', label: 'Tiền đầu kỳ' },
            { key: 'Tiền và tương đương tiền cuối kỳ', label: 'Tiền cuối kỳ' },
            { key: 'Khấu hao tài sản cố định', label: 'Khấu hao TSCĐ' },
            { key: 'Chi đầu tư TSCĐ', label: 'CAPEX' },
            { key: 'Free Cash Flow', label: 'Free Cash Flow' },
        ]
    },
    // Efficiency & Liquidity
    EFFICIENCY: {
        name: '⚡ HIỆU QUẢ & THANH KHOẢN',
        color: '#00bcd4',
        metrics: [
            { key: 'Thanh toán hiện hành (Current Ratio)', label: 'Current Ratio' },
            { key: 'Thanh toán nhanh (Quick Ratio)', label: 'Quick Ratio' },
            { key: 'Vòng quay hàng tồn kho (lần)', label: 'Vòng quay HTK' },
            { key: 'Số ngày tồn kho (DSI)', label: 'Số ngày tồn kho' },
            { key: 'Vòng quay khoản phải thu (lần)', label: 'Vòng quay phải thu' },
            { key: 'Số ngày thu tiền (DSO)', label: 'Số ngày thu tiền' },
            { key: 'Vòng quay tổng tài sản', label: 'Vòng quay tài sản' },
            { key: 'Vòng quay vốn CSH', label: 'Vòng quay vốn CSH' },
        ]
    },
    // Growth
    GROWTH: {
        name: '📈 TĂNG TRƯỞNG',
        color: '#8bc34a',
        metrics: [
            { key: 'Tăng trưởng doanh thu (%)', label: 'Tăng trưởng DT (%)' },
            { key: 'Tăng trưởng LNST (%)', label: 'Tăng trưởng LNST (%)' },
            { key: 'Tăng trưởng EPS (%)', label: 'Tăng trưởng EPS (%)' },
            { key: 'Tăng trưởng tổng tài sản (%)', label: 'Tăng trưởng TS (%)' },
            { key: 'Tăng trưởng vốn CSH (%)', label: 'Tăng trưởng vốn (%)' },
        ]
    }
};

// Flatten for backward compatibility
const COMPARISON_METRICS = Object.values(METRIC_CATEGORIES).flatMap(cat =>
    cat.metrics.map(m => ({ ...m, category: cat.name, color: cat.color }))
);

const CHART_COLORS = ['#ff9800', '#00e676', '#2196f3', '#e91e63', '#9c27b0', '#00bcd4', '#ff5722', '#8bc34a'];

interface Props {
    user: SupabaseUser | null;
}

const IndustryComparison: React.FC<Props> = ({ user }) => {
    // State
    const [loading, setLoading] = useState(false);
    const [allSymbols, setAllSymbols] = useState<StockSymbol[]>([]);
    const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
    const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
    const [currentWatchlistId, setCurrentWatchlistId] = useState<string | null>(null);
    const [watchlistName, setWatchlistName] = useState('');
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showLoadModal, setShowLoadModal] = useState(false);

    const [financialData, setFinancialData] = useState<Record<string, FinancialData[]>>({});
    const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['ROE (%)', 'P/E', 'Biên lợi nhuận ròng (%)']);
    const [period, setPeriod] = useState<'year' | 'quarter'>('year');
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear() - 1);

    const [chartMetric, setChartMetric] = useState<string>('ROE (%)');
    const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
    const [searchSymbol, setSearchSymbol] = useState('');

    // Fetch all symbols
    useEffect(() => {
        const fetchSymbols = async () => {
            const { data } = await supabase
                .from('stock_symbols')
                .select('symbol, company_name, icb_name2')
                .order('symbol');
            if (data) setAllSymbols(data);
        };
        fetchSymbols();
    }, []);

    // Fetch watchlists
    useEffect(() => {
        if (user) loadWatchlists();
    }, [user]);

    // Fetch financial data when symbols change
    useEffect(() => {
        if (selectedSymbols.length > 0) {
            fetchFinancialData();
        }
    }, [selectedSymbols, period]);

    const loadWatchlists = async () => {
        if (!user) return;
        const { data } = await supabase
            .from('user_watchlists')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false });
        if (data) setWatchlists(data);
    };

    const fetchFinancialData = async () => {
        if (selectedSymbols.length === 0) return;
        setLoading(true);

        try {
            const results: Record<string, FinancialData[]> = {};

            for (const symbol of selectedSymbols) {
                const [stmRes, ratioRes] = await Promise.all([
                    supabase.from('financial_statements').select('data').eq('symbol', symbol).eq('period_type', period),
                    supabase.from('financial_ratios').select('data').eq('symbol', symbol).eq('period_type', period)
                ]);

                let merged: any[] = [];
                const addToMerged = (response: any) => {
                    if (response.data) {
                        response.data.forEach((row: any) => {
                            const innerData = Array.isArray(row.data) ? row.data : [row.data];
                            merged = [...merged, ...innerData];
                        });
                    }
                };

                addToMerged(stmRes);
                addToMerged(ratioRes);

                // Dedupe by year/quarter
                const dataMap = new Map();
                merged.forEach(record => {
                    const key = `${record.Năm || record.year}-${record.Quý || record.quarter || 0}`;
                    const existing = dataMap.get(key) || {};
                    dataMap.set(key, { ...existing, ...record });
                });

                results[symbol] = Array.from(dataMap.values()).map(d => ({
                    symbol,
                    period: period === 'year' ? `${d.Năm || d.year}` : `Q${d.Quý || d.quarter}/${d.Năm || d.year}`,
                    year: parseInt(d.Năm || d.year || 0),
                    quarter: parseInt(d.Quý || d.quarter || 0),
                    ...d
                })).sort((a, b) => b.year - a.year || b.quarter - a.quarter);
            }

            setFinancialData(results);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const addSymbol = (symbol: string) => {
        if (!selectedSymbols.includes(symbol)) {
            setSelectedSymbols([...selectedSymbols, symbol]);
        }
    };

    const removeSymbol = (symbol: string) => {
        setSelectedSymbols(selectedSymbols.filter(s => s !== symbol));
    };

    const saveWatchlist = async () => {
        if (!user || !watchlistName.trim()) return;

        try {
            const watchlistData = {
                user_id: user.id,
                name: watchlistName,
                symbols: selectedSymbols,
                updated_at: new Date().toISOString()
            };

            if (currentWatchlistId) {
                await supabase.from('user_watchlists').update(watchlistData).eq('id', currentWatchlistId);
            } else {
                const { data } = await supabase.from('user_watchlists').insert(watchlistData).select().single();
                if (data) setCurrentWatchlistId(data.id);
            }

            setShowSaveModal(false);
            loadWatchlists();
        } catch (e) {
            console.error(e);
        }
    };

    const loadWatchlist = (watchlist: Watchlist) => {
        setSelectedSymbols(watchlist.symbols);
        setCurrentWatchlistId(watchlist.id);
        setWatchlistName(watchlist.name);
        setShowLoadModal(false);
    };

    const deleteWatchlist = async (id: string) => {
        await supabase.from('user_watchlists').delete().eq('id', id);
        loadWatchlists();
    };

    // Get comparison data for selected year
    const comparisonData = useMemo(() => {
        if (Object.keys(financialData).length === 0) return [];

        return selectedSymbols.map(symbol => {
            const data = financialData[symbol] || [];
            const yearData = data.find(d => d.year === selectedYear) || {};

            const row: any = { symbol };
            selectedMetrics.forEach(metric => {
                const val = (yearData as Record<string, any>)[metric];
                row[metric] = typeof val === 'number' ? val : parseFloat(val) || 0;
            });
            return row;
        });
    }, [financialData, selectedSymbols, selectedMetrics, selectedYear]);

    // Statistics
    const statistics = useMemo(() => {
        const stats: Record<string, { sum: number; avg: number; median: number; min: number; max: number }> = {};

        selectedMetrics.forEach(metric => {
            const values = comparisonData.map(d => d[metric]).filter(v => !isNaN(v) && v !== 0);
            if (values.length === 0) {
                stats[metric] = { sum: 0, avg: 0, median: 0, min: 0, max: 0 };
                return;
            }

            const sorted = [...values].sort((a, b) => a - b);
            const sum = values.reduce((a, b) => a + b, 0);
            const avg = sum / values.length;
            const median = sorted.length % 2 === 0
                ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
                : sorted[Math.floor(sorted.length / 2)];

            stats[metric] = {
                sum,
                avg,
                median,
                min: Math.min(...values),
                max: Math.max(...values)
            };
        });

        return stats;
    }, [comparisonData, selectedMetrics]);

    // Chart options
    const chartOptions = useMemo(() => {
        const chartData = comparisonData.map(d => ({
            name: d.symbol,
            value: d[chartMetric] || 0
        })).filter(d => d.value !== 0);

        return {
            tooltip: {
                trigger: 'axis',
                backgroundColor: '#1a1a1a',
                borderColor: '#333',
                textStyle: { color: '#e0e0e0' }
            },
            legend: {
                show: false
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '10%',
                top: '10%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: chartData.map(d => d.name),
                axisLabel: { color: '#888', rotate: 45 },
                axisLine: { lineStyle: { color: '#333' } }
            },
            yAxis: {
                type: 'value',
                axisLabel: { color: '#888' },
                splitLine: { lineStyle: { color: '#222' } },
                axisLine: { lineStyle: { color: '#333' } }
            },
            series: [{
                name: chartMetric,
                type: chartType,
                data: chartData.map((d, i) => ({
                    value: d.value,
                    itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] }
                })),
                barWidth: '60%',
                smooth: true
            }]
        };
    }, [comparisonData, chartMetric, chartType]);

    // Table columns
    const tableColumns = useMemo(() => {
        const cols: any[] = [
            {
                title: <span className="text-[10px] text-gray-500">MÃ</span>,
                dataIndex: 'symbol',
                key: 'symbol',
                fixed: 'left',
                width: 80,
                render: (text: string) => (
                    <div className="flex items-center justify-between">
                        <span className="font-bold text-[#ff9800]">{text}</span>
                        <Trash2
                            size={12}
                            className="cursor-pointer text-gray-600 hover:text-red-500 transition-colors"
                            onClick={() => removeSymbol(text)}
                        />
                    </div>
                )
            }
        ];

        selectedMetrics.forEach(metric => {
            cols.push({
                title: <span className="text-[10px] text-gray-500">{metric}</span>,
                dataIndex: metric,
                key: metric,
                width: 120,
                align: 'right',
                render: (val: number) => (
                    <span className={`font-mono text-xs ${val > 0 ? 'text-green-400' : val < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                        {val?.toFixed(2) || '-'}
                    </span>
                )
            });
        });

        return cols;
    }, [selectedMetrics, selectedSymbols]);

    // Available years
    const availableYears = useMemo(() => {
        const years = new Set<number>();
        Object.values(financialData).forEach(data => {
            data.forEach(d => years.add(d.year));
        });
        return Array.from(years).sort((a, b) => b - a);
    }, [financialData]);

    const filteredSymbols = allSymbols.filter(s =>
        s.symbol.toLowerCase().includes(searchSymbol.toLowerCase()) ||
        s.company_name?.toLowerCase().includes(searchSymbol.toLowerCase())
    );

    return (
        <div className="flex gap-4 h-[calc(100vh-180px)]">
            {/* LEFT PANEL - DATA */}
            <div className="w-1/2 flex flex-col gap-4">
                <Card
                    className="border-none bg-[#0b0e11] shadow-2xl flex-1 overflow-hidden"
                    title={
                        <div className="flex justify-between items-center">
                            <Space>
                                <Activity size={16} className="text-[#ff9800]" />
                                <span className="text-[#e0e0e0] font-mono font-bold">SO SÁNH DỮ LIỆU</span>
                            </Space>
                            <Space>
                                <Button size="small" icon={<FolderOpen size={12} />} onClick={() => setShowLoadModal(true)} className="bg-transparent border-[#ff9800] text-[#ff9800]">Load</Button>
                                <Button size="small" icon={<Save size={12} />} onClick={() => setShowSaveModal(true)} className="bg-transparent border-[#1677ff] text-[#1677ff]">Save</Button>
                            </Space>
                        </div>
                    }
                >
                    {/* Symbol Selector */}
                    <div className="mb-4 flex gap-2">
                        <Select
                            showSearch
                            placeholder="Thêm mã chứng khoán..."
                            className="flex-1"
                            filterOption={false}
                            onSearch={setSearchSymbol}
                            onSelect={(val) => { if (val) { addSymbol(val); setSearchSymbol(''); } }}
                            value={undefined}
                            options={filteredSymbols.slice(0, 50).map(s => ({
                                value: s.symbol,
                                label: <span><b>{s.symbol}</b> - {s.company_name?.slice(0, 30)}</span>
                            }))}
                            notFoundContent={<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không tìm thấy" />}
                        />

                        <Select value={period} onChange={setPeriod} style={{ width: 100 }}>
                            <Select.Option value="year">Năm</Select.Option>
                            <Select.Option value="quarter">Quý</Select.Option>
                        </Select>

                        <Select value={selectedYear} onChange={setSelectedYear} style={{ width: 80 }}>
                            {availableYears.map(y => <Select.Option key={y} value={y}>{y}</Select.Option>)}
                        </Select>
                    </div>

                    {/* Selected Symbols Tags */}
                    <div className="mb-4 flex flex-wrap gap-2">
                        {selectedSymbols.map((symbol, idx) => (
                            <Tag
                                key={symbol}
                                closable
                                onClose={() => removeSymbol(symbol)}
                                style={{
                                    backgroundColor: `${CHART_COLORS[idx % CHART_COLORS.length]}22`,
                                    borderColor: CHART_COLORS[idx % CHART_COLORS.length],
                                    color: CHART_COLORS[idx % CHART_COLORS.length]
                                }}
                            >
                                {symbol}
                            </Tag>
                        ))}
                    </div>

                    {/* Metric Selector - Professional Finance UI */}
                    <div className="mb-4">
                        <Popover
                            trigger="click"
                            placement="bottomLeft"
                            overlayStyle={{ width: 480 }}
                            content={
                                <div className="bg-[#0a0a0a] -m-3 p-3">
                                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#333]">
                                        <span className="text-xs font-bold text-[#ff9800]">CHỌN CHỈ TIÊU PHÂN TÍCH</span>
                                        <Space>
                                            <Button size="small" type="text" className="text-gray-500 text-[10px]" onClick={() => setSelectedMetrics([])}>
                                                Bỏ chọn tất cả
                                            </Button>
                                            <Button size="small" type="text" className="text-[#ff9800] text-[10px]" onClick={() => setSelectedMetrics(COMPARISON_METRICS.slice(0, 8).map(m => m.key))}>
                                                Chỉ tiêu phổ biến
                                            </Button>
                                        </Space>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                                        {Object.entries(METRIC_CATEGORIES).map(([key, cat]) => (
                                            <div key={key} className="bg-[#111] border border-[#222] rounded p-2">
                                                <div
                                                    className="text-[10px] font-bold mb-2 pb-1 border-b flex items-center justify-between"
                                                    style={{ color: cat.color, borderColor: `${cat.color}33` }}
                                                >
                                                    <span>{cat.name}</span>
                                                    <span className="text-gray-600 text-[9px]">
                                                        {cat.metrics.filter(m => selectedMetrics.includes(m.key)).length}/{cat.metrics.length}
                                                    </span>
                                                </div>
                                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                                    {cat.metrics.map(m => (
                                                        <Checkbox
                                                            key={m.key}
                                                            checked={selectedMetrics.includes(m.key)}
                                                            onChange={e => {
                                                                if (e.target.checked) {
                                                                    setSelectedMetrics([...selectedMetrics, m.key]);
                                                                } else {
                                                                    setSelectedMetrics(selectedMetrics.filter(k => k !== m.key));
                                                                }
                                                            }}
                                                            className="block text-[11px] text-gray-300 hover:text-white transition-colors"
                                                        >
                                                            {m.label}
                                                        </Checkbox>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-3 pt-2 border-t border-[#333] flex justify-between items-center">
                                        <span className="text-[10px] text-gray-500">
                                            Đã chọn: <span className="text-[#ff9800] font-bold">{selectedMetrics.length}</span> chỉ tiêu
                                        </span>
                                        <div className="flex gap-1 flex-wrap max-w-[300px]">
                                            {selectedMetrics.slice(0, 5).map(key => {
                                                const metric = COMPARISON_METRICS.find(m => m.key === key);
                                                return (
                                                    <Tag
                                                        key={key}
                                                        closable
                                                        onClose={() => setSelectedMetrics(selectedMetrics.filter(k => k !== key))}
                                                        style={{
                                                            fontSize: 9,
                                                            padding: '0 4px',
                                                            backgroundColor: `${metric?.color || '#333'}22`,
                                                            borderColor: metric?.color || '#333',
                                                            color: metric?.color || '#888'
                                                        }}
                                                    >
                                                        {metric?.label?.slice(0, 15) || key.slice(0, 15)}
                                                    </Tag>
                                                );
                                            })}
                                            {selectedMetrics.length > 5 && (
                                                <Tag style={{ fontSize: 9, padding: '0 4px' }}>+{selectedMetrics.length - 5}</Tag>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            }
                        >
                            <Button
                                icon={<Settings size={12} />}
                                size="small"
                                className="bg-gradient-to-r from-[#ff9800]/20 to-[#ff5722]/20 border-[#ff9800] text-[#ff9800] hover:from-[#ff9800]/30 hover:to-[#ff5722]/30"
                            >
                                Chọn chỉ tiêu ({selectedMetrics.length})
                            </Button>
                        </Popover>
                    </div>

                    {/* Data Table */}
                    {loading ? (
                        <div className="flex items-center justify-center h-40">
                            <Spin />
                        </div>
                    ) : comparisonData.length > 0 ? (
                        <>
                            <Table
                                dataSource={comparisonData}
                                columns={tableColumns}
                                rowKey="symbol"
                                pagination={false}
                                size="small"
                                scroll={{ x: 'max-content', y: 300 }}
                                className="comparison-table"
                            />

                            {/* Statistics Row */}
                            <div className="mt-4 p-3 bg-[#111] border border-[#333] rounded">
                                <div className="text-[10px] font-bold text-gray-500 mb-2">THỐNG KÊ</div>
                                <div className="grid grid-cols-3 gap-4">
                                    {selectedMetrics.slice(0, 3).map(metric => (
                                        <div key={metric} className="text-center">
                                            <div className="text-[10px] text-gray-500">{metric}</div>
                                            <div className="grid grid-cols-3 gap-1 mt-1">
                                                <div>
                                                    <div className="text-[9px] text-gray-600">AVG</div>
                                                    <div className="text-xs text-green-400 font-mono">{statistics[metric]?.avg.toFixed(2)}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[9px] text-gray-600">MED</div>
                                                    <div className="text-xs text-blue-400 font-mono">{statistics[metric]?.median.toFixed(2)}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[9px] text-gray-600">MAX</div>
                                                    <div className="text-xs text-[#ff9800] font-mono">{statistics[metric]?.max.toFixed(2)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <Empty description="Chọn mã để so sánh" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    )}
                </Card>
            </div>

            {/* RIGHT PANEL - CHART */}
            <div className="w-1/2 flex flex-col gap-4">
                <Card
                    className="border-none bg-[#0b0e11] shadow-2xl flex-1"
                    title={
                        <div className="flex justify-between items-center">
                            <Space>
                                <BarChart3 size={16} className="text-[#1677ff]" />
                                <span className="text-[#e0e0e0] font-mono font-bold">BIỂU ĐỒ SO SÁNH</span>
                            </Space>
                            <Space>
                                <Select value={chartMetric} onChange={setChartMetric} style={{ width: 180 }} size="small">
                                    {selectedMetrics.map(m => <Select.Option key={m} value={m}>{m}</Select.Option>)}
                                </Select>
                                <Button.Group size="small">
                                    <Button
                                        icon={<BarChart3 size={12} />}
                                        onClick={() => setChartType('bar')}
                                        type={chartType === 'bar' ? 'primary' : 'default'}
                                    />
                                    <Button
                                        icon={<LineChart size={12} />}
                                        onClick={() => setChartType('line')}
                                        type={chartType === 'line' ? 'primary' : 'default'}
                                    />
                                </Button.Group>
                            </Space>
                        </div>
                    }
                >
                    {comparisonData.length > 0 ? (
                        <ReactECharts
                            option={chartOptions}
                            style={{ height: '100%', minHeight: 400 }}
                            theme="dark"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <Empty description="Chọn mã để xem biểu đồ" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        </div>
                    )}
                </Card>
            </div>

            {/* Save Modal */}
            <Modal
                title={<span className="text-[#e0e0e0] font-mono">LƯU WATCHLIST</span>}
                open={showSaveModal}
                onOk={saveWatchlist}
                onCancel={() => setShowSaveModal(false)}
                okText="Lưu"
                cancelText="Hủy"
                styles={{ body: { background: '#0a0a0a' }, header: { background: '#0a0a0a' }, content: { background: '#0a0a0a' } }}
            >
                <Input
                    placeholder="Tên watchlist..."
                    value={watchlistName}
                    onChange={e => setWatchlistName(e.target.value)}
                    className="bg-[#111] border-[#333] text-[#e0e0e0]"
                />
                <div className="mt-2 text-xs text-gray-500">
                    Sẽ lưu {selectedSymbols.length} mã: {selectedSymbols.join(', ')}
                </div>
            </Modal>

            {/* Load Modal */}
            <Modal
                title={<span className="text-[#e0e0e0] font-mono">TẢI WATCHLIST</span>}
                open={showLoadModal}
                onCancel={() => setShowLoadModal(false)}
                footer={null}
                styles={{ body: { background: '#0a0a0a' }, header: { background: '#0a0a0a' }, content: { background: '#0a0a0a' } }}
            >
                {watchlists.length === 0 ? (
                    <Empty description="Chưa có watchlist nào" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                    <div className="space-y-2">
                        {watchlists.map(wl => (
                            <div
                                key={wl.id}
                                className="p-3 bg-[#111] border border-[#333] hover:border-[#ff9800] cursor-pointer transition-all flex justify-between items-center"
                                onClick={() => loadWatchlist(wl)}
                            >
                                <div>
                                    <div className="font-bold text-[#e0e0e0]">{wl.name}</div>
                                    <div className="text-xs text-gray-500">{wl.symbols.length} mã: {wl.symbols.slice(0, 5).join(', ')}{wl.symbols.length > 5 ? '...' : ''}</div>
                                </div>
                                <Trash2
                                    size={14}
                                    className="text-gray-600 hover:text-red-500"
                                    onClick={e => { e.stopPropagation(); deleteWatchlist(wl.id); }}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </Modal>

            <style>{`
                .comparison-table .ant-table {
                    background: transparent !important;
                }
                .comparison-table .ant-table-thead > tr > th {
                    background: #111 !important;
                    border-bottom: 1px solid #333 !important;
                }
                .comparison-table .ant-table-tbody > tr > td {
                    background: transparent !important;
                    border-bottom: 1px solid #222 !important;
                }
                .comparison-table .ant-table-tbody > tr:hover > td {
                    background: #1a1a1a !important;
                }
            `}</style>
        </div>
    );
};

export default IndustryComparison;
