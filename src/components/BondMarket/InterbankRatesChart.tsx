import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { supabase } from '../../supabaseClient';
import { Spin } from 'antd';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(isSameOrBefore);

interface InterbankData {
    tenor_label: string;
    rate: number;
    date: string;
    source: string;
}

const InterbankRatesChart: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [chartOption, setChartOption] = useState<any>({});

    useEffect(() => {
        fetchData();
    }, []);

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
            // Get 1 week ago and 1 month ago for comparison
            const weekAgo = dayjs(latestDate).subtract(1, 'week').format('YYYY-MM-DD');
            const monthAgo = dayjs(latestDate).subtract(1, 'month').format('YYYY-MM-DD');

            const datesToFetch = [latestDate, weekAgo, monthAgo];

            // Strategy: Fetch distinct dates to find closest matches
            const { data: distinctDates } = await supabase
                .from('interbank_rates')
                .select('date')
                .order('date', { ascending: false })
                .limit(60);

            if (!distinctDates) return;

            const availableDates = Array.from(new Set(distinctDates.map(d => d.date)));
            const targetDates = [
                availableDates[0], // Latest
                availableDates.find(d => dayjs(d).isSameOrBefore(dayjs(latestDate).subtract(1, 'week'))) || availableDates[1],
                availableDates.find(d => dayjs(d).isSameOrBefore(dayjs(latestDate).subtract(1, 'month')))
            ].filter(Boolean) as string[];

            // Deduplicate targetDates
            const uniqueTargetDates = Array.from(new Set(targetDates));

            const { data } = await supabase
                .from('interbank_rates')
                .select('*')
                .in('date', uniqueTargetDates);

            if (data) {
                processChartData(data, uniqueTargetDates);
            }
        } catch (error) {
            console.error('Error fetching interbank rates:', error);
        } finally {
            setLoading(false);
        }
    };

    const processChartData = (data: InterbankData[], dates: string[]) => {
        // Define tenor order: ON, 1W, 2W, 1M, 3M, 6M, 9M, 1Y
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

        const uniqueTenors = Array.from(new Set(data.map(d => d.tenor_label)));
        const sortedTenors = uniqueTenors.sort((a, b) => {
            const valA = tenorOrderMap[a.toUpperCase()] ?? 9999;
            const valB = tenorOrderMap[b.toUpperCase()] ?? 9999;
            return valA - valB;
        });

        const series = dates.map((date, index) => {
            const dayData = data.filter(d => d.date === date);
            const values = sortedTenors.map(t => {
                const found = dayData.find(d => d.tenor_label === t);
                return found ? found.rate : null;
            });

            return {
                name: date,
                // type: 'bar', // commented out
                type: 'line',
                data: values,
                smooth: true,
                symbol: 'circle',
                symbolSize: 6,
                lineStyle: { width: index === 0 ? 3 : 1 },
                itemStyle: {
                    color: index === 0 ? '#00e676' : (index === 1 ? '#ffea00' : '#2979ff')
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
                data: sortedTenors,
                axisLine: { lineStyle: { color: '#333' } },
                axisLabel: { color: '#9ca3af' }
            },
            yAxis: {
                type: 'value',
                axisLine: { show: false },
                axisLabel: { color: '#9ca3af' },
                splitLine: { lineStyle: { color: '#374151' } } // Darker split line
            },
            series: series
        };

        setChartOption(option);
    };

    // Need isSameOrBefore plugin for dayjs?
    // dayjs core doesn't have isSameOrBefore, need plugin.
    // I'll avoid isSameOrBefore and use simple comparison.

    if (loading) return <div className="flex justify-center p-10"><Spin /></div>;

    return (
        <div className="w-full h-[400px]">
            <h3 className="text-[#e0e0e0] font-mono mb-4 text-xs uppercase border-l-2 border-[#00e676] pl-2">
                Interbank Offer Rates (VNIBOR)
            </h3>
            <ReactECharts option={chartOption} style={{ height: '350px', width: '100%' }} theme="dark" />
        </div>
    );
};

export default InterbankRatesChart;
