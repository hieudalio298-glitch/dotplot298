import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { supabase } from '../../supabaseClient';
import { Spin } from 'antd';
import dayjs from 'dayjs';

interface YieldData {
    tenor_label: string;
    spot_rate_annual: number;
    date: string;
    tenor_days: number;
}

const YieldCurveChart: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [chartOption, setChartOption] = useState<any>({});

    useEffect(() => {
        fetchYieldCurve();
    }, []);

    const fetchYieldCurve = async () => {
        try {
            setLoading(true);

            // Get latest date
            const { data: latestDateData } = await supabase
                .from('gov_yield_curve')
                .select('date')
                .order('date', { ascending: false })
                .limit(1);

            if (!latestDateData || latestDateData.length === 0) {
                setLoading(false);
                return;
            }

            const latestDate = latestDateData[0].date;
            // Get 1 month ago and 1 year ago (approx)
            const monthAgo = dayjs(latestDate).subtract(1, 'month').format('YYYY-MM-DD');
            const yearAgo = dayjs(latestDate).subtract(1, 'year').format('YYYY-MM-DD');

            // Fetch data for these 3 dates
            // Should properly find closest dates if exact not match, but for now exact or range.
            // Simplified: Fetch all data for these 3 dates? 
            // Better: fetch where date in [list]

            const datesToFetch = [latestDate, monthAgo, yearAgo];
            // Since we can't easily do "closest available", let's try to fetch exact matches first.
            // A better query strategy is needed for production (finding max(date) <= target).

            // For this implementation, I'll just fetch *latest* and *all distinct dates limit 5* to show history?
            // Let's just fetch latest 2 dates for simplicity of demo if history is sparse.

            // Actually, let's fetch everything and filter in JS if dataset is small, or use an RPC.
            // Dataset might be large.

            // Strategy: Fetch distinct dates first.
            const { data: distinctDates } = await supabase
                .from('gov_yield_curve')
                .select('date')
                .order('date', { ascending: false })
                .limit(365); // Last year of dates

            if (!distinctDates) return;

            const availableDates = Array.from(new Set(distinctDates.map(d => d.date)));
            const targetDates = [
                availableDates[0], // Latest
                availableDates.find(d => dayjs(d).isBefore(dayjs(latestDate).subtract(1, 'month'))) || availableDates[availableDates.length - 1],
                availableDates.find(d => dayjs(d).isBefore(dayjs(latestDate).subtract(1, 'year')))
            ].filter(Boolean) as string[];

            const { data } = await supabase
                .from('gov_yield_curve')
                .select('*')
                .in('date', targetDates)
                .order('tenor_days', { ascending: true });

            if (data) {
                processChartData(data, targetDates);
            }
        } catch (error) {
            console.error('Error fetching yield curve:', error);
        } finally {
            setLoading(false);
        }
    };

    const processChartData = (data: YieldData[], dates: string[]) => {
        const tenors = Array.from(new Set(data.map(d => d.tenor_label))).sort((a, b) => {
            // Custom sort for tenor labels if needed, or rely on tenor_days for sorting logic
            return 0;
        });

        // Better: use tenor_days to sort X axis
        const tenorOrder = data.filter((v, i, a) => a.findIndex(t => (t.tenor_label === v.tenor_label)) === i)
            .sort((a, b) => a.tenor_days - b.tenor_days)
            .map(d => d.tenor_label);

        const series = dates.map((date, index) => {
            const dayData = data.filter(d => d.date === date);
            // Map data to tenorOrder
            const values = tenorOrder.map(t => {
                const found = dayData.find(d => d.tenor_label === t);
                return found ? found.spot_rate_annual : null;
            });

            return {
                name: date,
                type: 'line',
                data: values,
                smooth: true,
                symbol: 'circle',
                symbolSize: 6,
                lineStyle: { width: index === 0 ? 3 : 1 }, // Highlight latest
                itemStyle: {
                    color: index === 0 ? '#ff9800' : (index === 1 ? '#4caf50' : '#2196f3')
                }
            };
        });

        const option = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(0,0,0,0.8)',
                borderColor: '#333',
                textStyle: { color: '#fff' }
            },
            legend: {
                data: dates,
                textStyle: { color: '#ccc' },
                bottom: 0
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '10%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: tenorOrder,
                axisLine: { lineStyle: { color: '#333' } },
                axisLabel: { color: '#666' }
            },
            yAxis: {
                type: 'value',
                axisLine: { show: false },
                axisLabel: { color: '#666' },
                splitLine: { lineStyle: { color: '#111' } }
            },
            series: series
        };

        setChartOption(option);
    };

    if (loading) return <div className="flex justify-center p-10"><Spin /></div>;

    return (
        <div className="w-full h-[400px]">
            <h3 className="text-[#e0e0e0] font-mono mb-4 text-xs uppercase border-l-2 border-[#ff9800] pl-2">
                Government Bond Yield Curve
            </h3>
            <ReactECharts option={chartOption} style={{ height: '350px', width: '100%' }} theme="dark" />
        </div>
    );
};

export default YieldCurveChart;
