import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Select, DatePicker, Spin, Statistic, Card, Row, Col, Tag, Alert } from 'antd';
import { TrendingUp, TrendingDown, BarChart3, AlertTriangle } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

// ── Config ──────────────────────────────────────────────────
const DEFAULT_EXCLUDED = ['VIC', 'VHM', 'VRE', 'VPL'];
const MCAP_SCALE = 4.1e12; // VND per VNI point (Total HOSE Mcap ~5 quadrillion / Index ~1250)

// ── Popular large-cap symbols for quick selection ───────────
const POPULAR_SYMBOLS = [
    'VIC', 'VHM', 'VRE', 'VPL', 'VCB', 'BID', 'CTG', 'TCB', 'MBB', 'ACB',
    'HPG', 'MSN', 'VNM', 'GAS', 'SAB', 'FPT', 'MWG', 'VJC', 'HVN', 'SSI',
    'GVR', 'BCM', 'PLX', 'POW', 'BVH', 'VGC', 'STB', 'TPB', 'LPB', 'SHB',
];

// ── Dark Theme Colors ───────────────────────────────────────
const COLORS = {
    bg: '#0a0a0a',
    border: '#333',
    text: '#d1d4dc',
    textDim: '#666',
    orange: '#ff9800',
    blue: '#2962ff',
    green: '#26a69a',
    red: '#ef5350',
    area: 'rgba(255, 152, 0, 0.15)',
};

// ── API Helpers ─────────────────────────────────────────────
interface OHLCV {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

async function fetchHistory(symbol: string, start: string, end: string): Promise<OHLCV[]> {
    try {
        const resp = await fetch(`http://localhost:8000/api/history?symbol=${symbol}&start=${start}&end=${end}`);
        if (resp.ok) {
            const data = await resp.json();
            return data.map((d: any) => ({
                date: (d.date || d.time || '').substring(0, 10),
                open: Number(d.open || 0),
                high: Number(d.high || 0),
                low: Number(d.low || 0),
                close: Number(d.close || 0),
                volume: Number(d.volume || 0),
            }));
        }
    } catch (err) {
        console.error('fetchHistory error', err);
    }
    return [];
}

async function fetchListedShares(symbols: string[]): Promise<Record<string, number>> {
    try {
        const resp = await fetch(`http://localhost:8000/api/shares`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbols })
        });
        if (resp.ok) {
            const data = await resp.json();
            return data;
        }
    } catch (err) {
        console.error('fetchListedShares error', err);
    }
    return {};
}

// ── Core Calculation ────────────────────────────────────────
interface AdjustedData {
    date: string;
    vniClose: number;
    adjClose: number;
    excludedWeight: number;
}

