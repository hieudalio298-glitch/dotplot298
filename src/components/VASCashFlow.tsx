import React, { useEffect, useState, useMemo } from 'react';
import { Table, Radio, Card, Empty, Spin, Checkbox, Space, Divider, Tooltip, Button, Dropdown, Input } from 'antd';
import { Activity, BarChart3, TrendingUp, Info, ChevronRight, ChevronDown, RefreshCw, LineChart, BarChart, Layers, Trash2, Settings2 } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { useDroppable } from '@dnd-kit/core';
import { supabase } from '../supabaseClient';

// --- CHUẨN VAS (Thông tư 200/2014/TT-BTC) - LƯU CHUYỂN TIỀN TỆ (PHÂN CẤP) ---
const VAS_CASHFLOW_STRUCTURE: any[] = [
    {
        code: '01', name: 'I. Lưu chuyển tiền từ hoạt động kinh doanh', isBold: true,
        keys: ['Lưu chuyển tiền thuần từ hoạt động kinh doanh', 'I. Lưu chuyển tiền từ hoạt động kinh doanh'],
        children: [
            { code: '01.1', name: '1. Lợi nhuận trước thuế', keys: ['Lợi nhuận trước thuế'] },
            {
                code: '02', name: '2. Điều chỉnh cho các khoản', keys: ['Điều chỉnh cho các khoản'],
                children: [
                    { code: '03', name: '- Khấu hao TSCĐ và BĐSĐT', keys: ['Khấu hao tài sản cố định'] },
                    { code: '05', name: '- Lãi/lỗ thuần từ hoạt động đầu tư', keys: ['Lãi, lỗ từ hoạt động đầu tư'] },
                    { code: '06', name: '- Chi phí lãi vay', keys: ['Chi phí lãi vay'] }
                ]
            },
            { code: '08', name: '3. Lợi nhuận từ hoạt động kinh doanh trước thay đổi vốn lưu động', keys: ['Lợi nhuận kinh doanh trước những thay đổi vốn lưu động'], isBold: true }
        ]
    },
    {
        code: '20', name: 'II. Lưu chuyển tiền từ hoạt động đầu tư', isBold: true,
        keys: ['Lưu chuyển tiền thuần từ hoạt động đầu tư', 'II. Lưu chuyển tiền từ hoạt động đầu tư'],
        children: [
            { code: '21', name: '1. Tiền chi để mua sắm, xây dựng TSCĐ', keys: ['Tiền chi để mua sắm, xây dựng TSCĐ và các tài sản dài hạn khác'] },
            { code: '22', name: '2. Tiền thu từ thanh lý, nhượng bán TSCĐ', keys: ['Tiền thu từ thanh lý, nhượng bán TSCĐ và các tài sản dài hạn khác'] },
            { code: '23', name: '3. Tiền chi cho vay, mua các công cụ nợ', keys: ['Tiền chi cho vay, mua các công cụ nợ của đơn vị khác'] },
            { code: '24', name: '4. Tiền thu hồi cho vay, bán lại các công cụ nợ', keys: ['Tiền thu hồi cho vay, bán lại các công cụ nợ của đơn vị khác'] }
        ]
    },
    {
        code: '30', name: 'III. Lưu chuyển tiền từ hoạt động tài chính', isBold: true,
        keys: ['Lưu chuyển tiền thuần từ hoạt động tài chính', 'III. Lưu chuyển tiền từ hoạt động tài chính'],
        children: [
            { code: '31', name: '1. Tiền thu từ phát hành cổ phiếu, nhận vốn góp', keys: ['Tiền thu từ phát hành cổ phiếu, nhận vốn góp của chủ sở hữu'] },
            { code: '33', name: '2. Tiền thu từ đi vay', keys: ['Tiền thu từ đi vay'] },
            { code: '34', name: '3. Tiền trả nợ gốc vay', keys: ['Tiền trả nợ gốc vay'] },
            { code: '36', name: '4. Cổ tức, lợi nhuận đã trả cho chủ sở hữu', keys: ['Cổ tức, lợi nhuận đã trả cho chủ sở hữu'] }
        ]
    },
    { code: '50', name: 'Lưu chuyển tiền thuần trong kỳ', keys: ['50. Lưu chuyển tiền thuần trong kỳ', 'Lưu chuyển tiền thuần trong kỳ'], isBold: true },
    { code: '60', name: 'Tiền và tương đương tiền đầu kỳ', keys: ['60. Tiền và tương đương tiền đầu kỳ', 'Tiền và tương đương tiền đầu kỳ'], isBold: true },
    { code: '61', name: 'Ảnh hưởng của thay đổi tỷ giá hối đoái', keys: ['61. Ảnh hưởng của thay đổi tỷ giá hối đoái', 'Ảnh hưởng của thay đổi tỷ giá hối đoái'] },
    { code: '70', name: 'Tiền và tương đương tiền cuối kỳ', keys: ['70. Tiền và tương đương tiền cuối kỳ', 'Tiền và tương đương tiền cuối kỳ'], isBold: true },
];


