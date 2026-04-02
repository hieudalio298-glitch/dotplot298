import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Space, Button, Spin, Empty, message, Tooltip } from 'antd';
import { RefreshCw, TrendingUp, Info } from 'lucide-react';

const OilPricesChart: React.FC = () => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:8000/api/oil_prices');
            if (!response.ok) throw new Error('API server is not running or error fetching data');
            const result = await response.json();
            setData(result);
        } catch (error: any) {
            console.error(error);
            // Don't show error message every time in production if not explicitly clicked
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Auto refresh every 5 minutes if tab is open
        const interval = setInterval(fetchData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const option = {
        backgroundColor: '#0a0a0a',
        tooltip: {
            trigger: 'axis',
            backgroundColor: '#111',
            borderColor: '#333',
            textStyle: { color: '#fff', fontSize: 10 },
            formatter: (params: any) => {
                let res = `<div style="font-family: monospace; border-bottom: 1px solid #333; margin-bottom: 5px; padding-bottom: 2px;">${params[0].name}</div>`;
                params.forEach((p: any) => {
                    res += `<div style="font-family: monospace; display: flex; justify-content: space-between; gap: 15px; margin-top: 2px;">
                        <span style="color: ${p.color};">${p.seriesName}:</span>
                        <span style="font-weight: bold; color: #fff;">$${p.value ? p.value.toFixed(2) : 'N/A'}</span>
                    </div>`;
                });
                return res;
            }
        },
        legend: {
            data: ['BRENT', 'WTI', 'DUBAI'],
            textStyle: { color: '#e0e0e0', fontSize: 10, fontFamily: 'monospace' },
            top: 10,
            left: 'center'
        },
        grid: {
            top: 60,
            left: '3%',
            right: '4%',
            bottom: '10%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: data.map(d => d.date),
            axisLine: { lineStyle: { color: '#333' } },
            axisLabel: { color: '#666', fontSize: 10, fontFamily: 'monospace' }
        },
        yAxis: {
            type: 'value',
            scale: true,
            splitLine: { lineStyle: { color: '#1a1a1a' } },
            axisLine: { show: false },
            axisLabel: { 
                color: '#666', 
                fontSize: 10, 
                fontFamily: 'monospace',
                formatter: (val: number) => `$${val}`
            }
        },
        series: [
            {
                name: 'BRENT',
                type: 'line',
                data: data.map(d => d.brent),
                smooth: true,
                showSymbol: false,
                lineStyle: { width: 2, color: '#ff9800' },
                itemStyle: { color: '#ff9800' },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [{ offset: 0, color: 'rgba(255,152,0,0.1)' }, { offset: 1, color: 'rgba(255,152,0,0)' }]
                    }
                }
            },
            {
                name: 'WTI',
                type: 'line',
                data: data.map(d => d.wti),
                smooth: true,
                showSymbol: false,
                lineStyle: { width: 2, color: '#00ccff' },
                itemStyle: { color: '#00ccff' }
            },
            {
                name: 'DUBAI',
                type: 'line',
                data: data.map(d => d.dubai),
                smooth: true,
                showSymbol: false,
                lineStyle: { width: 2, color: '#00ff66' },
                itemStyle: { color: '#00ff66' }
            }
        ]
    };

    return (
        <div className="space-y-4 p-4 bg-black border border-[#333]">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-[#ff9800] flex items-center justify-center font-bold text-black border border-[#cc7a00]">
                        <TrendingUp size={16} />
                    </div>
                    <span className="text-xs font-bold font-mono uppercase tracking-widest text-[#e0e0e0]">
                        COMMODITY MONITOR: WAR IMPACT (SINCE FEB 27, 2026)
                    </span>
                    <Tooltip title="Data sourced live via yfinance API bridge (Brent, WTI, Dubai Crude)">
                        <Info size={12} className="text-[#444] cursor-help" />
                    </Tooltip>
                </div>
                <div className="flex items-center space-x-3">
                    {data.length > 0 && (
                         <span className="text-[10px] font-mono text-[#444] uppercase">Last: {data[data.length-1].date}</span>
                    )}
                    <Button 
                        size="small" 
                        icon={<RefreshCw size={12} className={loading ? 'animate-spin' : ''} />} 
                        onClick={fetchData} 
                        className="bg-transparent border-[#333] text-[#666] hover:text-[#ff9800] hover:border-[#ff9800] text-[10px] uppercase font-mono h-8 rounded-none"
                    >
                        {loading ? 'SYNCING...' : 'FORCE REFRESH'}
                    </Button>
                </div>
            </div>

            <div className="h-[400px]">
                {loading && data.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center border border-[#1a1a1a] bg-[#050505] space-y-3">
                        <Spin />
                        <span className="text-[10px] font-mono text-[#444] uppercase animate-pulse">Initializing Data Stream...</span>
                    </div>
                ) : data.length > 0 ? (
                    <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
                ) : (
                    <div className="h-full flex flex-col items-center justify-center border border-[#1a1a1a] bg-[#050505] space-y-4 opacity-50">
                        <Empty 
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                                <div className="space-y-1">
                                    <div className="text-[#666] font-mono text-[10px] uppercase">API Connection Locked</div>
                                    <div className="text-[#444] font-mono text-[9px] uppercase">Ensure api_server.py is running on localhost:8000</div>
                                </div>
                            } 
                        />
                         <Button onClick={fetchData} size="small" className="text-[9px] font-mono uppercase border-[#333] bg-transparent text-[#666]">Retry Connection</Button>
                    </div>
                )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
                {data.length > 0 && (
                    <>
                        <PriceMetric label="BRENT CRUDE" price={data[data.length-1].brent} color="#ff9800" symbol="BZ=F" />
                        <PriceMetric label="WTI CRUDE" price={data[data.length-1].wti} color="#00ccff" symbol="CL=F" />
                        <PriceMetric label="DUBAI CRUDE" price={data[data.length-1].dubai} color="#00ff66" symbol="DCB=F" />
                    </>
                )}
            </div>
        </div>
    );
};

const PriceMetric = ({ label, price, color, symbol }: any) => (
    <div className="border border-[#333] bg-[#0a0a0a] p-4 flex flex-col items-center group hover:bg-[#111] transition-colors relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-[#333] group-hover:bg-[#ff9800]" />
        <span className="text-[9px] text-[#444] font-mono mb-1">{symbol}</span>
        <span className="text-[10px] text-[#666] font-mono uppercase tracking-tighter mb-2">{label}</span>
        <span className="text-2xl font-bold font-mono tracking-tighter" style={{ color }}>
            {price ? `$${price.toFixed(2)}` : 'N/A'}
        </span>
        <div className="mt-2 w-8 h-[2px]" style={{ backgroundColor: color + '33' }} />
    </div>
);

export default OilPricesChart;
