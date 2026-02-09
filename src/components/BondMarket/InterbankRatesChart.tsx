import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { supabase } from '../../supabaseClient';
import { Spin, Select, Checkbox, Radio } from 'antd';
import type { RadioChangeEvent } from 'antd';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(isSameOrBefore);

interface InterbankData {
    tenor_label: string;
    rate: number;
    volume: number | null;
    date: string;
    source: string;
}

type ChartType = 'line' | 'bar' | 'stacked';
type ViewMode = 'rates' | 'volumes';

const ALL_TENORS = ['ON', '1W', '2W', '1M', '3M', '6M', '9M', '1Y'];

const InterbankRatesChart: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [chartOption, setChartOption] = useState<any>({});
    const [rawData, setRawData] = useState<InterbankData[]>([]);
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

            // Get latest date
            const { data: latestDateData } = await supabase
                .from('interbank_rates')
                .select('date')
                .order('date', { ascending: false })
                .limit(1);

            if (!latestDateData || latestDateData.length === 0) {
                setLoading(false);
                return;
            }

            const latestDate = latestDateData[0].date;

            // Strategy: Fetch distinct dates to find closest matches
            const { data: distinctDates } = await supabase
                .from('interbank_rates')
                .select('date')
                .order('date', { ascending: false })
                .limit(60);

            if (!distinctDates) return;

            const availableDates = Array.from(new Set(distinctDates.map(d => d.date)));
            const dates = [
                availableDates[0], // Latest
                availableDates.find(d => dayjs(d).isSameOrBefore(dayjs(latestDate).subtract(1, 'week'))) || availableDates[1],
                availableDates.find(d => dayjs(d).isSameOrBefore(dayjs(latestDate).subtract(1, 'month')))
            ].filter(Boolean) as string[];

            // Deduplicate targetDates
            const uniqueTargetDates = Array.from(new Set(dates));

            const { data } = await supabase
                .from('interbank_rates')
                .select('*')
                .in('date', uniqueTargetDates);

            if (data) {
                setRawData(data);
                setTargetDates(uniqueTargetDates);
            }
        } catch (error) {
            console.error('Error fetching interbank rates:', error);
        } finally {
            setLoading(false);
        }
    };

    const processChartData = () => {
        // Define tenor order
        const tenorOrderMap: Record<string, number> = {
            'ON': 0, 'OVERNIGHT': 0,
            '1W': 7, '1TUAN': 7,
            '2W': 14, '2TUAN': 14,
            '1M': 30, '1THANG': 30,
            '3M': 90, '3THANG': 90,
            '6M': 180, '6THANG': 180,
            '9M': 270, '9THANG': 270,
            '1Y': 365, '1NAM': 365, '12M': 365
        };

        // Filter data by selected tenors
        const filteredData = rawData.filter(d =>
            selectedTenors.some(t => t.toUpperCase() === d.tenor_label.toUpperCase())
        );

        const uniqueTenors = Array.from(new Set(filteredData.map(d => d.tenor_label)));
        const sortedTenors = uniqueTenors.sort((a, b) => {
            const valA = tenorOrderMap[a.toUpperCase()] ?? 9999;
            const valB = tenorOrderMap[b.toUpperCase()] ?? 9999;
            return valA - valB;
        });

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

        // Create series for each tenor (each tenor is a line)
        const series = sortedTenors.map((tenor, index) => {
            const values = sortedDates.map(date => {
                const found = filteredData.find(d => d.date === date && d.tenor_label === tenor);
                if (viewMode === 'rates') {
                    return found ? found.rate : null;
                } else {
                    return found && found.volume !== null ? found.volume : null;
                }
            });

            const baseConfig: any = {
                name: tenor,
                type: seriesType,
                data: values,
                itemStyle: {
                    color: tenorColors[tenor] || `hsl(${index * 45}, 70%, 60%)`
                }
            };

            if (seriesType === 'line') {
                baseConfig.smooth = true;
                baseConfig.symbol = 'circle';
                baseConfig.symbolSize = 6;
                baseConfig.lineStyle = { width: 2 };
            }

            if (isStacked) {
                baseConfig.stack = 'total';
            }

            return baseConfig;
        });

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
                data: sortedTenors,
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

    const handleTenorChange = (checkedValues: string[]) => {
        if (checkedValues.length > 0) {
            setSelectedTenors(checkedValues);
        }
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
            />
        </div>
    );
};

export default InterbankRatesChart;
