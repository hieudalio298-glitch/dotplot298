import React, { useEffect, useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, Radio, Empty, Button, Space, Tooltip, Dropdown, Modal, Input, message, App, Spin, Divider } from 'antd';
import { useDroppable } from '@dnd-kit/core';
import { Activity, RefreshCw, BarChart, LineChart, Layers, X, Settings2, Plus, Trash2, Maximize2, Minimize2, Save, FolderOpen, Edit2, Check, FilePlus } from 'lucide-react';
import { supabase } from '../supabaseClient';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface ChartInstance {
    id: string;
    name: string;
    selectedMetrics: string[];
    metricAxes: Record<string, number>;
    metricTypes: Record<string, 'line' | 'bar' | 'stack'>;
    metricColors: Record<string, string>;
    chartType: 'line' | 'bar' | 'stack';
}

interface SavedChartConfig {
    id: string;
    chart_name: string;
    symbol: string;
    period: 'year' | 'quarter';
    chart_instances: ChartInstance[];
    created_at: string;
    updated_at: string;
}

const parseFinancialValue = (val: any) => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return val;
    let s = String(val).replace(/,/g, '').replace(/\s/g, '').trim();
    // Handle (1,234.56) -> -1234.56
    if (s.startsWith('(') && s.endsWith(')')) {
        s = '-' + s.substring(1, s.length - 1);
    }
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
};

interface Props {
    symbol: string | null;
    user: SupabaseUser | null;
    refreshTrigger?: number;
}