function calculateAdjustedIndex(
    vniHistory: OHLCV[],
    stockHistories: Record<string, OHLCV[]>,
    listedShares: Record<string, number>,
    excludedSymbols: string[]
): AdjustedData[] {
    const dateMap = new Map<string, { vniClose: number; stockPrices: Record<string, number> }>();

    for (const d of vniHistory) {
        const norm = d.date.substring(0, 10);
        dateMap.set(norm, { vniClose: d.close, stockPrices: {} });
    }

    for (const sym of excludedSymbols) {
        const history = stockHistories[sym] || [];
        for (const d of history) {
            const norm = d.date.substring(0, 10);
            if (dateMap.has(norm)) {
                let p = d.close;
                if (p > 500000) p /= 1000;
                dateMap.get(norm)!.stockPrices[sym] = p;
            }
        }
    }

    const dates = Array.from(dateMap.keys()).sort();
    const result: AdjustedData[] = [];
    let prevVni = 0;
    let prevAdj = 0;
    const prevPrices: Record<string, number> = {};

    for (const date of dates) {
        const entry = dateMap.get(date)!;
        const vniClose = entry.vniClose;

        if (vniClose <= 0) continue;

        const totalMcap = vniClose * MCAP_SCALE;
        
        let currentExcludedMcap = 0;
        for (const sym of excludedSymbols) {
            const p = entry.stockPrices[sym] || prevPrices[sym] || 0;
            currentExcludedMcap += p * (listedShares[sym] || 0) * 1000;
        }
        const excludedWeight = Math.min(currentExcludedMcap / totalMcap, 0.5);

        if (prevVni <= 0) {
            prevVni = vniClose;
            prevAdj = vniClose;
            for (const sym of excludedSymbols) {
                prevPrices[sym] = entry.stockPrices[sym] || 0;
            }
            result.push({ date, vniClose, adjClose: vniClose, excludedWeight });
            continue;
        }

        const vniReturn = (vniClose - prevVni) / prevVni;
        let excludedWeightedReturn = 0;
        const prevTotalMcap = prevVni * MCAP_SCALE;

        for (const sym of excludedSymbols) {
            const currPrice = entry.stockPrices[sym] || prevPrices[sym] || 0;
            const symPrevPrice = prevPrices[sym] || currPrice;
            
            if (symPrevPrice > 0 && currPrice > 0) {
                const symReturn = (currPrice - symPrevPrice) / symPrevPrice;
                const symWeightPrev = (symPrevPrice * (listedShares[sym] || 0) * 1000) / prevTotalMcap;
                excludedWeightedReturn += symWeightPrev * symReturn;
            }
        }

        const combinedPrevWeight = Object.keys(prevPrices).reduce((sum, sym) => {
            return sum + (prevPrices[sym] * (listedShares[sym] || 0) * 1000) / prevTotalMcap;
        }, 0);
        const effectWeight = Math.min(combinedPrevWeight, 0.5);

        const adjReturn = effectWeight < 0.99
            ? (vniReturn - excludedWeightedReturn) / (1 - effectWeight)
            : vniReturn;

        const adjClose = prevAdj * (1 + adjReturn);
        result.push({ date, vniClose, adjClose, excludedWeight });

        prevVni = vniClose;
        prevAdj = adjClose;
        for (const sym of excludedSymbols) {
            if (entry.stockPrices[sym]) {
                prevPrices[sym] = entry.stockPrices[sym];
            }
        }
    }

    return result;
}