interface VASCashFlowProps {
    symbol: string | null;
}

const VASCashFlow: React.FC<VASCashFlowProps> = ({ symbol }) => {
    const [loading, setLoading] = useState(false);
    const [period, setPeriod] = useState<'year' | 'quarter'>('quarter');
    const [rawRecords, setRawRecords] = useState<any[]>([]);
    const [chartType, setChartType] = useState<'line' | 'bar' | 'stack'>('line');
    const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['I. Lưu chuyển tiền từ hoạt động kinh doanh']);
    const [metricAxes, setMetricAxes] = useState<Record<string, number>>({});
    const [metricTypes, setMetricTypes] = useState<Record<string, 'line' | 'bar' | 'stack'>>({});
    const [metricColors, setMetricColors] = useState<Record<string, string>>({});
    const [searchQuery, setSearchQuery] = useState('');

    const COLORS = ['#1677ff', '#52c41a', '#f5222d', '#faad14', '#13c2c2', '#722ed1', '#eb2f96'];

    const { setNodeRef, isOver } = useDroppable({
        id: 'vas-cashflow-chart-droppable',
    });

    useEffect(() => {
        if (symbol) fetchData();
    }, [symbol, period]);

    useEffect(() => {
        const handleGlobalDrop = (e: any) => {
            if (e.detail.overId === 'vas-cashflow-chart-droppable') {
                const metric = e.detail.metric;
                if (!selectedMetrics.includes(metric)) {
                    setSelectedMetrics(prev => [...prev, metric]);
                    setMetricTypes(prev => ({ ...prev, [metric]: 'line' }));
                    setMetricColors(prev => ({ ...prev, [metric]: COLORS[selectedMetrics.length % COLORS.length] }));
                }
            }
        };
        document.addEventListener('financialMetricDropped', handleGlobalDrop);
        return () => document.removeEventListener('financialMetricDropped', handleGlobalDrop);
    }, [selectedMetrics]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('financial_statements')
                .select('*')
                .eq('symbol', symbol)
                .eq('statement_type', 'cash_flow')
                .eq('period_type', period);

            if (error) throw error;

            const processed = (data || []).flatMap(record => {
                const innerData = Array.isArray(record.data) ? record.data : [record.data];
                return innerData.map((d: any) => {
                    const cleanObj: any = {};
                    Object.keys(d).forEach((k: string) => {
                        const cleanKey = k.replace(/^_+/, '');
                        const val = d[k];
                        if (val === null || val === undefined || val === '') {
                            cleanObj[cleanKey] = 0;
                        } else if (typeof val === 'string') {
                            const num = parseFloat(val.replace(/,/g, ''));
                            cleanObj[cleanKey] = isNaN(num) ? 0 : num;
                        } else {
                            cleanObj[cleanKey] = val;
                        }
                    });
                    return cleanObj;
                });
            });

            processed.sort((a, b) => {
                const ya = parseInt(a['Năm'] || a['year'] || 0);
                const yb = parseInt(b['Năm'] || b['year'] || 0);
                if (ya !== yb) return yb - ya;
                const qa = parseInt(a['Quý'] || 0);
                const qb = parseInt(b['Quý'] || 0);
                return qb - qa;
            });

            setRawRecords(processed);
        } catch (e) {
            console.error('Fetch Error:', e);
        } finally {
            setLoading(false);
        }
    };

    const processedData = useMemo(() => {
        return rawRecords.map(record => {
            const result: any = { ...record };
            const getVal = (item: any) => {
                // 1. Exact keys match
                for (const k of item.keys) {
                    if (record[k] !== undefined && record[k] !== null) return record[k];
                }
                const allKeys = Object.keys(record);
                // 2. Code-based match (e.g. key contains "(110)")
                if (item.code) {
                    const codeMatch = allKeys.find(k => k.includes(`(${item.code})`) || k.startsWith(`${item.code}.`));
                    if (codeMatch) return record[codeMatch];
                }
                // 3. Fuzzy name match (strip numbering)
                const cleanName = item.name.toLowerCase().replace(/^[ivx]+\.\s*/, '').replace(/^\d+\.\s*/, '').replace(/^[a-d]\.\s*/, '').trim();
                const fuzzyKey = allKeys.find((k: string) => k.toLowerCase().includes(cleanName));
                if (fuzzyKey) return record[fuzzyKey];
                return 0;
            };

            const mapRecursive = (items: any[]) => {
                items.forEach(item => {
                    result[item.name] = getVal(item);
                    if (item.children) mapRecursive(item.children);
                });
            };

            mapRecursive(VAS_CASHFLOW_STRUCTURE);

            const y = result['Năm'] || result['year'] || '';
            const q = result['Quý'] || result['quarter'] || '';
            result.periodLabel = period === 'year' ? `${y}` : `Q${q}/${y.toString().slice(-2)}`;
            return result;
        });
    }, [rawRecords, period]);

    const allMetrics = useMemo(() => {
        const list: any[] = [];
        const extract = (items: any[]) => {
            items.forEach(i => {
                list.push(i);
                if (i.children) extract(i.children);
            });
        };
        extract(VAS_CASHFLOW_STRUCTURE);
        return list;
    }, []);

    const displayPeriods = useMemo(() => processedData.map(d => d.periodLabel), [processedData]);

    const formatValue = (val: any) => {
        if (val === null || val === undefined || val === 0) return '-';
        if (typeof val !== 'number') return val;
        const inBillions = val / 1e9;
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: Math.abs(inBillions) < 10 ? 2 : 1,
            maximumFractionDigits: 2
        }).format(inBillions);
    };

    const chartOption = useMemo(() => {
        const reverseData = [...processedData].reverse();

        return {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                backgroundColor: 'rgba(15, 15, 15, 0.9)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                textStyle: { color: '#fff' },
                formatter: (params: any) => {
                    let res = `<div style="color: #848e9c; font-size: 11px; margin-bottom: 4px;">${params[0].name}</div>`;
                    params.forEach((p: any) => {
                        const color = p.value >= 0 ? '#00c076' : '#f6465d';
                        res += `<div style="display: flex; justify-content: space-between; gap: 20px; font-size: 12px; margin-bottom: 2px;">
                                    <span style="display: flex; align-items: center; gap: 6px;">${p.marker} ${p.seriesName}</span>
                                    <span style="font-weight: bold; color: ${color}">${(p.value / 1e9).toFixed(2)} tỷ</span>
                                </div>`;
                    });
                    return res;
                }
            },
            legend: {
                show: false
            },
            grid: { left: '3%', right: '3%', bottom: '10%', top: '10%', containLabel: true },
            xAxis: {
                type: 'category',
                data: reverseData.map(d => d.periodLabel),
                axisLine: { lineStyle: { color: '#2a2e39' } },
                axisLabel: { color: '#848e9c', fontSize: 10 }
            },
            yAxis: [
                {
                    type: 'value',
                    name: 'Tỷ VNĐ',
                    axisLine: { show: false },
                    splitLine: { lineStyle: { color: '#1e222d' } },
                    axisLabel: { color: '#848e9c', fontSize: 10, formatter: (v: number) => (v / 1e9).toLocaleString() }
                },
                {
                    type: 'value',
                    name: 'Secondary',
                    splitLine: { show: false },
                    axisLabel: { color: '#1677ff', fontSize: 10, formatter: (v: number) => (v / 1e9).toLocaleString() }
                }
            ],
            series: selectedMetrics.map((m, idx) => {
                const color = metricColors[m] || COLORS[idx % COLORS.length];
                const axisIndex = metricAxes[m] || 0;
                const mType = metricTypes[m] || chartType;

                const base: any = {
                    name: m,
                    yAxisIndex: axisIndex,
                    data: reverseData.map(d => d[m]),
                    itemStyle: {
                        color: (params: any) => {
                            if (selectedMetrics.length === 1 && !metricColors[m]) {
                                return params.value >= 0 ? '#00c076' : '#f6465d';
                            }
                            return color;
                        }
                    },
                    emphasis: { focus: 'series' }
                };

                if (mType === 'line') {
                    return {
                        ...base,
                        type: 'line',
                        smooth: true,
                        symbol: 'circle',
                        symbolSize: 8,
                        lineStyle: { width: 3 }
                    };
                } else if (mType === 'bar') {
                    return {
                        ...base,
                        type: 'bar',
                        barMaxWidth: 30,
                        itemStyle: { ...base.itemStyle, borderRadius: [2, 2, 0, 0] }
                    };
                } else {
                    return {
                        ...base,
                        type: 'bar',
                        stack: 'total',
                        barMaxWidth: 30
                    };
                }
            })
        };
    }, [processedData, selectedMetrics, chartType, metricAxes, metricTypes, metricColors]);

    const handleResetChart = () => {
        setSelectedMetrics(['I. Lưu chuyển tiền từ hoạt động kinh doanh']);
        setChartType('line');
        setMetricAxes({});
        setMetricTypes({});
        setMetricColors({});
    };

    const updateMetricAxis = (metric: string, axis: number) => setMetricAxes(prev => ({ ...prev, [metric]: axis }));
    const updateMetricType = (metric: string, type: 'line' | 'bar' | 'stack') => setMetricTypes(prev => ({ ...prev, [metric]: type }));
    const updateMetricColor = (metric: string, color: string) => setMetricColors(prev => ({ ...prev, [metric]: color }));

    const columns = [
        {
            title: <div className="text-[10px] text-gray-500">CHỈ TIÊU (TỶ VNĐ)</div>,
            dataIndex: 'name',
            key: 'name',
            fixed: 'left',
            width: 450,
            render: (text: string, record: any) => (
                <span
                    className={`inline-block align-middle ${record.isBold ? 'font-bold' : ''} text-[10px] whitespace-nowrap overflow-hidden text-ellipsis`}
                    style={{ maxWidth: '430px' }}
                    title={text}
                >
                    {text}
                </span>
            )
        },
        ...displayPeriods.map(p => ({
            title: p,
            dataIndex: p,
            key: p,
            align: 'right',
            width: 80,
            render: (_: any, record: any) => {
                const val = processedData.find(d => d.periodLabel === p)?.[record.name];
                return <span className={`${record.isBold ? 'font-bold' : ''}`}>{formatValue(val)}</span>;
            }
        }))
    ];

    if (loading && rawRecords.length === 0) return <div className="h-64 flex items-center justify-center"><Spin /></div>;

    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <Card
                    className="lg:col-span-3 border-none bg-[#0b0e11]/80 backdrop-blur-md shadow-xl overflow-hidden"
                    title={
                        <div className="flex items-center gap-3 text-white">
                            <BarChart3 size={18} className="text-neon-blue" />
                            <span>Biểu đồ Phân tích</span>
                        </div>
                    }
                    extra={
                        <Space split={<Divider type="vertical" className="bg-gray-800" />}>
                            <Radio.Group
                                value={chartType}
                                onChange={e => {
                                    const next = e.target.value;
                                    setChartType(next);
                                    selectedMetrics.forEach(m => updateMetricType(m, next));
                                }}
                                size="small"
                                buttonStyle="solid"
                            >
                                <Radio.Button value="line"><LineChart size={14} /></Radio.Button>
                                <Radio.Button value="bar"><BarChart size={14} /></Radio.Button>
                                <Radio.Button value="stack"><Layers size={14} /></Radio.Button>
                            </Radio.Group>
                            <Button size="small" type="text" onClick={handleResetChart} className="text-gray-500 hover:text-white flex items-center gap-1">
                                <RefreshCw size={12} /> Reset
                            </Button>
                        </Space>
                    }
                >
                    <div ref={setNodeRef} style={{ height: 400 }} className={`transition-all ${isOver ? 'bg-neon-blue/5' : ''}`}>
                        {selectedMetrics.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-4 bg-black/20 rounded-xl border border-white/5">
                                <Layers size={48} className="opacity-20 text-neon-blue" />
                                <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Kéo thả chỉ tiêu để bắt đầu phân tích</p>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col">
                                <div className="flex-1 min-h-0">
                                    <ReactECharts option={chartOption} style={{ height: '100%' }} notMerge={true} />
                                </div>
                                {/* METRIC TAGS */}
                                <div className="mt-2 flex flex-wrap gap-2 justify-center pb-2">
                                    {selectedMetrics.map((m, idx) => (
                                        <div key={m} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-[10px] text-gray-400 flex items-center gap-1.5 hover:bg-white/10 transition-all group">
                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: metricColors[m] || COLORS[idx % COLORS.length] }} />
                                            <span>{m} {metricAxes[m] === 1 ? '(Trục 2)' : ''}</span>

                                            <Dropdown
                                                menu={{
                                                    items: [
                                                        { key: 'axis-0', label: 'Dùng Trục 1', onClick: () => updateMetricAxis(m, 0) },
                                                        { key: 'axis-1', label: 'Dùng Trục 2', onClick: () => updateMetricAxis(m, 1) },
                                                        { type: 'divider' },
                                                        { key: 'type-line', label: 'Dạng Đường', icon: <LineChart size={12} />, onClick: () => updateMetricType(m, 'line') },
                                                        { key: 'type-bar', label: 'Dạng Cột', icon: <BarChart size={12} />, onClick: () => updateMetricType(m, 'bar') },
                                                        { key: 'type-stack', label: 'Dạng Cột chồng', icon: <Layers size={12} />, onClick: () => updateMetricType(m, 'stack') },
                                                        { type: 'divider' },
                                                        {
                                                            key: 'colors',
                                                            label: 'Chọn màu sắc',
                                                            children: COLORS.map(c => ({
                                                                key: c,
                                                                label: <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ background: c }} /> {c}</div>,
                                                                onClick: () => updateMetricColor(m, c)
                                                            }))
                                                        }
                                                    ],
                                                    selectedKeys: [
                                                        `axis-${metricAxes[m] || 0}`,
                                                        `type-${metricTypes[m] || 'bar'}`
                                                    ]
                                                }}
                                                trigger={['click']}
                                            >
                                                <Settings2 size={10} className="cursor-pointer text-neon-blue hover:text-white opacity-60 hover:opacity-100 transition-all" />
                                            </Dropdown>

                                            <Trash2
                                                size={10}
                                                className="cursor-pointer hover:text-red-400 opacity-40 group-hover:opacity-100 transition-opacity"
                                                onClick={() => setSelectedMetrics(prev => prev.filter(sm => sm !== m))}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
                <Card className="border-none bg-[#0b0e11]/80 backdrop-blur-md"
                    title={
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2 text-white">
                                <TrendingUp size={18} className="text-neon-green" />
                                <span>Chỉ tiêu phân tích</span>
                            </div>
                            <Tooltip title="Xóa tất cả">
                                <Trash2 size={14} className="text-gray-600 cursor-pointer hover:text-red-500 transition-colors" onClick={() => setSelectedMetrics([])} />
                            </Tooltip>
                        </div>
                    }>
                    <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                        <Checkbox.Group
                            value={selectedMetrics}
                            onChange={(checked) => {
                                const newMetrics = checked as string[];
                                const added = newMetrics.find(m => !selectedMetrics.includes(m));
                                if (added) {
                                    setMetricTypes(prev => ({ ...prev, [added]: chartType }));
                                    setMetricColors(prev => ({ ...prev, [added]: COLORS[newMetrics.length % COLORS.length] }));
                                }
                                setSelectedMetrics(newMetrics);
                            }}
                            className="flex flex-col gap-3"
                        >
                            {allMetrics
                                .filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                .map(item => (
                                    <Checkbox key={item.name} value={item.name} className="text-gray-400 hover:text-white transition-colors">
                                        <span className="text-[11px] leading-tight block">{item.name}</span>
                                    </Checkbox>
                                ))
                            }
                        </Checkbox.Group>
                    </div>
                </Card>
            </div>
            <Card className="border-none bg-[#0b0e11] shadow-2xl"
                title={
                    <div className="flex justify-between items-center w-full">
                        <Space split={<Divider type="vertical" className="bg-gray-700" />}>
                            <span className="text-white text-lg font-bold">LƯU CHUYỂN TIỀN TỆ (VAS) - {symbol}</span>
                            <Radio.Group value={period} onChange={e => setPeriod(e.target.value)} buttonStyle="solid" size="small">
                                <Radio.Button value="year">NĂM</Radio.Button>
                                <Radio.Button value="quarter">QUÝ</Radio.Button>
                            </Radio.Group>
                        </Space>
                        <Tooltip title="Đơn vị: Tỷ VNĐ. Lưu chuyển tiền tệ gián tiếp.">
                            <Info size={16} className="text-gray-500 cursor-help" />
                        </Tooltip>
                    </div>
                }>
                <Table
                    dataSource={VAS_CASHFLOW_STRUCTURE}
                    columns={columns as any}
                    pagination={false}
                    scroll={{ x: 'max-content', y: 500 }}
                    size="middle"
                    rowKey="code"
                    className="vas-table-custom"
                    rowClassName={(record: any) => record.isBold ? 'financial-row-group' : 'financial-row-item'}
                    defaultExpandAllRows={true}
                    expandable={{
                        expandIcon: ({ expanded, onExpand, record }) =>
                            record.children ? (
                                <span
                                    className="cursor-pointer mr-2 text-neon-blue hover:text-white transition-all inline-flex items-center justify-center w-4 h-4"
                                    onClick={e => onExpand(record, e)}
                                >
                                    {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </span>
                            ) : <span className="inline-block w-6" />
                    }}
                />
            </Card>
            <style>{`
                .vas-table-custom .ant-table { background: transparent !important; color: #fff; font-size: 10px !important; }
                .vas-table-custom .ant-table-thead > tr > th { 
                    background: #131722 !important; 
                    color: #848e9c !important; 
                    border-bottom: 2px solid #2a2e39 !important; 
                    font-size: 9px !important; 
                    text-transform: uppercase; 
                    letter-spacing: 0.5px; 
                    padding: 4px 6px !important;
                }
                .vas-table-custom .ant-table-tbody > tr > td { 
                    border-bottom: 1px solid #1e222d !important; 
                    padding: 3px 6px !important; 
                    white-space: nowrap !important;
                    line-height: 1.1 !important;
                }
                .vas-table-custom .ant-table-cell-fix-left { background: #0b0e11 !important; }
                .vas-table-custom .ant-table-row-indent { margin-right: 12px !important; }
                .vas-table-custom .ant-table-row:hover > td { background: rgba(0, 102, 255, 0.08) !important; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #2a2e39; border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default VASCashFlow;