const FinancialChart: React.FC<Props> = ({ symbol, user, refreshTrigger = 0 }) => {
    const dataCache = React.useRef<Record<string, any[]>>({});
    const { modal, message: messageApi } = App.useApp();
    const [period, setPeriod] = useState<'year' | 'quarter'>('year');
    const [chartData, setChartData] = useState<any[]>([]);
    const [chartInstances, setChartInstances] = useState<ChartInstance[]>([
        {
            id: '1',
            name: 'Chart 1',
            selectedMetrics: [],
            metricAxes: {},
            metricTypes: {},
            metricColors: {},
            chartType: 'line'
        }
    ]);
    const [configName, setConfigName] = useState<string>('');
    const [savedConfigs, setSavedConfigs] = useState<SavedChartConfig[]>([]);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showLoadModal, setShowLoadModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [currentConfigId, setCurrentConfigId] = useState<string | null>(null);
    const [secondsWaited, setSecondsWaited] = useState(0);

    useEffect(() => {
        let timer: any;
        if (loading) {
            setSecondsWaited(0);
            timer = setInterval(() => {
                setSecondsWaited(prev => prev + 1);
            }, 1000);
        } else {
            setSecondsWaited(0);
        }
        return () => clearInterval(timer);
    }, [loading]);

    useEffect(() => {
        if (refreshTrigger > 0) {
            dataCache.current = {}; // Clear cache on manual refresh
        }
        if (symbol) fetchChartData();
    }, [symbol, period, refreshTrigger]);

    useEffect(() => {
        loadSavedConfigs();
    }, [user, showLoadModal]);

    const ALIAS = {
        REV: ['Doanh thu thuần', 'Doanh thu thuần về bán hàng và cung cấp dịch vụ', 'Doanh thu bán hàng và cung cấp dịch vụ', 'Thu nhập lãi', 'Doanh thu'],
        COGS: ['Giá vốn hàng bán', 'Chi phí hoạt động', 'Chi phí lãi'],
        INV: ['Hàng tồn kho'],
        REC: ['Phải thu của khách hàng', 'Phải thu ngắn hạn', 'Các khoản cho vay', 'Các khoản phải thu'],
        FA: ['Tài sản cố định hữu hình', 'Tài sản cố định'],
        EBIT: ['Lợi nhuận thuần từ hoạt động kinh doanh', 'Lợi nhuận từ hoạt động kinh doanh'],
        NI: ['Lợi nhuận sau thuế thu nhập doanh nghiệp', 'Lợi nhuận sau thuế TNDN', 'Lợi nhuận sau thuế', 'Lợi nhuận ròng'],
        NI_PARENT: ['Lợi nhuận sau thuế của cổ đông của Công ty mẹ', 'Lợi nhuận sau thuế của cổ đông công ty mẹ'],
        GP: ['Lợi nhuận gộp về bán hàng và cung cấp dịch vụ', 'Lợi nhuận gộp'],
        INTEREST: ['Chi phí lãi vay'],
        SHORT_DEBT: ['Vay ngắn hạn', 'Vay và nợ thuê tài chính ngắn hạn'],
        LONG_DEBT: ['Vay dài hạn', 'Vay và nợ thuê tài chính dài hạn'],
        EQUITY: ['Vốn chủ sở hữu', 'Vốn và các quỹ'],
        ASSETS: ['Tổng cộng tài sản', 'Tổng tài sản'],
        PAYABLES: ['Phải trả người bán'],
        CUR_ASSETS: ['Tài sản ngắn hạn'],
        CUR_LIAB: ['Nợ ngắn hạn'],
        CASH: ['Tiền và các khoản tương đương tiền', 'Tiền'],
    };

    const findVal = (data: any, aliases: string[]) => {
        if (!data) return 0;
        const keys = Object.keys(data);
        const cleanStr = (s: string) => s.toLowerCase().replace(/^[0-9ivx.-]+\s*/i, '').replace(/[:\s]/g, '').trim();

        for (const alias of aliases) {
            const ca = cleanStr(alias);
            const match = keys.find(k => cleanStr(k) === ca);
            if (match !== undefined) {
                return parseFinancialValue(data[match]);
            }
        }

        for (const alias of aliases) {
            const ca = cleanStr(alias);
            if (ca.length < 5) continue;
            const match = keys.find(k => cleanStr(k).includes(ca));
            if (match !== undefined) {
                return parseFinancialValue(data[match]);
            }
        }
        return 0;
    };

    const fetchChartData = async () => {
        if (!symbol) return;

        const cacheKey = `${symbol}_${period}`;
        if (dataCache.current[cacheKey]) {
            setChartData(dataCache.current[cacheKey]);
            return;
        }

        setLoading(true);
        try {
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

            const dataMap = new Map();
            merged.forEach(record => {
                const key = `${record.Năm || record.year}-${record.Quý || record.quarter || 0}`;
                const existing = dataMap.get(key) || {};
                const normalizedRecord: any = {};
                Object.keys(record).forEach(k => {
                    const cleanKey = k.replace(/^_+/, '');
                    normalizedRecord[cleanKey] = record[k];
                });
                dataMap.set(key, { ...existing, ...normalizedRecord });
            });

            const uniqueData = Array.from(dataMap.values());
            uniqueData.sort((a, b) => {
                const ya = parseInt(a.Năm || a.year || 0);
                const yb = parseInt(b.Năm || b.year || 0);
                if (ya !== yb) return ya - yb;
                return (a.Quý || 0) - (b.Quý || 0);
            });

            const enrichedData = uniqueData.map((d, index) => {
                let prevD = null;
                if (period === 'year') {
                    prevD = index > 0 ? uniqueData[index - 1] : null;
                } else {
                    const curY = parseInt(d.Năm || d.year || '0');
                    const curQ = parseInt(d.Quý || d.quarter || '0');
                    prevD = uniqueData.find(item =>
                        parseInt(item.Năm || item.year || '0') === curY - 1 &&
                        parseInt(item.Quý || item.quarter || '0') === curQ
                    );
                }
                const enriched = { ...d };

                const ratios = [
                    {
                        metric: 'ROIC (%)', compute: (data: any) => {
                            const ebit = findVal(data, ALIAS.EBIT);
                            const equity = findVal(data, ALIAS.EQUITY);
                            const longDebt = findVal(data, ALIAS.LONG_DEBT);
                            return (equity + longDebt) > 0 ? (ebit * 0.8 / (equity + longDebt)) * 100 : 0;
                        }
                    },
                    {
                        metric: 'Thanh toán hiện hành (Current Ratio)', compute: (data: any) => {
                            const ca = findVal(data, ALIAS.CUR_ASSETS);
                            const cl = findVal(data, ALIAS.CUR_LIAB);
                            return cl > 0 ? ca / cl : 0;
                        }
                    },
                    {
                        metric: 'Thanh toán nhanh (Quick Ratio)', compute: (data: any) => {
                            const ca = findVal(data, ALIAS.CUR_ASSETS);
                            const inv = findVal(data, ALIAS.INV);
                            const cl = findVal(data, ALIAS.CUR_LIAB);
                            return cl > 0 ? (ca - inv) / cl : 0;
                        }
                    },
                    {
                        metric: 'Thanh toán tức thời (Cash Ratio)', compute: (data: any) => {
                            const cash = findVal(data, ALIAS.CASH);
                            const cl = findVal(data, ALIAS.CUR_LIAB);
                            return cl > 0 ? cash / cl : 0;
                        }
                    },
                    {
                        metric: 'Nợ/Tổng tài sản (%)', compute: (data: any) => {
                            const debt = findVal(data, ALIAS.SHORT_DEBT) + findVal(data, ALIAS.LONG_DEBT);
                            const assets = findVal(data, ALIAS.ASSETS);
                            return assets > 0 ? (debt / assets) * 100 : 0;
                        }
                    },
                    {
                        metric: 'VCSH/Tổng tài sản (%)', compute: (data: any) => {
                            const equity = findVal(data, ALIAS.EQUITY);
                            const assets = findVal(data, ALIAS.ASSETS);
                            return assets > 0 ? (equity / assets) * 100 : 0;
                        }
                    },
                    {
                        metric: 'Nợ/VCSH (D/E)', compute: (data: any) => {
                            const debt = findVal(data, ALIAS.SHORT_DEBT) + findVal(data, ALIAS.LONG_DEBT);
                            const equity = findVal(data, ALIAS.EQUITY);
                            return equity > 0 ? debt / equity : 0;
                        }
                    },
                    {
                        metric: 'Vòng quay hàng tồn kho (lần)', compute: (data: any) => {
                            const cogs = Math.abs(findVal(data, ALIAS.COGS));
                            const inv = findVal(data, ALIAS.INV);
                            return inv > 0 ? cogs / inv : 0;
                        }
                    },
                    {
                        metric: 'Số ngày tồn kho (DSI)', compute: (data: any) => {
                            const cogs = Math.abs(findVal(data, ALIAS.COGS));
                            const inv = findVal(data, ALIAS.INV);
                            return cogs > 0 ? (inv * 365) / cogs : 0;
                        }
                    },
                    {
                        metric: 'Vòng quay khoản phải thu (lần)', compute: (data: any) => {
                            const rev = findVal(data, ALIAS.REV);
                            const rec = findVal(data, ALIAS.REC);
                            return rec > 0 ? rev / rec : 0;
                        }
                    },
                    {
                        metric: 'Số ngày phải thu (DSO)', compute: (data: any) => {
                            const rev = findVal(data, ALIAS.REV);
                            const rec = findVal(data, ALIAS.REC);
                            return rev > 0 ? (rec * 365) / rev : 0;
                        }
                    },
                    {
                        metric: 'Chu kỳ tiền mặt (CCC)', compute: (data: any) => {
                            const cogs = Math.abs(findVal(data, ALIAS.COGS));
                            const rev = findVal(data, ALIAS.REV);
                            const inv = findVal(data, ALIAS.INV);
                            const rec = findVal(data, ALIAS.REC);
                            const pay = findVal(data, ALIAS.PAYABLES);
                            const dsi = cogs > 0 ? (inv * 365) / cogs : 0;
                            const dso = rev > 0 ? (rec * 365) / rev : 0;
                            const dpo = cogs > 0 ? (pay * 365) / cogs : 0;
                            return dsi + dso - dpo;
                        }
                    },
                    {
                        metric: 'Vòng quay tài sản cố định (FAT)', compute: (data: any) => {
                            const rev = findVal(data, ALIAS.REV);
                            const fa = findVal(data, ALIAS.FA);
                            return fa > 0 ? rev / fa : 0;
                        }
                    },
                    {
                        metric: 'Tăng trưởng doanh thu (%)', compute: (data: any, prev: any) => {
                            if (!prev) return 0;
                            const rev = findVal(data, ALIAS.REV);
                            const pRev = findVal(prev, ALIAS.REV);
                            return pRev > 0 ? ((rev - pRev) / pRev) * 100 : 0;
                        }
                    },
                    {
                        metric: 'Tăng trưởng LNST (%)', compute: (data: any, prev: any) => {
                            if (!prev) return 0;
                            const ni = findVal(data, ALIAS.NI);
                            const pNi = findVal(prev, ALIAS.NI);
                            return pNi > 0 ? ((ni - pNi) / pNi) * 100 : 0;
                        }
                    },
                    {
                        metric: 'Tăng trưởng LNST Cty mẹ (%)', compute: (data: any, prev: any) => {
                            if (!prev) return 0;
                            const val = findVal(data, ALIAS.NI_PARENT);
                            const pVal = findVal(prev, ALIAS.NI_PARENT);
                            return pVal > 0 ? ((val - pVal) / pVal) * 100 : 0;
                        }
                    },
                    {
                        metric: 'Tăng trưởng LN từ HĐKD (%)', compute: (data: any, prev: any) => {
                            if (!prev) return 0;
                            const val = findVal(data, ALIAS.EBIT);
                            const pVal = findVal(prev, ALIAS.EBIT);
                            return pVal > 0 ? ((val - pVal) / pVal) * 100 : 0;
                        }
                    },
                    {
                        metric: 'Biên lợi nhuận gộp (%)', compute: (data: any) => {
                            const rev = findVal(data, ALIAS.REV);
                            const gp = findVal(data, ALIAS.GP);
                            return rev > 0 ? (gp / rev) * 100 : 0;
                        }
                    },
                    {
                        metric: 'Biên lợi nhuận ròng (%)', compute: (data: any) => {
                            const rev = findVal(data, ALIAS.REV);
                            const ni = findVal(data, ALIAS.NI);
                            return rev > 0 ? (ni / rev) * 100 : 0;
                        }
                    },
                    {
                        metric: 'Biên EBIT (%)', compute: (data: any) => {
                            const rev = findVal(data, ALIAS.REV);
                            const ebit = findVal(data, ALIAS.EBIT);
                            return rev > 0 ? (ebit / rev) * 100 : 0;
                        }
                    },
                    {
                        metric: 'ROE (%)', compute: (data: any) => {
                            const ni = findVal(data, ALIAS.NI);
                            const equity = findVal(data, ALIAS.EQUITY);
                            return equity > 0 ? (ni / equity) * 100 : 0;
                        }
                    },
                    {
                        metric: 'ROA (%)', compute: (data: any) => {
                            const ni = findVal(data, ALIAS.NI);
                            const assets = findVal(data, ALIAS.ASSETS);
                            return assets > 0 ? (ni / assets) * 100 : 0;
                        }
                    },
                ];

                ratios.forEach(r => {
                    enriched[r.metric] = r.compute(d, prevD);
                });

                return enriched;
            });

            setChartData(enrichedData);
            dataCache.current[cacheKey] = enrichedData;
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const addNewChart = () => {
        const newId = String(chartInstances.length + 1);
        setChartInstances([...chartInstances, {
            id: newId,
            name: `Chart ${newId}`,
            selectedMetrics: [],
            metricAxes: {},
            metricTypes: {},
            metricColors: {},
            chartType: 'line'
        }]);
    };

    const loadSavedConfigs = async () => {
        try {
            if (!user) {
                setSavedConfigs([]);
                return;
            }

            const { data, error } = await supabase
                .from('user_chart_configs')
                .select('*')
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false });

            if (error) throw error;
            setSavedConfigs(data || []);
        } catch (error) {
            console.error('Error loading configs:', error);
            setSavedConfigs([]);
        }
    };

    const saveConfiguration = async () => {
        if (!configName.trim()) {
            messageApi.error('Please enter a configuration name');
            return;
        }

        try {
            if (!user) {
                messageApi.error('Please login to save configurations');
                return;
            }

            const configData = {
                user_id: user.id,
                chart_name: configName,
                symbol: symbol,
                period: period,
                chart_instances: chartInstances,
                updated_at: new Date().toISOString()
            };

            if (currentConfigId) {
                // Update existing
                const { error } = await supabase
                    .from('user_chart_configs')
                    .update(configData)
                    .eq('id', currentConfigId);

                if (error) throw error;
                messageApi.success(`Updated configuration: ${configName}`);
            } else {
                // Insert new
                const { data, error } = await supabase
                    .from('user_chart_configs')
                    .insert(configData)
                    .select()
                    .single();

                if (error) throw error;
                if (data) {
                    setCurrentConfigId(data.id);
                }
                messageApi.success('Configuration saved successfully!');
            }

            setShowSaveModal(false);
            loadSavedConfigs();
        } catch (error) {
            console.error('Error saving config:', error);
            messageApi.error('Failed to save configuration');
        }
    };

    const loadConfiguration = (config: SavedChartConfig) => {
        setCurrentConfigId(config.id);
        setConfigName(config.chart_name);
        setChartInstances(config.chart_instances);
        setPeriod(config.period);
        setShowLoadModal(false);
        messageApi.success(`Loaded: ${config.chart_name}`);
    };

    const deleteConfiguration = (configId: string, name: string) => {
        modal.confirm({
            title: 'Delete Configuration',
            content: `Are you sure you want to delete "${name}"?`,
            okText: 'Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            centered: true,
            styles: {
                mask: { backdropFilter: 'blur(4px)' }
            },
            onOk: async () => {
                const hide = messageApi.loading('Deleting...', 0);
                try {
                    const { error } = await supabase
                        .from('user_chart_configs')
                        .delete()
                        .eq('id', configId);

                    if (error) throw error;

                    messageApi.success('Configuration deleted successfully');
                    loadSavedConfigs();
                } catch (error) {
                    console.error('Error deleting config:', error);
                    messageApi.error('Failed to delete configuration');
                } finally {
                    hide();
                }
            }
        });
    };

    const createNewConfig = () => {
        modal.confirm({
            title: 'Create New Configuration',
            content: 'This will reset your current chart setup. Any unsaved changes will be lost. Continue?',
            okText: 'Yes, New Config',
            cancelText: 'Cancel',
            centered: true,
            styles: {
                mask: { backdropFilter: 'blur(4px)' }
            },
            onOk: () => {
                setConfigName('');
                setCurrentConfigId(null);
                setChartInstances([
                    {
                        id: '1',
                        name: 'Chart 1',
                        selectedMetrics: [],
                        metricAxes: {},
                        metricTypes: {},
                        metricColors: {},
                        chartType: 'line'
                    }
                ]);
                messageApi.success('Started new configuration');
            }
        });
    };

    const removeChart = (id: string) => {
        if (chartInstances.length === 1) return;
        setChartInstances(chartInstances.filter(c => c.id !== id));
    };

    const updateChart = (id: string, updates: Partial<ChartInstance>) => {
        setChartInstances(chartInstances.map(c =>
            c.id === id ? { ...c, ...updates } : c
        ));
    };

    if (!symbol) return <Empty description="Select symbol" image={Empty.PRESENTED_IMAGE_SIMPLE} />;

    return (
        <div className="space-y-4 relative">
            {loading && (
                <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-6">
                        <Spin
                            size="large"
                            indicator={<RefreshCw className="text-[#ff9800] animate-spin" size={64} />}
                        />
                        <div className="flex flex-col items-center space-y-2">
                            <span className="text-[#ff9800] font-mono text-xl animate-pulse tracking-widest font-bold">
                                WAITING A MOMENT...
                            </span>
                            <span className="text-[#e0e0e0] font-mono text-4xl font-bold">
                                {secondsWaited}s
                            </span>
                        </div>
                    </div>
                </div>
            )}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Activity className="text-[#ff9800]" size={16} />
                    <span className="text-[#e0e0e0] font-bold tracking-tight uppercase font-mono">{symbol} FINANCIAL CHARTS</span>
                </div>
                <Space>
                    <Radio.Group value={period} onChange={e => setPeriod(e.target.value)} size="small" buttonStyle="solid">
                        <Radio.Button value="year" className="!text-[#e0e0e0]">YEAR</Radio.Button>
                        <Radio.Button value="quarter" className="!text-[#e0e0e0]">QTR</Radio.Button>
                    </Radio.Group>
                    <Tooltip title="Start New Configuration">
                        <Button
                            size="small"
                            icon={<FilePlus size={14} />}
                            onClick={createNewConfig}
                            className="bg-transparent border-[#00e676] text-[#00e676] hover:bg-[#00e676]/10 rounded-none uppercase font-mono"
                        >
                            New
                        </Button>
                    </Tooltip>
                    <Tooltip title="Load Saved Configuration">
                        <Button
                            size="small"
                            icon={<FolderOpen size={14} />}
                            onClick={() => setShowLoadModal(true)}
                            className="bg-transparent border-[#ff9800] text-[#ff9800] hover:bg-[#ff9800]/10 rounded-none uppercase font-mono"
                        >
                            Load
                        </Button>
                    </Tooltip>
                    <Tooltip title="Save Configuration">
                        <Button
                            size="small"
                            icon={<Save size={14} />}
                            onClick={() => setShowSaveModal(true)}
                            className="bg-transparent border-[#1677ff] text-[#1677ff] hover:bg-[#1677ff]/10 rounded-none uppercase font-mono"
                        >
                            Save
                        </Button>
                    </Tooltip>
                    <Button
                        size="small"
                        icon={<Plus size={14} />}
                        onClick={addNewChart}
                        className="bg-[#ff9800] border-none text-black hover:bg-[#ff9800]/80 rounded-none uppercase font-mono font-bold"
                    >
                        ADD CHART
                    </Button>
                    <Tooltip title="Force Update Data">
                        <Button
                            size="small"
                            icon={<RefreshCw size={14} />}
                            onClick={() => {
                                // Clear cache to force refetch
                                dataCache.current = {};
                                fetchChartData();
                            }}
                            className="bg-transparent border-[#e91e63] text-[#e91e63] hover:bg-[#e91e63]/10 rounded-none uppercase font-mono"
                        >
                            UPDATE
                        </Button>
                    </Tooltip>
                </Space>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {chartInstances.map((chart) => (
                    <ChartCard
                        key={chart.id}
                        chart={chart}
                        chartData={chartData}
                        period={period}
                        onUpdate={(updates) => updateChart(chart.id, updates)}
                        onRemove={() => removeChart(chart.id)}
                        canRemove={chartInstances.length > 1}
                    />
                ))}
            </div>

            <Modal
                title={
                    <div className="flex items-center gap-2">
                        <Save className="text-[#1677ff]" size={18} />
                        <span className="text-[#e0e0e0] font-mono font-bold">SAVE CONFIGURATION</span>
                    </div>
                }
                open={showSaveModal}
                onOk={saveConfiguration}
                onCancel={() => {
                    setShowSaveModal(false);
                    setConfigName('');
                }}
                okText="Save"
                cancelText="Cancel"
                className="financial-save-modal"
                styles={{
                    body: { background: '#0a0a0a', padding: '20px' },
                    header: { background: '#0a0a0a', borderBottom: '1px solid #333' },
                    content: { background: '#0a0a0a' }
                }}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-[#888] text-xs mb-2 font-mono">CONFIGURATION NAME</label>
                        <Input
                            placeholder="e.g., My ROE Analysis"
                            value={configName}
                            onChange={e => setConfigName(e.target.value)}
                            className="bg-[#000] border-[#333] text-[#e0e0e0]"
                            onPressEnter={saveConfiguration}
                        />
                    </div>
                    <div className="text-[#666] text-xs">
                        <p>This will save:</p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>{chartInstances.length} chart(s)</li>
                            <li>Symbol: {symbol}</li>
                            <li>Period: {period === 'year' ? 'Yearly' : 'Quarterly'}</li>
                        </ul>
                    </div>
                </div>
            </Modal>

            <Modal
                title={
                    <div className="flex items-center gap-2">
                        <FolderOpen className="text-[#ff9800]" size={18} />
                        <span className="text-[#e0e0e0] font-mono font-bold">LOAD CONFIGURATION</span>
                    </div>
                }
                open={showLoadModal}
                onCancel={() => setShowLoadModal(false)}
                footer={null}
                width={700}
                className="financial-load-modal"
                styles={{
                    body: { background: '#0a0a0a', padding: '20px', maxHeight: '60vh', overflowY: 'auto' },
                    header: { background: '#0a0a0a', borderBottom: '1px solid #333' },
                    content: { background: '#0a0a0a' }
                }}
            >
                {savedConfigs.length === 0 ? (
                    <Empty
                        description={<span className="text-[#666]">No saved configurations yet</span>}
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                ) : (
                    <div className="space-y-2">
                        {savedConfigs.map(config => (
                            <div
                                key={config.id}
                                className="p-3 bg-[#111] border border-[#333] hover:border-[#ff9800] transition-all cursor-pointer group"
                                onClick={() => loadConfiguration(config)}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[#e0e0e0] font-mono font-bold text-sm">{config.chart_name}</span>
                                            <span className="text-[#666] text-xs">
                                                {config.chart_instances.length} chart(s)
                                            </span>
                                        </div>
                                        <div className="mt-1 text-[#888] text-xs space-x-3">
                                            <span className="text-[#ff9800] bg-[#ff9800]/10 px-1 border border-[#ff9800]/20">{config.symbol}</span>
                                            <span>Period: {config.period === 'year' ? 'Yearly' : 'Quarterly'}</span>
                                            <span>Updated: {new Date(config.updated_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <Button
                                        size="small"
                                        type="text"
                                        danger
                                        icon={<Trash2 size={12} />}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteConfiguration(config.id, config.chart_name);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Modal>
        </div>
    );
};

interface ChartCardProps {
    chart: ChartInstance;
    chartData: any[];
    period: 'year' | 'quarter';
    onUpdate: (updates: Partial<ChartInstance>) => void;
    onRemove: () => void;
    canRemove: boolean;
}

const ChartCard: React.FC<ChartCardProps> = ({ chart, chartData, period, onUpdate, onRemove, canRemove }) => {
    const [isZoomed, setIsZoomed] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState(chart.name);

    const { setNodeRef, isOver } = useDroppable({
        id: `financial-chart-${chart.id}`,
    });

    const COLORS = [
        '#ff9800', '#1677ff', '#00e676', '#e91e63', '#9c27b0',
        '#00bcd4', '#ffc107', '#795548', '#607d8b', '#f44336',
        '#2196f3', '#4caf50', '#ffeb3b', '#673ab7', '#3f51b5',
        '#e0e0e0', '#333333', '#1a237e', '#004d40', '#b71c1c'
    ];

    useEffect(() => {
        const handleGlobalDrop = (e: any) => {
            if (e.detail.overId === `financial-chart-${chart.id}`) {
                const metric = e.detail.metric;
                if (!chart.selectedMetrics.includes(metric)) {
                    onUpdate({
                        selectedMetrics: [...chart.selectedMetrics, metric],
                        metricColors: {
                            ...chart.metricColors,
                            [metric]: COLORS[chart.selectedMetrics.length % COLORS.length]
                        },
                        metricTypes: {
                            ...chart.metricTypes,
                            [metric]: chart.chartType
                        }
                    });
                }
            }
        };
        document.addEventListener('financialMetricDropped', handleGlobalDrop);
        return () => document.removeEventListener('financialMetricDropped', handleGlobalDrop);
    }, [chart]);

    const handleNameSave = () => {
        if (tempName.trim()) {
            onUpdate({ name: tempName.trim() });
        } else {
            setTempName(chart.name);
        }
        setIsEditingName(false);
    };

    const getOption = useMemo(() => {
        if (!chartData.length) return {};

        const xAxisData = chartData.map(item => {
            const y = item.Năm || item.year;
            const q = item.Quý || item.quarter;
            return q ? `Q${q}/${y}` : `${y}`;
        });

        const series = chart.selectedMetrics.map((metric, index) => {
            const color = chart.metricColors[metric] || COLORS[index % COLORS.length];
            const axisIndex = chart.metricAxes[metric] || 0;

            // Determine type: specific override > chart global type > default
            // If chart is 'stack', force series to be 'bar' with stack property
            let displayType = chart.metricTypes[metric] || chart.chartType;
            let stackProp = undefined;

            if (chart.chartType === 'stack') {
                displayType = 'bar';
                stackProp = 'total';
            }

            const baseSeries: any = {
                name: metric,
                yAxisIndex: axisIndex,
                data: chartData.map(item => {
                    let val = item[metric];
                    if (val === undefined || val === null) {
                        const itemKeys = Object.keys(item);
                        const fuzzyKey = itemKeys.find(k =>
                            k.toLowerCase().trim() === metric.toLowerCase().trim() ||
                            k.toLowerCase().includes(metric.toLowerCase())
                        );
                        if (fuzzyKey) val = item[fuzzyKey];
                    }
                    return parseFinancialValue(val);
                }),
                itemStyle: { color },
                emphasis: { focus: 'series' }
            };

            if (displayType === 'line') {
                return {
                    ...baseSeries,
                    type: 'line',
                    smooth: true,
                    symbol: 'circle',
                    symbolSize: isZoomed ? 6 : 4,
                    lineStyle: { width: isZoomed ? 3 : 2 },
                };
            } else {
                // Bar or Stack (which is a bar)
                return {
                    ...baseSeries,
                    type: 'bar',
                    stack: stackProp,
                    barMaxWidth: isZoomed ? 25 : 15,
                };
            }
        });

        return {
            backgroundColor: '#000000',
            legend: isZoomed ? {
                show: true,
                textStyle: { color: '#888', fontSize: 10, fontFamily: 'Roboto Mono' },
                top: '0%',
                type: 'scroll',
                pageIconColor: '#ff9800',
                pageTextStyle: { color: '#fff' }
            } : { show: false },
            tooltip: {
                trigger: 'item',
                backgroundColor: 'rgba(20, 20, 20, 0.95)',
                borderColor: '#333',
                textStyle: { color: '#e0e0e0', fontSize: isZoomed ? 12 : 10 },
                formatter: (params: any) => {
                    if (!params) return '';
                    // Khi dùng trigger: 'item', params là 1 object đơn lẻ thay vì array
                    const item = Array.isArray(params) ? params[0] : params;
                    const val = item.value;
                    const name = item.seriesName;
                    const axisValue = item.name || item.axisValue; // Lấy kỳ báo cáo

                    let result = `<div style="font-weight:700;margin-bottom:6px;color:#ff9800;font-size:${isZoomed ? 13 : 11}px;">${axisValue}</div>`;

                    const isPercent = name.includes('%') || ['ROIC', 'ROE', 'ROA', 'Biên', 'Tăng trưởng'].some((k: string) => name.includes(k));
                    const formattedVal = isPercent
                        ? Number(val).toFixed(2) + '%'
                        : Math.abs(val) >= 1e9
                            ? (val / 1e9).toFixed(2) + ' B'
                            : Number(val).toLocaleString();

                    result += `<div style="display:flex;justify-content:space-between;gap:16px;font-size:${isZoomed ? 11 : 10}px;margin-bottom:2px;">
                        <span>${item.marker} <span style="max-width:200px;overflow:hidden;text-overflow:ellipsis;">${name}</span></span>
                        <span style="font-weight:600;color:#fff;">${formattedVal}</span>
                    </div>`;

                    return result;
                }
            },
            grid: {
                top: isZoomed ? '8%' : '10%',
                left: '5%',
                right: '5%',
                bottom: isZoomed ? '10%' : '15%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: xAxisData,
                axisLine: { lineStyle: { color: '#333' } },
                axisLabel: { color: '#666', fontSize: isZoomed ? 11 : 9 },
            },
            yAxis: [
                {
                    type: 'value',
                    splitLine: { lineStyle: { color: '#1a1a1a' } },
                    axisLabel: {
                        color: '#666',
                        fontSize: isZoomed ? 11 : 9,
                        formatter: (value: number) => {
                            if (Math.abs(value) >= 1e9) return (value / 1e9).toFixed(0) + 'B';
                            if (Math.abs(value) >= 1e6) return (value / 1e6).toFixed(0) + 'M';
                            return value.toLocaleString();
                        }
                    }
                },
                {
                    type: 'value',
                    splitLine: { show: false },
                    axisLabel: {
                        color: '#ff9800',
                        fontSize: isZoomed ? 11 : 9,
                        formatter: (value: number) => {
                            if (Math.abs(value) >= 1e9) return (value / 1e9).toFixed(0) + 'B';
                            return value.toLocaleString();
                        }
                    }
                }
            ],
            series: series
        };
    }, [chartData, chart, isZoomed]);

    const updateMetricAxis = (metric: string, axis: number) => {
        onUpdate({
            metricAxes: { ...chart.metricAxes, [metric]: axis }
        });
    };

    const updateMetricType = (metric: string, type: 'line' | 'bar' | 'stack') => {
        onUpdate({
            metricTypes: { ...chart.metricTypes, [metric]: type }
        });
    };

    const updateMetricColor = (metric: string, color: string) => {
        onUpdate({
            metricColors: { ...chart.metricColors, [metric]: color }
        });
    };

    const removeMetric = (metric: string) => {
        onUpdate({
            selectedMetrics: chart.selectedMetrics.filter(m => m !== metric)
        });
    };

    return (
        <>
            <Card
                className="bg-[#0a0a0a] border-[#333] hover:border-[#555] transition-all duration-300"
                size="small"
                bodyStyle={{ padding: '12px' }}
                title={
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-4 bg-[#ff9800] rounded-full" />
                            {isEditingName ? (
                                <Input
                                    value={tempName}
                                    onChange={e => setTempName(e.target.value)}
                                    onBlur={handleNameSave}
                                    onPressEnter={handleNameSave}
                                    size="small"
                                    className="w-32 bg-[#000] border-[#333] text-[#e0e0e0] text-xs font-mono"
                                    autoFocus
                                />
                            ) : (
                                <div className="flex items-center gap-1 group">
                                    <span className="text-[#e0e0e0] text-xs font-mono font-bold">{chart.name}</span>
                                    <Edit2
                                        size={10}
                                        className="text-[#666] opacity-0 group-hover:opacity-100 cursor-pointer hover:text-[#1677ff] transition-all"
                                        onClick={() => setIsEditingName(true)}
                                    />
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {canRemove && (
                                <Tooltip title="Delete Chart">
                                    <Button
                                        size="small"
                                        type="text"
                                        icon={<Trash2 size={12} />}
                                        className="text-[#666] hover:text-red-500 hover:bg-red-500/10 border-none"
                                        onClick={onRemove}
                                    />
                                </Tooltip>
                            )}
                        </div>
                    </div>
                }
                extra={
                    <Space size={8}>
                        <div className="flex bg-[#000] border border-[#333] rounded p-0.5 gap-0.5 items-center">
                            {[
                                { id: 'line', icon: LineChart, label: 'Line' },
                                { id: 'bar', icon: BarChart, label: 'Bar' },
                                { id: 'stack', icon: Layers, label: 'Stack' }
                            ].map((type) => (
                                <Tooltip title={type.label} key={type.id}>
                                    <button
                                        onClick={() => onUpdate({ chartType: type.id as any })}
                                        className={`
                                            w-6 h-6 flex items-center justify-center rounded-sm transition-all
                                            ${chart.chartType === type.id
                                                ? 'bg-[#ff9800] text-black shadow-sm'
                                                : 'text-[#666] hover:text-[#e0e0e0] hover:bg-[#222]'}
                                        `}
                                    >
                                        <type.icon size={13} strokeWidth={2} />
                                    </button>
                                </Tooltip>
                            ))}
                        </div>
                        <Divider type="vertical" className="bg-[#333] h-4" />
                        <Tooltip title="Reset">
                            <Button
                                size="small"
                                type="text"
                                icon={<RefreshCw size={10} />}
                                onClick={() => onUpdate({ selectedMetrics: [], metricAxes: {}, metricTypes: {}, metricColors: {} })}
                                className="text-[#666] hover:text-[#ff9800] hover:bg-[#ff9800]/10 border-none"
                            />
                        </Tooltip>
                        <Tooltip title="Zoom">
                            <Button
                                size="small"
                                type="text"
                                icon={<Maximize2 size={10} />}
                                onClick={() => setIsZoomed(true)}
                                className="text-[#666] hover:text-[#1677ff] hover:bg-[#1677ff]/10 border-none"
                            />
                        </Tooltip>
                    </Space>
                }
            >
                <div
                    ref={setNodeRef}
                    style={{
                        height: '300px',
                        border: isOver ? '2px solid #ff9800' : '1px solid #1a1a1a',
                        background: isOver ? 'rgba(255, 152, 0, 0.15)' : '#000000',
                        boxShadow: isOver ? '0 0 30px rgba(255, 152, 0, 0.3), inset 0 0 20px rgba(255,152,0,0.1)' : 'none',
                        transform: isOver ? 'scale-[1.01]' : 'scale(1)',
                        transition: 'all 0.3s ease',
                        borderRadius: '4px',
                    }}
                >
                    {chart.selectedMetrics.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-[#444] gap-3">
                            <Layers size={28} className="opacity-20 text-[#ff9800]" />
                            <div className="text-center">
                                <p className="text-[10px] font-bold uppercase tracking-widest font-mono text-[#666]">Drag Metrics Here</p>
                                <p className="text-[8px] text-[#555] mt-1">or click on metrics to add</p>
                            </div>
                        </div>
                    ) : (
                        <ReactECharts option={getOption} style={{ height: '100%', width: '100%' }} notMerge={true} />
                    )}
                </div>
                {chart.selectedMetrics.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {chart.selectedMetrics.map((m, idx) => (
                            <div key={m} className="group relative">
                                <div className="px-2 py-1 bg-[#111] border border-[#333] hover:border-[#ff9800] text-[9px] text-[#aaa] flex items-center gap-1.5 transition-all duration-200 rounded group-hover:bg-[#1a1a1a]">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: chart.metricColors[m] || COLORS[idx % COLORS.length] }} />
                                    <span className="max-w-[100px] truncate font-mono">{m}</span>
                                    {chart.metricAxes[m] === 1 && <span className="text-[#ff9800] text-[7px]">A2</span>}

                                    <Dropdown
                                        menu={{
                                            items: [
                                                {
                                                    key: 'axis',
                                                    label: <span className="text-[10px] font-bold text-[#888]">AXIS</span>,
                                                    type: 'group',
                                                },
                                                { key: 'axis-0', label: <span className="text-[10px]">Primary Axis</span>, onClick: () => updateMetricAxis(m, 0) },
                                                { key: 'axis-1', label: <span className="text-[10px]">Secondary Axis</span>, onClick: () => updateMetricAxis(m, 1) },
                                                { type: 'divider' },
                                                {
                                                    key: 'type',
                                                    label: <span className="text-[10px] font-bold text-[#888]">TYPE</span>,
                                                    type: 'group',
                                                },
                                                { key: 'type-line', label: <div className="flex items-center gap-2 text-[10px]"><LineChart size={10} /> Line</div>, onClick: () => updateMetricType(m, 'line') },
                                                { key: 'type-bar', label: <div className="flex items-center gap-2 text-[10px]"><BarChart size={10} /> Bar</div>, onClick: () => updateMetricType(m, 'bar') },
                                                { key: 'type-stack', label: <div className="flex items-center gap-2 text-[10px]"><Layers size={10} /> Stack</div>, onClick: () => updateMetricType(m, 'stack') },
                                                { type: 'divider' },
                                                {
                                                    key: 'color',
                                                    label: <span className="text-[10px] font-bold text-[#888]">COLOR</span>,
                                                    type: 'group',
                                                },
                                                {
                                                    key: 'color-picker',
                                                    label: (
                                                        <div className="grid grid-cols-5 gap-1.5 p-1 max-h-[120px] overflow-y-auto customized-scrollbar" onMouseDown={e => e.stopPropagation()}>
                                                            {COLORS.map(c => (
                                                                <div
                                                                    key={c}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        updateMetricColor(m, c);
                                                                    }}
                                                                    className="w-4 h-4 rounded-full cursor-pointer hover:scale-110 transition-transform border border-white/10 hover:border-white"
                                                                    style={{ background: c }}
                                                                    title={c}
                                                                />
                                                            ))}
                                                        </div>
                                                    )
                                                }
                                            ],
                                            selectedKeys: [
                                                `axis-${chart.metricAxes[m] || 0}`,
                                                `type-${chart.metricTypes[m] || chart.chartType}`
                                            ]
                                        }}
                                        trigger={['click']}
                                    >
                                        <Settings2 size={10} className="cursor-pointer text-[#666] hover:text-[#1677ff] transition-colors" />
                                    </Dropdown>

                                    <X
                                        size={10}
                                        className="cursor-pointer text-[#666] hover:text-red-500 transition-colors ml-0.5"
                                        onClick={() => removeMetric(m)}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <Modal
                title={
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-5 bg-[#ff9800] rounded-full" />
                        <span className="text-[#e0e0e0] font-mono font-bold">CHART #{chart.id} - EXPANDED</span>
                    </div>
                }
                open={isZoomed}
                onCancel={() => setIsZoomed(false)}
                width="90%"
                footer={null}
                centered
                className="financial-chart-modal"
                styles={{
                    body: { background: '#000', padding: '20px' },
                    header: { background: '#0a0a0a', borderBottom: '1px solid #333' },
                    content: { background: '#0a0a0a' }
                }}
            >
                <div style={{ height: '70vh', background: '#000' }}>
                    {chart.selectedMetrics.length > 0 ? (
                        <ReactECharts option={getOption} style={{ height: '100%', width: '100%' }} notMerge={true} />
                    ) : (
                        <Empty description="No metrics" />
                    )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                    {chart.selectedMetrics.map((m, idx) => (
                        <Tooltip title="Click to remove" key={m}>
                            <div
                                onClick={() => removeMetric(m)}
                                className="px-3 py-1.5 bg-[#111] border border-[#333] hover:border-red-500/50 hover:bg-red-500/5 cursor-pointer text-[11px] text-[#aaa] flex items-center gap-2 rounded group transition-all"
                            >
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: chart.metricColors[m] || COLORS[idx % COLORS.length] }} />
                                <span className="font-mono group-hover:text-red-500">{m}</span>
                                <X size={10} className="opacity-0 group-hover:opacity-100 text-red-500 transition-opacity" />
                            </div>
                        </Tooltip>
                    ))}
                </div>
            </Modal>
        </>
    );
};

export default FinancialChart;