// ── Component ───────────────────────────────────────────────
const AdjustedVNIndex: React.FC = () => {
    const [excludedSymbols, setExcludedSymbols] = useState<string[]>(DEFAULT_EXCLUDED);
    const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
        dayjs('2023-01-01'),
        dayjs('2024-03-15'),
    ]);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<AdjustedData[]>([]);
    const [error, setError] = useState<string | null>(null);
    const fetchRef = useRef(0);

    const loadData = useCallback(async () => {
        if (excludedSymbols.length === 0) {
            setData([]);
            return;
        }

        const fetchId = ++fetchRef.current;
        setLoading(true);
        setError(null);

        try {
            const start = dateRange[0].format('YYYY-MM-DD');
            const end = dateRange[1].format('YYYY-MM-DD');

            const [vniHistory, ...stockResults] = await Promise.all([
                fetchHistory('VNINDEX', start, end),
                ...excludedSymbols.map(sym => fetchHistory(sym, start, end)),
            ]);

            if (fetchId !== fetchRef.current) return;

            const stockHistories: Record<string, OHLCV[]> = {};
            excludedSymbols.forEach((sym, i) => {
                stockHistories[sym] = stockResults[i];
            });

            const listedShares = await fetchListedShares(excludedSymbols);
            if (fetchId !== fetchRef.current) return;

            if (vniHistory.length === 0) {
                setError('Không lấy được dữ liệu VN-Index. Vui lòng thử lại.');
                setData([]);
                return;
            }

            const result = calculateAdjustedIndex(vniHistory, stockHistories, listedShares, excludedSymbols);
            setData(result);
        } catch (err: any) {
            if (fetchId === fetchRef.current) {
                setError(err.message || 'Lỗi khi tải dữ liệu');
            }
        } finally {
            if (fetchId === fetchRef.current) {
                setLoading(false);
            }
        }
    }, [excludedSymbols, dateRange]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const stats = useMemo(() => {
        if (data.length < 2) return null;
        const last = data[data.length - 1];
        const first = data[0];
        const diff = last.vniClose - last.adjClose;
        const diffPct = (diff / last.vniClose) * 100;
        const avgWeight = data.reduce((s, d) => s + d.excludedWeight, 0) / data.length;
        const vniChange = ((last.vniClose - first.vniClose) / first.vniClose) * 100;
        const adjChange = ((last.adjClose - first.adjClose) / first.adjClose) * 100;
        return { last, diff, diffPct, avgWeight, vniChange, adjChange };
    }, [data]);

    const chartOption = useMemo(() => {
        if (data.length === 0) return {};

        const dates = data.map(d => d.date);
        const vniValues = data.map(d => d.vniClose.toFixed(1));
        const adjValues = data.map(d => d.adjClose.toFixed(1));
        const weightValues = data.map(d => (d.excludedWeight * 100).toFixed(2));

        return {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                backgroundColor: '#1a1a2e',
                borderColor: '#333',
                textStyle: { color: COLORS.text, fontSize: 11, fontFamily: 'Inter, monospace' },
                formatter: (params: any) => {
                    const date = params[0]?.axisValue || '';
                    let html = `<div style="font-weight:bold;margin-bottom:4px;color:#ff9800">${date}</div>`;
                    for (const p of params) {
                        const color = p.seriesIndex === 0 ? COLORS.blue : p.seriesIndex === 1 ? COLORS.green : COLORS.orange;
                        const val = p.seriesIndex === 2 ? `${p.value}%` : Number(p.value).toLocaleString('vi-VN', { maximumFractionDigits: 1 });
                        html += `<div style="display:flex;justify-content:space-between;gap:16px"><span style="color:${color}">${p.seriesName}</span><span style="font-weight:bold">${val}</span></div>`;
                    }
                    if (params.length >= 2) {
                        const vni = Number(params[0]?.value || 0);
                        const adj = Number(params[1]?.value || 0);
                        const diff = vni - adj;
                        html += `<div style="border-top:1px solid #333;margin-top:4px;padding-top:4px;color:${COLORS.orange}">Chênh lệch: <b>${diff > 0 ? '+' : ''}${diff.toFixed(1)}</b> (${((diff / vni) * 100).toFixed(1)}%)</div>`;
                    }
                    return html;
                },
            },
            legend: {
                data: ['VN-Index', `VN-Index (loại ${excludedSymbols.join(', ')})`, 'Tỷ trọng loại bỏ'],
                textStyle: { color: COLORS.textDim, fontSize: 10, fontFamily: 'Inter, monospace' },
                top: 5,
                itemGap: 20,
            },
            grid: [
                { left: 60, right: 30, top: 40, height: '55%' },
                { left: 60, right: 30, top: '75%', height: '18%' },
            ],
            xAxis: [
                {
                    type: 'category',
                    data: dates,
                    gridIndex: 0,
                    axisLine: { lineStyle: { color: COLORS.border } },
                    axisLabel: { show: false },
                    axisTick: { show: false },
                },
                {
                    type: 'category',
                    data: dates,
                    gridIndex: 1,
                    axisLine: { lineStyle: { color: COLORS.border } },
                    axisLabel: { color: COLORS.textDim, fontSize: 9, fontFamily: 'monospace' },
                    axisTick: { show: false },
                },
            ],
            yAxis: [
                {
                    type: 'value',
                    gridIndex: 0,
                    axisLine: { show: false },
                    axisLabel: { color: COLORS.textDim, fontSize: 9, fontFamily: 'monospace', formatter: (v: number) => v.toLocaleString() },
                    splitLine: { lineStyle: { color: COLORS.border, opacity: 0.3 } },
                },
                {
                    type: 'value',
                    gridIndex: 1,
                    axisLine: { show: false },
                    axisLabel: { color: COLORS.textDim, fontSize: 9, fontFamily: 'monospace', formatter: '{value}%' },
                    splitLine: { lineStyle: { color: COLORS.border, opacity: 0.3 } },
                    max: (value: any) => Math.ceil(value.max * 1.2),
                },
            ],
            dataZoom: [
                {
                    type: 'inside',
                    xAxisIndex: [0, 1],
                    start: 0,
                    end: 100,
                },
                {
                    type: 'slider',
                    xAxisIndex: [0, 1],
                    bottom: 5,
                    height: 18,
                    borderColor: COLORS.border,
                    backgroundColor: COLORS.bg,
                    fillerColor: 'rgba(255,152,0,0.1)',
                    handleStyle: { color: COLORS.orange },
                    textStyle: { color: COLORS.textDim, fontSize: 9 },
                },
            ],
            series: [
                {
                    name: 'VN-Index',
                    type: 'line',
                    xAxisIndex: 0,
                    yAxisIndex: 0,
                    data: vniValues,
                    smooth: false,
                    showSymbol: false,
                    lineStyle: { width: 2, color: COLORS.blue },
                    itemStyle: { color: COLORS.blue },
                },
                {
                    name: `VN-Index (loại ${excludedSymbols.join(', ')})`,
                    type: 'line',
                    xAxisIndex: 0,
                    yAxisIndex: 0,
                    data: adjValues,
                    smooth: false,
                    showSymbol: false,
                    lineStyle: { width: 2, color: COLORS.green },
                    itemStyle: { color: COLORS.green },
                    areaStyle: { color: 'rgba(38,166,154,0.05)' },
                },
                {
                    name: 'Tỷ trọng loại bỏ',
                    type: 'line',
                    xAxisIndex: 1,
                    yAxisIndex: 1,
                    data: weightValues,
                    smooth: true,
                    showSymbol: false,
                    lineStyle: { width: 1, color: COLORS.orange },
                    itemStyle: { color: COLORS.orange },
                    areaStyle: { color: 'rgba(255,152,0,0.2)' },
                },
            ],
        };
    }, [data, excludedSymbols]);

    return (
        <div className="space-y-4">
            <div className="border border-[#333] bg-black p-4">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1">
                        <div className="text-[10px] font-mono text-[#666] uppercase mb-1 tracking-wider">
                            Mã loại bỏ (TÙY CHỈNH)
                        </div>
                        <Select
                            mode="tags"
                            value={excludedSymbols}
                            onChange={setExcludedSymbols}
                            placeholder="Nhập mã cổ phiếu..."
                            style={{ width: '100%' }}
                            maxTagCount={8}
                            tokenSeparators={[',', ' ']}
                            className="custom-select"
                            options={POPULAR_SYMBOLS.map(s => ({ label: s, value: s }))}
                            tagRender={({ label, closable, onClose }) => (
                                <Tag
                                    closable={closable}
                                    onClose={onClose}
                                    className="bg-[#1a1a1a] border-[#444] text-[#ff9800] font-mono text-[11px] m-0.5"
                                >
                                    {label}
                                </Tag>
                            )}
                        />
                    </div>
                    <div>
                        <div className="text-[10px] font-mono text-[#666] uppercase mb-1 tracking-wider">
                            Khoảng thời gian
                        </div>
                        <RangePicker
                            value={dateRange}
                            onChange={(dates) => {
                                if (dates && dates[0] && dates[1]) {
                                    setDateRange([dates[0], dates[1]]);
                                }
                            }}
                            className="bg-[#0a0a0a] border-[#333] font-mono text-xs"
                            format="DD/MM/YYYY"
                            presets={[
                                { label: '6 tháng', value: [dayjs().subtract(6, 'month'), dayjs()] },
                                { label: '1 năm', value: [dayjs().subtract(1, 'year'), dayjs()] },
                                { label: '2 năm', value: [dayjs().subtract(2, 'year'), dayjs()] },
                                { label: '3 năm', value: [dayjs().subtract(3, 'year'), dayjs()] },
                            ]}
                        />
                    </div>
                </div>
            </div>

            {error && (
                <Alert
                    message={error}
                    type="error"
                    showIcon
                    icon={<AlertTriangle size={16} />}
                    className="bg-[#1a0000] border-[#ff4444]"
                />
            )}

            {stats && !loading && (
                <Row gutter={[12, 12]}>
                    <Col xs={12} lg={6}>
                        <div className="border border-[#333] bg-black p-3 h-full">
                            <div className="text-[10px] font-mono text-[#666] uppercase tracking-wider mb-1">VN-Index (gốc)</div>
                            <div className="text-xl font-bold font-mono text-[#2962ff]">
                                {stats.last.vniClose.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
                            </div>
                            <div className={`text-xs font-mono mt-1 ${stats.vniChange >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
                                {stats.vniChange >= 0 ? '▲' : '▼'} {stats.vniChange.toFixed(1)}% (giai đoạn)
                            </div>
                        </div>
                    </Col>
                    <Col xs={12} lg={6}>
                        <div className="border border-[#333] bg-black p-3 h-full">
                            <div className="text-[10px] font-mono text-[#666] uppercase tracking-wider mb-1">VN-Index (điều chỉnh)</div>
                            <div className="text-xl font-bold font-mono text-[#26a69a]">
                                {stats.last.adjClose.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
                            </div>
                            <div className={`text-xs font-mono mt-1 ${stats.adjChange >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
                                {stats.adjChange >= 0 ? '▲' : '▼'} {stats.adjChange.toFixed(1)}% (giai đoạn)
                            </div>
                        </div>
                    </Col>
                    <Col xs={12} lg={6}>
                        <div className="border border-[#333] bg-black p-3 h-full">
                            <div className="text-[10px] font-mono text-[#666] uppercase tracking-wider mb-1">Chênh lệch</div>
                            <div className="text-xl font-bold font-mono text-[#ff9800]">
                                {stats.diff > 0 ? '+' : ''}{stats.diff.toFixed(1)}
                            </div>
                            <div className="text-xs font-mono mt-1 text-[#ff9800]">
                                {stats.diffPct > 0 ? '+' : ''}{stats.diffPct.toFixed(1)}% ảnh hưởng
                            </div>
                        </div>
                    </Col>
                    <Col xs={12} lg={6}>
                        <div className="border border-[#333] bg-black p-3 h-full">
                            <div className="text-[10px] font-mono text-[#666] uppercase tracking-wider mb-1">Tỷ trọng TB nhóm loại bỏ</div>
                            <div className="text-xl font-bold font-mono text-[#ff9800]">
                                {(stats.avgWeight * 100).toFixed(1)}%
                            </div>
                            <div className="text-xs font-mono mt-1 text-[#666]">
                                vốn hóa HOSE
                            </div>
                        </div>
                    </Col>
                </Row>
            )}

            <div className="border border-[#333] bg-black">
                <div className="px-4 py-2 border-b border-[#333] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BarChart3 size={14} className="text-[#ff9800]" />
                        <span className="text-[11px] font-mono font-bold text-[#ff9800] uppercase tracking-wider">
                            VN-Index Adjusted Chart
                        </span>
                    </div>
                    {loading && <Spin size="small" />}
                </div>
                <div className="p-2" style={{ minHeight: 500 }}>
                    {data.length > 0 ? (
                        <ReactECharts
                            option={chartOption}
                            style={{ height: 500 }}
                            theme="dark"
                            notMerge
                            lazyUpdate
                        />
                    ) : !loading ? (
                        <div className="h-[500px] flex items-center justify-center text-[#666] font-mono text-sm">
                            {excludedSymbols.length === 0 ? 'Chọn ít nhất 1 mã để loại bỏ' : 'Đang tải...'}
                        </div>
                    ) : (
                        <div className="h-[500px] flex items-center justify-center">
                            <Spin size="large" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdjustedVNIndex;
