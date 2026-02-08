import React, { useEffect, useState, useMemo } from 'react';
import { Card, Select, Button, Table, Empty, Spin, Input, Modal, Tooltip, Space, Dropdown, Statistic, Tag, Popover, Checkbox, Divider } from 'antd';
import { Plus, Trash2, Save, FolderOpen, BarChart3, LineChart, TrendingUp, Search, RefreshCw, Settings, Eye, EyeOff, Download, Layers, Activity, Maximize2, Minimize2 } from 'lucide-react';
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

const CHART_COLORS = [
    '#ff9800', // Orange
    '#00e676', // Green
    '#2196f3', // Blue
    '#e91e63', // Pink
    '#9c27b0', // Purple
    '#00bcd4', // Cyan
    '#ff5722', // Deep Orange
    '#8bc34a', // Light Green
    '#f44336', // Red
    '#ffeb3b', // Yellow
    '#795548', // Brown
    '#607d8b'  // Blue Grey
];

interface Props {
    user: SupabaseUser | null;
}

const IndustryComparison: React.FC<Props> = ({ user }) => {
    // State
    const [loading, setLoading] = useState(false);
    const [allSymbols, setAllSymbols] = useState<StockSymbol[]>([]);
    const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
    const [searchResults, setSearchResults] = useState<StockSymbol[]>([]);
    const [searching, setSearching] = useState(false);
    const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
    const [currentWatchlistId, setCurrentWatchlistId] = useState<string | null>(null);
    const [watchlistName, setWatchlistName] = useState('');
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showLoadModal, setShowLoadModal] = useState(false);

    const [financialData, setFinancialData] = useState<Record<string, FinancialData[]>>({});
    const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['Chỉ số giá thị trường trên thu nhập (P/E)', 'Giá trị sổ sách của cổ phiếu (BVPS)', 'Thu nhập trên mỗi cổ phần của 4 quý gần nhất (EPS)']);
    const [period, setPeriod] = useState<'year' | 'quarter'>('year');
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear() - 1);
    const [selectedQuarter, setSelectedQuarter] = useState<number>(1);
    const [chartMetric, setChartMetric] = useState<string>('Chỉ số giá thị trường trên thu nhập (P/E)');

    const [availableKeys, setAvailableKeys] = useState<{
        ratios: Set<string>;
        income: Set<string>;
        balance: Set<string>;
        cashflow: Set<string>;
    }>({
        ratios: new Set(),
        income: new Set(),
        balance: new Set(),
        cashflow: new Set()
    });
    const [chartType, setChartType] = useState<'bar' | 'line' | 'stacked'>('bar');
    const [searchSymbol, setSearchSymbol] = useState('');
    const [metricSearch, setMetricSearch] = useState('');
    const [showMetricModal, setShowMetricModal] = useState(false);
    const [activeSource, setActiveSource] = useState<'all' | 'ratios' | 'income' | 'balance' | 'cashflow'>('all');
    const [tableFontSize, setTableFontSize] = useState(11);
    const [maximizedPanel, setMaximizedPanel] = useState<'none' | 'left' | 'right'>('none');
    const [isFullScreen, setIsFullScreen] = useState(false);

    // Fetch all symbols
    useEffect(() => {
        const fetchSymbols = async () => {
            const { data, error } = await supabase
                .from('stock_symbols')
                .select('symbol, company_name, icb_name2')
                .order('symbol')
                .range(0, 9999); // Fetch up to 10000 symbols (bypasses default 1000 limit)

            if (error) {
                console.error('Error fetching symbols:', error);
                return;
            }

            if (data) {
                console.log(`✅ Loaded ${data.length} symbols from database`);
                console.log('First 5:', data.slice(0, 5).map(s => s.symbol));
                console.log('Last 5:', data.slice(-5).map(s => s.symbol));

                // Check if specific symbols exist
                const testSymbols = ['VND', 'SSI', 'VCB', 'VPB', 'HCM', 'HPG', 'VNM'];
                const found = testSymbols.filter(sym => data.some(d => d.symbol === sym));
                const missing = testSymbols.filter(sym => !data.some(d => d.symbol === sym));

                if (found.length > 0) console.log('✅ Found symbols:', found);
                if (missing.length > 0) console.warn('⚠️ Missing symbols:', missing);

                setAllSymbols(data);
            }
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
        const { data, error } = await supabase
            .from('user_watchlists')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false });

        if (error) {
            // Table might not exist yet - silently ignore
            console.log('Watchlists not available (table may not exist)');
            return;
        }

        if (data) setWatchlists(data);
    };

    const fetchFinancialData = async () => {
        if (selectedSymbols.length === 0) return;
        setLoading(true);

        try {
            const results: Record<string, FinancialData[]> = {};
            const newKeys = {
                ratios: new Set<string>(),
                income: new Set<string>(),
                balance: new Set<string>(),
                cashflow: new Set<string>()
            };

            await Promise.all(selectedSymbols.map(async (symbol) => {
                const [ratioRes, incomeRes, balanceRes, cashflowRes] = await Promise.all([
                    supabase.from('financial_ratios').select('data').eq('symbol', symbol).eq('period_type', period),
                    supabase.from('financial_statements').select('data').eq('symbol', symbol).eq('statement_type', 'income_statement').eq('period_type', period),
                    supabase.from('financial_statements').select('data').eq('symbol', symbol).eq('statement_type', 'balance_sheet').eq('period_type', period),
                    supabase.from('financial_statements').select('data').eq('symbol', symbol).eq('statement_type', 'cash_flow').eq('period_type', period)
                ]);

                const dataMap = new Map();

                const processSource = (res: any, category: keyof typeof newKeys) => {
                    if (res.data) {
                        res.data.forEach((row: any) => {
                            const innerData = Array.isArray(row.data) ? row.data : [row.data];
                            innerData.forEach((d: any) => {
                                const year = d.Năm || d.year || d.Year || d.report_year;
                                const quarter = d.Quý || d.quarter || d.Quarter || d.report_quarter || 0;
                                if (!year) return;

                                const key = `${year}-${quarter}`;
                                const existing = dataMap.get(key) || {};

                                const cleanD: any = {};
                                Object.keys(d).forEach(k => {
                                    // Trim key and remove leading underscores
                                    const ck = k.trim().replace(/^_+/, '');
                                    cleanD[ck] = d[k];

                                    if (!['symbol', 'period', 'year', 'quarter', 'year_quarter', 'Quarter', 'Year', 'Năm', 'Quý', 'report_year', 'report_quarter'].includes(ck)) {
                                        newKeys[category].add(ck);
                                    }
                                });

                                dataMap.set(key, { ...existing, ...cleanD });
                            });
                        });
                    }
                };

                processSource(ratioRes, 'ratios');
                processSource(incomeRes, 'income');
                processSource(balanceRes, 'balance');
                processSource(cashflowRes, 'cashflow');

                results[symbol] = Array.from(dataMap.values()).map(d => ({
                    ...d,
                    symbol,
                    period: period === 'year' ? `${d.Năm || d.year || d.Year}` : `Q${d.Quý || d.quarter || d.Quarter}/${d.Năm || d.year || d.Year}`,
                    year: parseInt(d.Năm || d.year || d.Year || 0),
                    quarter: parseInt(d.Quý || d.quarter || d.Quarter || 0)
                })).sort((a, b) => {
                    if (b.year !== a.year) return b.year - a.year;
                    return b.quarter - a.quarter;
                });
            }));

            console.log(`Fetched financial data for ${selectedSymbols.length} symbols. Found keys:`,
                { ratios: newKeys.ratios.size, income: newKeys.income.size, balance: newKeys.balance.size, cashflow: newKeys.cashflow.size });

            setFinancialData(results);
            setAvailableKeys(newKeys);

            // Set default chart metric if not set or not in new keys
            const allKeys = [...newKeys.ratios, ...newKeys.income, ...newKeys.balance, ...newKeys.cashflow];
            if (allKeys.length > 0 && (!chartMetric || !allKeys.includes(chartMetric))) {
                setChartMetric(allKeys[0]);
            }
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
        // Also remove financial data for this symbol
        setFinancialData(prevData => {
            const newData = { ...prevData };
            delete newData[symbol];
            return newData;
        });
    };

    // Server-side search function
    const searchSymbols = async (searchTerm: string): Promise<StockSymbol[]> => {
        if (!searchTerm || searchTerm.trim().length < 1) {
            return [];
        }

        const term = searchTerm.trim();
        console.log(`[SERVER SEARCH] Searching for: "${term}"`);

        try {
            const { data, error } = await supabase
                .from('stock_symbols')
                .select('symbol, company_name, icb_name2')
                .or(`symbol.ilike.%${term}%,company_name.ilike.%${term}%`)
                .order('symbol')
                .limit(200);

            if (error) {
                console.error('[SERVER SEARCH] Error:', error);
                return [];
            }

            console.log(`[SERVER SEARCH] Found ${data?.length || 0} results`);
            return data || [];
        } catch (e) {
            console.error('[SERVER SEARCH] Exception:', e);
            return [];
        }
    };

    // Handle search input with server-side query
    const handleSearch = async (value: string) => {
        const trimmed = value.trim();
        setSearchSymbol(trimmed);

        if (!trimmed || trimmed.length < 1) {
            setSearchResults([]);
            setSearching(false);
            return;
        }

        setSearching(true);
        const results = await searchSymbols(trimmed);
        setSearchResults(results);
        setSearching(false);
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

    // Helper to parse numeric values from strings
    const parseValue = (v: any) => {
        if (v === undefined || v === null) return undefined;
        if (typeof v === 'number') return v;
        const s = String(v).trim().replace(/,/g, '');
        if (s === '' || s === 'None' || s === 'nan' || s === 'null') return undefined;
        const n = parseFloat(s);
        return isNaN(n) ? undefined : n;
    };

    const formatFinancialValue = (val: number, precision: number = 2) => {
        if (val === undefined || val === null || isNaN(val)) return '-';
        const absVal = Math.abs(val);

        if (absVal >= 1e12) return (val / 1e12).toFixed(precision) + ' nghìn tỷ';
        if (absVal >= 1e9) return (val / 1e9).toFixed(precision) + ' tỷ';
        if (absVal >= 1e6) return (val / 1e6).toFixed(1) + ' tr';
        if (absVal >= 1000) return val.toLocaleString(undefined, { maximumFractionDigits: precision });
        return val.toFixed(precision);
    };

    // Get comparison data for selected year/quarter
    const comparisonData = useMemo(() => {
        if (selectedSymbols.length === 0) return [];

        return selectedSymbols.map(symbol => {
            const data = financialData[symbol] || [];
            // Find data for selected year and quarter
            const yearDataMatch = data.find(d => {
                const yMatch = d.year === selectedYear;
                if (period === 'year') return yMatch;
                return yMatch && d.quarter === selectedQuarter;
            });

            const hasData = !!yearDataMatch;
            const targetData = (yearDataMatch || {}) as Record<string, any>;

            const row: any = { symbol, _hasData: hasData };
            selectedMetrics.forEach(metric => {
                const val = targetData[metric];
                row[metric] = parseValue(val);
            });
            return row;
        });
    }, [financialData, selectedSymbols, selectedMetrics, selectedYear, selectedQuarter, period]);

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

    // Grouping metrics for the specialized selector
    const metricGroups = useMemo(() => {
        const groups = [
            { key: 'ratios', name: 'Key Ratios', color: '#ff9800', keys: Array.from(availableKeys.ratios) },
            { key: 'income', name: 'Báo cáo thu nhập', color: '#00e676', keys: Array.from(availableKeys.income) },
            { key: 'balance', name: 'Bảng cân đối kế toán', color: '#2196f3', keys: Array.from(availableKeys.balance) },
            { key: 'cashflow', name: 'Lưu chuyển tiền tệ', color: '#9c27b0', keys: Array.from(availableKeys.cashflow) },
        ];

        return groups.map(g => ({
            ...g,
            filteredKeys: g.keys.filter(k =>
                !metricSearch || k.toLowerCase().includes(metricSearch.toLowerCase())
            ).sort()
        }));
    }, [availableKeys, metricSearch]);

    // Chart options - Independent Time Series
    const chartOptions = useMemo(() => {
        if (selectedSymbols.length === 0 || !chartMetric) return {};

        // 1. Collect all unique time periods across all selected symbols
        const periodsSet = new Set<string>();
        selectedSymbols.forEach(symbol => {
            const data = financialData[symbol] || [];
            data.forEach(d => periodsSet.add(d.period));
        });

        // 2. Sort periods chronologically (Year -> Quarter)
        const sortedPeriods = Array.from(periodsSet).sort((a, b) => {
            const parsePeriod = (p: string) => {
                if (p.startsWith('Q')) {
                    const [qPart, yPart] = p.split('/');
                    return parseInt(yPart) * 10 + parseInt(qPart.slice(1));
                }
                return parseInt(p) * 10;
            };
            return parsePeriod(a) - parsePeriod(b);
        });

        // 3. Create series for each symbol
        const series = selectedSymbols.map((symbol, idx) => {
            const symbolData = financialData[symbol] || [];
            const isStacked = chartType === 'stacked';
            const type = isStacked ? 'bar' : chartType;

            return {
                name: symbol,
                type: type,
                stack: isStacked ? 'total' : undefined,
                data: sortedPeriods.map(p => {
                    const match = symbolData.find(d => d.period === p);
                    return match ? parseValue(match[chartMetric]) : null;
                }),
                connectNulls: true,
                smooth: chartType === 'line',
                emphasis: { focus: 'series' },
                itemStyle: {
                    borderRadius: type === 'bar' && !isStacked ? [4, 4, 0, 0] : 0
                }
            };
        });

        return {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(20, 20, 20, 0.9)',
                borderColor: '#444',
                padding: [10, 15],
                textStyle: { color: '#e0e0e0', fontSize: 12 },
                axisPointer: { type: 'cross', label: { backgroundColor: '#333' } }
            },
            dataZoom: [
                {
                    type: 'inside',
                    start: 0,
                    end: 100
                },
                {
                    type: 'slider',
                    show: true,
                    bottom: 10,
                    height: 20,
                    borderColor: 'transparent',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    fillerColor: 'rgba(22, 119, 255, 0.2)',
                    handleStyle: { color: '#1677ff' },
                    textStyle: { color: '#888' }
                }
            ],
            legend: {
                textStyle: { color: '#888', fontSize: 10 },
                top: 0
            },
            grid: {
                left: '2%',
                right: '4%',
                bottom: '12%',
                top: '15%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: sortedPeriods,
                axisLabel: { color: '#888', rotate: 30, fontSize: 10 },
                axisLine: { lineStyle: { color: '#222' } }
            },
            yAxis: {
                type: 'value',
                axisLabel: {
                    color: '#666',
                    fontSize: 10,
                    formatter: (val: number) => formatFinancialValue(val, 1)
                },
                splitLine: { lineStyle: { color: '#1a1a1a' } },
                axisLine: { show: false }
            },
            color: CHART_COLORS,
            series
        };
    }, [financialData, selectedSymbols, chartMetric, chartType, period]);

    // Table columns
    const tableColumns = useMemo(() => {
        const cols: any[] = [
            {
                title: <span className="text-[10px] text-gray-500">MÃ</span>,
                dataIndex: 'symbol',
                key: 'symbol',
                fixed: 'left',
                width: 80,
                render: (text: string, record: any) => (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-[#ff9800]">{text}</span>
                            {!record._hasData && (
                                <Tooltip title={`Không tìm thấy dữ liệu cho ${period === 'quarter' ? `Q${selectedQuarter} ` : ''}${selectedYear}`}>
                                    <Activity size={10} className="text-gray-600" />
                                </Tooltip>
                            )}
                        </div>
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
                title: <div className="text-[10px] text-gray-500 max-w-[120px] whitespace-normal leading-tight">{metric}</div>,
                dataIndex: metric,
                key: metric,
                align: 'right' as const,
                sorter: (a: any, b: any) => (a[metric] || 0) - (b[metric] || 0),
                render: (val: number) => {
                    if (val === undefined || val === null || isNaN(val)) return <span className="text-gray-600 text-xs">-</span>;

                    const formatted = formatFinancialValue(val, 2);

                    return (
                        <span className={`font-mono ${val > 0 ? 'text-green-400' : val < 0 ? 'text-red-400' : 'text-gray-400'}`} style={{ fontSize: tableFontSize }}>
                            {formatted}
                        </span>
                    );
                }
            });
        });

        return cols;
    }, [selectedMetrics, selectedSymbols, selectedYear, tableFontSize]);

    // Available years
    const availableYears = useMemo(() => {
        const years = new Set<number>();
        Object.values(financialData).forEach(data => {
            data.forEach(d => years.add(d.year));
        });
        return Array.from(years).sort((a, b) => b - a);
    }, [financialData]);

    // Auto-select latest year when availableYears changes
    useEffect(() => {
        if (availableYears.length > 0 && (!selectedYear || !availableYears.includes(selectedYear))) {
            setSelectedYear(availableYears[0]);
        }
    }, [availableYears]);

    const filteredSymbols = useMemo(() => {
        if (!searchSymbol) return allSymbols.slice(0, 500);

        const search = searchSymbol.toLowerCase().trim();
        if (!search) return allSymbols.slice(0, 500);

        console.log(`[SEARCH] Looking for: "${search}" in ${allSymbols.length} total symbols`);

        // Filter matching symbols
        const matches = allSymbols.filter(s =>
            s.symbol.toLowerCase().includes(search) ||
            s.company_name?.toLowerCase().includes(search)
        );

        console.log(`[SEARCH] Found ${matches.length} matches for "${search}"`);
        if (matches.length > 0) {
            console.log(`[SEARCH] Top matches:`, matches.slice(0, 5).map(s => s.symbol));
        }

        // Sort by relevance: exact match > starts with > contains
        const sorted = matches.sort((a, b) => {
            const aSymbol = a.symbol.toLowerCase();
            const bSymbol = b.symbol.toLowerCase();
            const aName = (a.company_name || '').toLowerCase();
            const bName = (b.company_name || '').toLowerCase();

            // Exact match in symbol (highest priority)
            if (aSymbol === search && bSymbol !== search) return -1;
            if (bSymbol === search && aSymbol !== search) return 1;

            // Starts with in symbol
            if (aSymbol.startsWith(search) && !bSymbol.startsWith(search)) return -1;
            if (bSymbol.startsWith(search) && !aSymbol.startsWith(search)) return 1;

            // Contains in symbol
            if (aSymbol.includes(search) && !bSymbol.includes(search)) return -1;
            if (bSymbol.includes(search) && !aSymbol.includes(search)) return 1;

            // Alphabetical order
            return aSymbol.localeCompare(bSymbol);
        });

        return sorted.slice(0, 200); // Limit to 200 for performance
    }, [allSymbols, searchSymbol]);

    return (
        <div className={`flex gap-4 transition-all duration-300 relative ${isFullScreen ? 'fixed inset-0 z-[1000] bg-black p-4 h-screen' : 'h-[calc(100vh-180px)]'}`}>
            {isFullScreen && (
                <div className="absolute top-4 right-4 z-[1001]">
                    <Button
                        shape="circle"
                        icon={<Minimize2 size={20} />}
                        onClick={() => setIsFullScreen(false)}
                        className="bg-[#111] border-gray-700 text-gray-400 hover:text-white"
                    />
                </div>
            )}
            {/* LEFT PANEL - DATA */}
            <div className={`flex flex-col gap-4 transition-all duration-300 ${maximizedPanel === 'left' ? 'absolute inset-0 z-50 w-full h-full bg-[#000]' :
                maximizedPanel === 'right' ? 'hidden' : 'w-1/2'
                }`}>
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
                                <Button
                                    size="small"
                                    icon={maximizedPanel === 'left' ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                                    onClick={() => setMaximizedPanel(maximizedPanel === 'left' ? 'none' : 'left')}
                                    className="bg-transparent border-gray-700 text-gray-500"
                                />
                                <Button
                                    size="small"
                                    icon={isFullScreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                                    onClick={() => setIsFullScreen(!isFullScreen)}
                                    className="bg-transparent border-[#ff9800] text-[#ff9800]"
                                    title="Full Screen View"
                                />
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
                            onSearch={handleSearch}
                            onSelect={(val) => { if (val) { addSymbol(val); setSearchSymbol(''); setSearchResults([]); } }}
                            value={undefined}
                            loading={searching}
                            options={searchResults.map(s => ({
                                value: s.symbol,
                                label: (
                                    <div className="flex items-center justify-between w-full">
                                        <span className="font-bold text-[#ff9800]">{s.symbol}</span>
                                        <span className="text-[10px] text-gray-400 truncate ml-4 max-w-[200px]">
                                            {s.company_name}
                                        </span>
                                    </div>
                                )
                            }))}
                            notFoundContent={searching ? <Spin size="small" /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nhập để tìm kiếm mã" />}
                        />

                        <Select value={period} onChange={setPeriod} style={{ width: 80 }}>
                            <Select.Option value="year">Năm</Select.Option>
                            <Select.Option value="quarter">Quý</Select.Option>
                        </Select>

                        {period === 'quarter' && (
                            <Select value={selectedQuarter} onChange={setSelectedQuarter} style={{ width: 70 }}>
                                {[1, 2, 3, 4].map(q => <Select.Option key={q} value={q}>Q{q}</Select.Option>)}
                            </Select>
                        )}

                        <Select
                            value={selectedYear}
                            onChange={setSelectedYear}
                            style={{ width: 90 }}
                            placeholder="Chọn năm"
                        >
                            {availableYears.map(y => <Select.Option key={y} value={y}>{y}</Select.Option>)}
                        </Select>

                        <div className="flex items-center gap-1 bg-[#1a1a1a] px-2 rounded border border-[#333]">
                            <TrendingUp size={12} className="text-gray-500" />
                            <Select
                                value={tableFontSize}
                                onChange={setTableFontSize}
                                size="small"
                                variant="borderless"
                                style={{ width: 65 }}
                                options={[
                                    { value: 9, label: '9pt' },
                                    { value: 10, label: '10pt' },
                                    { value: 11, label: '11pt' },
                                    { value: 12, label: '12pt' },
                                ]}
                            />
                        </div>
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

                    {/* Metric Selector Button */}
                    <div className="mb-4">
                        <Button
                            icon={<Settings size={14} />}
                            onClick={() => setShowMetricModal(true)}
                            className="bg-transparent border-[#ff9800] text-[#ff9800] hover:bg-[#ff9800]/10 uppercase font-mono font-bold h-9"
                        >
                            CHỌN CHỈ TIÊU ({selectedMetrics.length})
                        </Button>

                        <Modal
                            title={
                                <div className="flex items-center justify-between pr-8">
                                    <span className="text-[#ff9800] font-mono flex items-center gap-2">
                                        <Layers size={18} /> 🎯 CHỈ TIÊU TỪ DỮ LIỆU GỐC (DYNAMIC)
                                    </span>
                                    <Space split={<Divider type="vertical" className="bg-gray-800" />}>
                                        <div className="flex gap-2">
                                            {(['all', 'ratios', 'income', 'balance', 'cashflow'] as const).map(s => (
                                                <Button
                                                    key={s}
                                                    size="small"
                                                    type={activeSource === s ? 'primary' : 'text'}
                                                    className={activeSource === s ? 'bg-[#ff9800]' : 'text-gray-500'}
                                                    onClick={() => setActiveSource(s)}
                                                >
                                                    {s === 'all' ? 'TẤT CẢ' : s.toUpperCase()}
                                                </Button>
                                            ))}
                                        </div>
                                    </Space>
                                </div>
                            }
                            open={showMetricModal}
                            onCancel={() => setShowMetricModal(false)}
                            footer={null}
                            width={1100}
                            centered
                            className="finance-modal"
                            styles={{ body: { backgroundColor: '#0a0a0a', padding: 20 } }}
                        >
                            <div className="space-y-4">
                                <div className="bg-[#111] p-2 rounded flex gap-4">
                                    <Input
                                        placeholder="Tìm nhanh chỉ tiêu (ROE, Doanh thu, Nợ...)"
                                        size="large"
                                        prefix={<Search className="text-gray-500" />}
                                        className="metric-search-input bg-transparent border-none text-white flex-1"
                                        value={metricSearch}
                                        onChange={e => setMetricSearch(e.target.value)}
                                        allowClear
                                        autoFocus
                                    />
                                    <div className="flex items-center gap-2 border-l border-[#333] pl-4">
                                        <Button ghost danger size="small" onClick={() => setSelectedMetrics([])}>XÓA TẤT CẢ</Button>
                                        <Button type="primary" size="small" onClick={() => setShowMetricModal(false)} className="bg-[#ff9800] border-[#ff9800]">XÁC NHẬN ({selectedMetrics.length})</Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-[65vh] overflow-y-auto pr-2 custom-scrollbar">
                                    {metricGroups.filter(g => activeSource === 'all' || g.key === activeSource).map(group => (
                                        <div key={group.key} className="bg-[#111] border border-[#222] rounded p-0 flex flex-col group">
                                            <div
                                                className="p-3 font-mono font-bold text-[10px] flex items-center justify-between sticky top-0 bg-[#161616] z-10 border-b border-[#222]"
                                                style={{ color: group.color }}
                                            >
                                                <span>{group.name}</span>
                                                <span className="bg-black/50 px-2 rounded-full text-[9px]">{group.filteredKeys.length}</span>
                                            </div>
                                            <div className="p-2 space-y-0.5 overflow-y-auto max-h-[100%]">
                                                {group.filteredKeys.map(key => {
                                                    const isChecked = selectedMetrics.includes(key);
                                                    return (
                                                        <div
                                                            key={key}
                                                            onClick={() => {
                                                                if (isChecked) setSelectedMetrics(selectedMetrics.filter(k => k !== key));
                                                                else setSelectedMetrics([...selectedMetrics, key]);
                                                            }}
                                                            className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-all ${isChecked ? 'bg-[#ff9800]/10 border border-[#ff9800]/30' : 'hover:bg-white/5 border border-transparent'}`}
                                                        >
                                                            <Checkbox
                                                                checked={isChecked}
                                                                className="metric-checkbox pointer-events-none"
                                                            />
                                                            <span className={`text-[11px] truncate flex-1 ${isChecked ? 'text-[#ff9800] font-bold' : 'text-gray-400'}`}>
                                                                {key}
                                                            </span>
                                                            <Tooltip title="Xem biểu đồ TREND cho chỉ tiêu này">
                                                                <Activity
                                                                    size={14}
                                                                    className={`cursor-pointer hover:text-[#1677ff] transition-colors ${chartMetric === key ? 'text-[#1677ff]' : 'text-gray-700'}`}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setChartMetric(key);
                                                                    }}
                                                                />
                                                            </Tooltip>
                                                        </div>
                                                    );
                                                })}
                                                {group.filteredKeys.length === 0 && (
                                                    <div className="p-4 text-center text-gray-700 text-[10px] italic">Không có dữ liệu...</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Selection Summary Bar */}
                                <div className="bg-[#0f0f0f] border border-[#222] rounded-lg p-3 flex items-center gap-4">
                                    <div className="text-[10px] text-gray-500 font-mono uppercase">ĐÃ CHỌN ({selectedMetrics.length}):</div>
                                    <div className="flex-1 overflow-x-auto whitespace-nowrap scroll-thin flex gap-1.5 px-1 py-1">
                                        {selectedMetrics.map(key => (
                                            <Tag
                                                key={key}
                                                closable
                                                onClose={() => setSelectedMetrics(selectedMetrics.filter(k => k !== key))}
                                                className="bg-black/40 border-gray-800 text-gray-400 hover:text-white transition-colors text-[10px] rounded-sm m-0"
                                            >
                                                {key}
                                            </Tag>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </Modal>
                    </div>

                    {/* Data Table Container */}
                    <div className="flex-1 overflow-hidden flex flex-col">
                        {loading ? (
                            <div className="flex-1 flex items-center justify-center">
                                <Spin tip="Đang truy vấn dữ liệu..." />
                            </div>
                        ) : selectedSymbols.length > 0 ? (
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <Table
                                    dataSource={comparisonData}
                                    columns={tableColumns}
                                    rowKey="symbol"
                                    pagination={false}
                                    size="small"
                                    scroll={{ x: 'max-content', y: isFullScreen ? 'calc(100vh - 350px)' : maximizedPanel === 'left' ? 'calc(100vh - 350px)' : 350 }}
                                    className="comparison-table"
                                />

                                {/* Statistics Section */}
                                <div className="mt-4 p-3 bg-[#111] border border-[#333] rounded">
                                    <div className="text-[10px] font-bold text-gray-500 mb-2 border-b border-[#222] pb-1">BẢNG THỐNG KÊ CHI TIẾT</div>
                                    <div className="max-h-[150px] overflow-y-auto custom-scrollbar pr-2">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                            {selectedMetrics.map(metric => {
                                                const stats = statistics[metric];
                                                if (!stats) return null;

                                                const formatStat = (val: number) => {
                                                    if (val === undefined || val === null || isNaN(val)) return '-';
                                                    const absV = Math.abs(val);
                                                    if (absV >= 1e9) return (val / 1e9).toFixed(2) + ' tỷ';
                                                    if (absV >= 1e6) return (val / 1e6).toFixed(1) + ' tr';
                                                    return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
                                                };

                                                return (
                                                    <div key={metric} className="bg-[#1a1a1a] p-2 rounded border border-[#222] hover:border-[#ff9800]/30 transition-colors">
                                                        <div className="text-[10px] text-gray-400 truncate mb-1 border-b border-[#333] pb-0.5" title={metric}>
                                                            {metric}
                                                        </div>
                                                        <div className="flex justify-between items-center gap-2">
                                                            <div>
                                                                <div className="text-[8px] text-gray-600 uppercase">Avg</div>
                                                                <div className="text-[11px] text-green-400 font-mono font-bold">{formatStat(stats.avg)}</div>
                                                            </div>
                                                            <div>
                                                                <div className="text-[8px] text-gray-600 uppercase">Med</div>
                                                                <div className="text-[11px] text-blue-400 font-mono font-bold">{formatStat(stats.median)}</div>
                                                            </div>
                                                            <div>
                                                                <div className="text-[8px] text-gray-600 uppercase">Max</div>
                                                                <div className="text-[11px] text-[#ff9800] font-mono font-bold">{formatStat(stats.max)}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-4">
                                <Empty description="Chưa chọn mã chứng khoán" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                                <div className="text-[10px] uppercase font-mono tracking-widest bg-gray-900 px-4 py-2 rounded-full border border-gray-800">
                                    Vui lòng nhập mã để bắt đầu so sánh
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* RIGHT PANEL - CHART */}
            <div className={`flex flex-col gap-4 transition-all duration-300 ${maximizedPanel === 'right' ? 'absolute inset-0 z-50 w-full h-full bg-[#030712]' :
                maximizedPanel === 'left' ? 'hidden' : 'w-1/2'
                }`}>
                <Card
                    className="border-none bg-[#0b0e11] shadow-2xl flex-1"
                    title={
                        <div className="flex justify-between items-center gap-4">
                            <div className="flex items-center gap-2 min-w-fit">
                                <Activity size={16} className="text-[#1677ff]" />
                                <span className="text-[#e0e0e0] font-mono font-bold text-xs uppercase">Phân tích Trend</span>
                            </div>

                            <Select
                                showSearch
                                placeholder="Tìm chỉ tiêu..."
                                className="flex-1 max-w-[500px]"
                                size="small"
                                value={chartMetric}
                                onChange={setChartMetric}
                                dropdownStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #333' }}
                                optionFilterProp="children"
                                filterOption={(input, option) =>
                                    String(option?.value ?? "").toLowerCase().includes(input.toLowerCase())
                                }
                            >
                                {metricGroups.map(group => (
                                    <Select.OptGroup key={group.key} label={<span className="text-[10px] uppercase tracking-widest" style={{ color: group.color }}>{group.name}</span>}>
                                        {group.filteredKeys.map(k => (
                                            <Select.Option key={k} value={k}>
                                                <span className="text-gray-300 text-[11px]">{k}</span>
                                            </Select.Option>
                                        ))}
                                    </Select.OptGroup>
                                ))}
                            </Select>

                            <div className="flex items-center gap-2">
                                <Button.Group size="small" className="min-w-fit">
                                    <Tooltip title="Biểu đồ cột">
                                        <Button
                                            icon={<BarChart3 size={12} />}
                                            onClick={() => setChartType('bar')}
                                            type={chartType === 'bar' ? 'primary' : 'default'}
                                        />
                                    </Tooltip>
                                    <Tooltip title="Biểu đồ cột chồng">
                                        <Button
                                            icon={<Layers size={12} />}
                                            onClick={() => setChartType('stacked')}
                                            type={chartType === 'stacked' ? 'primary' : 'default'}
                                        />
                                    </Tooltip>
                                    <Tooltip title="Biểu đồ đường">
                                        <Button
                                            icon={<LineChart size={12} />}
                                            onClick={() => setChartType('line')}
                                            type={chartType === 'line' ? 'primary' : 'default'}
                                        />
                                    </Tooltip>
                                </Button.Group>

                                <Button
                                    size="small"
                                    icon={maximizedPanel === 'right' ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                                    onClick={() => setMaximizedPanel(maximizedPanel === 'right' ? 'none' : 'right')}
                                    className="bg-transparent border-gray-700 text-gray-500"
                                />
                            </div>
                        </div>
                    }
                >
                    {selectedSymbols.length > 0 ? (
                        <ReactECharts
                            key={selectedSymbols.join(',')}
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
