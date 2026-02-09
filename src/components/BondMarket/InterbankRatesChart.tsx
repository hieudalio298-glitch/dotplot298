import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { supabase } from '../../supabaseClient';
import { Spin, Select, Checkbox, Radio } from 'antd';
import type { RadioChangeEvent } from 'antd';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(isSameOrBefore);

interface InterbankWideData {
    date: string;
    on_rate?: number | null;
    on_volume?: number | null;
    '1w_rate'?: number | null;
    '1w_volume'?: number | null;
    '2w_rate'?: number | null;
    '2w_volume'?: number | null;
    '1m_rate'?: number | null;
    '1m_volume'?: number | null;
    '3m_rate'?: number | null;
    '3m_volume'?: number | null;
    '6m_rate'?: number | null;
    '6m_volume'?: number | null;
    '9m_rate'?: number | null;
    '9m_volume'?: number | null;
    '1y_rate'?: number | null;
    '1y_volume'?: number | null;
    [key: string]: any;
}

type ChartType = 'line' | 'bar' | 'stacked';
type ViewMode = 'rates' | 'volumes';

const ALL_TENORS = ['ON', '1W', '2W', '1M', '3M', '6M', '9M', '1Y'];

const InterbankRatesChart: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [chartOption, setChartOption] = useState<any>({});
    const [rawData, setRawData] = useState<InterbankWideData[]>([]);
    const [targetDates, setTargetDates] = useState<string[]>([]);

    // UI Controls State
    const [chartType, setChartType] = useState<ChartType>('line');
    const [viewMode, setViewMode] = useState<ViewMode>('rates');
    const [selectedTenors, setSelectedTenors] = useState<string[]>(ALL_TENORS);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (rawData.length > 0 && targetDates.length > 0) {
            processChartData();
        }
    }, [rawData, targetDates, chartType, viewMode, selectedTenors]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch all data
            const { data } = await supabase
                .from('interbank_rates')
                .select('*')
                .order('date', { ascending: true });

            if (data && data.length > 0) {
                // Get unique dates
                const uniqueDates = data.map(d => d.date);
                setRawData(data);
                setTargetDates(uniqueDates);
            }
        } catch (error) {
            console.error('Error fetching interbank rates:', error);
        } finally {
            setLoading(false);
        }
    };

    const processChartData = () => {
        // Map tenors to column names
        const tenorToColumn: Record<string, { rate: string; volume: string }> = {
            'ON': { rate: 'on_rate', volume: 'on_volume' },
            '1W': { rate: '1w_rate', volume: '1w_volume' },
            '2W': { rate: '2w_rate', volume: '2w_volume' },
            '1M': { rate: '1m_rate', volume: '1m_volume' },
            '3M': { rate: '3m_rate', volume: '3m_volume' },
            '6M': { rate: '6m_rate', volume: '6m_volume' },
            '9M': { rate: '9m_rate', volume: '9m_volume' },
            '1Y': { rate: '1y_rate', volume: '1y_volume' }
        };

        // Sort dates chronologically
        const sortedDates = [...targetDates].sort((a, b) =>
            new Date(a).getTime() - new Date(b).getTime()
        );

        const isStacked = chartType === 'stacked';
        const seriesType = chartType === 'line' ? 'line' : 'bar';

        // Define colors for tenors
        const tenorColors: Record<string, string> = {
            'ON': '#00e676',
            '1W': '#ffea00',
            '2W': '#2979ff',
            '1M': '#ff6b6b',
            '3M': '#4ecdc4',
            '6M': '#a29bfe',
            '9M': '#fd79a8',
            '1Y': '#fdcb6e'
        };

        // Create series for each selected tenor
        const series = selectedTenors.map((tenor, index) => {
            const columnNames = tenorToColumn[tenor];
            if (!columnNames) return null;

            const columnName = viewMode === 'rates' ? columnNames.rate : columnNames.volume;

            const values = sortedDates.map(date => {
                const found = rawData.find(d => d.date === date);
                if (!found) return null;

                const val = found[columnName];
                if (val === null || val === undefined) return null;

                return val;
            });

            const baseConfig: any = {
                name: tenor,
                type: seriesType,
                data: values,
                itemStyle: {
                    color: tenorColors[tenor] || `hsl(${index * 45}, 70%, 60%)`
                },
                connectNulls: true
            };

            if (seriesType === 'line') {
                baseConfig.smooth = true;
                baseConfig.symbol = 'circle';
                baseConfig.symbolSize = 4;
                baseConfig.lineStyle = { width: 2 };
            }

            if (isStacked) {
                baseConfig.stack = 'total';
            }

            return baseConfig;
        }).filter(s => s !== null);

        const yAxisLabel = viewMode === 'rates' ? 'Rate (%)' : 'Volume (Billion VND)';
        const tooltipFormatter = viewMode === 'rates'
            ? (params: any) => {
                let result = `<div style="font-weight: bold;">${params[0].axisValue}</div>`;
                params.forEach((item: any) => {
                    result += `<div>${item.marker} ${item.seriesName}: ${item.value !== null ? item.value.toFixed(2) + '%' : 'N/A'}</div>`;
                });
                return result;
            }
            : (params: any) => {
                let result = `<div style="font-weight: bold;">${params[0].axisValue}</div>`;
                params.forEach((item: any) => {
                    result += `<div>${item.marker} ${item.seriesName}: ${item.value !== null ? item.value.toLocaleString() + ' tỷ' : 'N/A'}</div>`;
                });
                return result;
            };

        const option = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(0,0,0,0.9)',
                borderColor: '#333',
                textStyle: { color: '#fff' },
                formatter: tooltipFormatter
            },
            legend: {
                data: selectedTenors,
                textStyle: { color: '#ccc' },
                bottom: 0
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '12%',
                top: '10%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                boundaryGap: seriesType === 'bar',
                data: sortedDates,
                axisLine: { lineStyle: { color: '#333' } },
                axisLabel: { color: '#9ca3af' }
            },
            yAxis: {
                type: 'value',
                name: yAxisLabel,
                nameTextStyle: { color: '#9ca3af', fontSize: 11 },
                axisLine: { show: false },
                axisLabel: {
                    color: '#9ca3af',
                    formatter: viewMode === 'rates' ? '{value}%' : '{value}'
                },
                splitLine: { lineStyle: { color: '#374151' } }
            },
            series: series
        };

        setChartOption(option);
    };

    const handleTenorChange = (checkedValues: any[]) => {
        setSelectedTenors(checkedValues);
    };

    if (loading) return <div className="flex justify-center p-10"><Spin /></div>;

    return (
        <div className="w-full">
            <h3 className="text-[#e0e0e0] font-mono mb-4 text-xs uppercase border-l-2 border-[#00e676] pl-2">
                Interbank Offer Rates (VNIBOR)
            </h3>

            {/* Controls */}
            <div className="mb-4 space-y-3">
                {/* View Mode and Chart Type */}
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-[#9ca3af] text-xs font-mono">View:</span>
                        <Radio.Group
                            value={viewMode}
                            onChange={(e: RadioChangeEvent) => setViewMode(e.target.value)}
                            size="small"
                        >
                            <Radio.Button value="rates" className="text-xs">Rates</Radio.Button>
                            <Radio.Button value="volumes" className="text-xs">Volumes</Radio.Button>
                        </Radio.Group>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[#9ca3af] text-xs font-mono">Chart:</span>
                        <Select
                            value={chartType}
                            onChange={(value: ChartType) => setChartType(value)}
                            size="small"
                            className="w-32"
                            options={[
                                { value: 'line', label: 'Line' },
                                { value: 'bar', label: 'Column' },
                                { value: 'stacked', label: 'Stacked' }
                            ]}
                        />
                    </div>
                </div>

                {/* Tenor Selection */}
                <div className="flex items-start gap-2">
                    <span className="text-[#9ca3af] text-xs font-mono pt-1">Tenors:</span>
                    <Checkbox.Group
                        value={selectedTenors}
                        onChange={handleTenorChange}
                        className="flex flex-wrap gap-2"
                    >
                        {ALL_TENORS.map(tenor => (
                            <Checkbox
                                key={tenor}
                                value={tenor}
                                className="text-[#9ca3af] text-xs m-0"
                            >
                                {tenor}
                            </Checkbox>
                        ))}
                    </Checkbox.Group>
                </div>
            </div>

            {/* Chart */}
            <ReactECharts
                option={chartOption}
                style={{ height: '400px', width: '100%' }}
                theme="dark"
                notMerge={true}
            />
        </div>
    );
};

export default InterbankRatesChart;
