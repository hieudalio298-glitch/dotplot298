import React, { useEffect, useState, useMemo } from 'react';
import { Table, Radio, Card, Empty, Spin, Checkbox, Space, Divider, Tooltip, Button, Dropdown, Input } from 'antd';
import { Activity, BarChart3, TrendingUp, Info, ChevronRight, ChevronDown, RefreshCw, LineChart, BarChart, Layers, Trash2, Settings2 } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { useDroppable } from '@dnd-kit/core';
import { supabase } from '../supabaseClient';

// --- CHUẨN VAS (Thông tư 200/2014/TT-BTC) - BẢNG CÂN ĐỐI KẾ TOÁN (SIÊU CHI TIẾT) ---
const VAS_BALANCE_STRUCTURE: any[] = [
    {
        code: '100', name: 'A. TÀI SẢN NGẮN HẠN', isBold: true,
        keys: ['100. TÀI SẢN NGẮN HẠN', 'TÀI SẢN NGẮN HẠN', 'A- TÀI SẢN NGẮN HẠN'],
        children: [
            {
                code: '110', name: 'I. Tiền và các khoản tương đương tiền', isBold: true,
                keys: ['110. Tiền và các khoản tương đương tiền', 'Tiền và các khoản tương đương tiền'],
                children: [
                    { code: '111', name: '1. Tiền', keys: ['Tiền', '111. Tiền'] },
                    { code: '112', name: '2. Các khoản tương đương tiền', keys: ['Các khoản tương đương tiền', '112. Các khoản tương đương tiền'] }
                ]
            },
            {
                code: '120', name: 'II. Đầu tư tài chính ngắn hạn', isBold: true,
                keys: ['120. Đầu tư tài chính ngắn hạn', 'Đầu tư tài chính ngắn hạn'],
                children: [
                    { code: '121', name: '1. Chứng khoán kinh doanh', keys: ['Chứng khoán kinh doanh', '121. Chứng khoán kinh doanh'] },
                    { code: '122', name: '2. Dự phòng giảm giá chứng khoán kinh doanh (*)', keys: ['Dự phòng giảm giá chứng khoán kinh doanh', '122. Dự phòng giảm giá chứng khoán kinh doanh'] },
                    { code: '123', name: '3. Đầu tư nắm giữ đến ngày đáo hạn', keys: ['Đầu tư nắm giữ đến ngày đáo hạn', '123. Đầu tư nắm giữ đến ngày đáo hạn'] }
                ]
            },
            {
                code: '130', name: 'III. Các khoản phải thu ngắn hạn', isBold: true,
                keys: ['130. Các khoản phải thu ngắn hạn', 'Các khoản phải thu ngắn hạn'],
                children: [
                    { code: '131', name: '1. Phải thu ngắn hạn của khách hàng', keys: ['Phải thu ngắn hạn của khách hàng', '131. Phải thu ngắn hạn của khách hàng'] },
                    { code: '132', name: '2. Trả trước cho người bán ngắn hạn', keys: ['Trả trước cho người bán ngắn hạn', '132. Trả trước cho người bán ngắn hạn'] },
                    { code: '134', name: '4. Phải thu theo tiến độ kế hoạch hợp đồng xây dựng', keys: ['Phải thu theo tiến độ kế hoạch hợp đồng xây dựng', '134. Phải thu theo tiến độ kế hoạch hợp đồng xây dựng'] },
                    { code: '135', name: '5. Phải thu về cho vay ngắn hạn', keys: ['Phải thu về cho vay ngắn hạn', '135. Phải thu về cho vay ngắn hạn'] },
                    { code: '136', name: '6. Phải thu ngắn hạn khác', keys: ['Phải thu ngắn hạn khác', '136. Phải thu ngắn hạn khác'] },
                    { code: '137', name: '7. Dự phòng phải thu ngắn hạn khó đòi (*)', keys: ['Dự phòng phải thu ngắn hạn khó đòi', '137. Dự phòng phải thu ngắn hạn khó đòi'] }
                ]
            },
            {
                code: '140', name: 'IV. Hàng tồn kho', isBold: true,
                keys: ['140. Hàng tồn kho', 'Hàng tồn kho', 'Hàng tồn kho, ròng'],
                children: [
                    { code: '141', name: '1. Hàng tồn kho', keys: ['Hàng tồn kho', '141. Hàng tồn kho'] },
                    { code: '149', name: '2. Dự phòng giảm giá hàng tồn kho (*)', keys: ['Dự phòng giảm giá hàng tồn kho', '149. Dự phòng giảm giá hàng tồn kho'] }
                ]
            },
            {
                code: '150', name: 'V. Tài sản ngắn hạn khác', isBold: true,
                keys: ['150. Tài sản ngắn hạn khác', 'Tài sản ngắn hạn khác'],
                children: [
                    { code: '151', name: '1. Chi phí trả trước ngắn hạn', keys: ['Chi phí trả trước ngắn hạn', '151. Chi phí trả trước ngắn hạn'] },
                    { code: '152', name: '2. Thuế GTGT được khấu trừ', keys: ['Thuế giá trị gia tăng được khấu trừ', '152. Thuế GTGT được khấu trừ'] },
                    { code: '153', name: '3. Thuế và các khoản khác phải thu nhà nước', keys: ['Thuế và các khoản khác phải thu của nhà nước', '153. Thuế và các khoản khác phải thu của Nhà nước'] },
                    { code: '155', name: '5. Tài sản ngắn hạn khác', keys: ['Tài sản ngắn hạn khác', '155. Tài sản ngắn hạn khác'] }
                ]
            }
        ]
    },
    {
        code: '200', name: 'B. TÀI SẢN DÀI HẠN', isBold: true,
        keys: ['200. TÀI SẢN DÀI HẠN', 'TÀI SẢN DÀI HẠN', 'B- TÀI SẢN DÀI HẠN'],
        children: [
            {
                code: '210', name: 'I. Các khoản phải thu dài hạn', isBold: true,
                keys: ['210. Các khoản phải thu dài hạn', 'Các khoản phải thu dài hạn'],
                children: [
                    { code: '211', name: '1. Phải thu dài hạn của khách hàng', keys: ['Phải thu dài hạn của khách hàng'] },
                    { code: '215', name: '5. Phải thu về cho vay dài hạn', keys: ['Phải thu về cho vay dài hạn'] },
                    { code: '216', name: '6. Phải thu dài hạn khác', keys: ['Phải thu dài hạn khác'] }
                ]
            },
            {
                code: '220', name: 'II. Tài sản cố định', isBold: true,
                keys: ['220. Tài sản cố định', 'Tài sản cố định'],
                children: [
                    {
                        code: '221', name: '1. Tài sản cố định hữu hình', keys: ['Tài sản cố định hữu hình', '221. Tài sản cố định hữu hình'],
                        children: [
                            { code: '222', name: '- Nguyên giá', keys: ['Nguyên giá (TSCĐ hữu hình)', 'Nguyên giá'] },
                            { code: '223', name: '- Giá trị hao mòn lũy kế (*)', keys: ['Giá trị hao mòn lũy kế (TSCĐ hữu hình)', 'Giá trị hao mòn lũy kế'] }
                        ]
                    },
                    {
                        code: '227', name: '3. Tài sản cố định vô hình', keys: ['Tài sản cố định vô hình', '227. Tài sản cố định vô hình'],
                        children: [
                            { code: '228', name: '- Nguyên giá', keys: ['Nguyên giá (TSCĐ vô hình)'] },
                            { code: '229', name: '- Giá trị hao mòn lũy kế (*)', keys: ['Giá trị hao mòn lũy kế (TSCĐ vô hình)'] }
                        ]
                    }
                ]
            },
            { code: '230', name: 'III. Bất động sản đầu tư', isBold: true, keys: ['230. Bất động sản đầu tư', 'Bất động sản đầu tư'] },
            {
                code: '240', name: 'IV. Tài sản dở dang dài hạn', isBold: true,
                keys: ['240. Tài sản dở dang dài hạn', 'Tài sản dở dang dài hạn'],
                children: [
                    { code: '242', name: '2. Chi phí xây dựng cơ bản dở dang', keys: ['Chi phí xây dựng cơ bản dở dang'] }
                ]
            },
            {
                code: '250', name: 'V. Đầu tư tài chính dài hạn', isBold: true,
                keys: ['250. Đầu tư tài chính dài hạn', 'Đầu tư tài chính dài hạn'],
                children: [
                    { code: '252', name: '2. Đầu tư vào công ty liên kết, liên doanh', keys: ['Đầu tư vào công ty liên kết, liên doanh'] },
                    { code: '253', name: '3. Đầu tư góp vốn vào đơn vị khác', keys: ['Đầu tư góp vốn vào đơn vị khác'] },
                    { code: '254', name: '4. Dự phòng đầu tư tài chính dài hạn (*)', keys: ['Dự phòng đầu tư tài chính dài hạn'] },
                    { code: '255', name: '5. Đầu tư nắm giữ đến ngày đáo hạn', keys: ['Đầu tư nắm giữ đến ngày đáo hạn (Dài hạn)'] },
                    { code: '256', name: '6. Đầu tư dài hạn khác', keys: ['Đầu tư dài hạn khác'] }
                ]
            },
            {
                code: '260', name: 'VI. Tài sản dài hạn khác', isBold: true,
                keys: ['260. Tài sản dài hạn khác', 'Tài sản dài hạn khác'],
                children: [
                    { code: '261', name: '1. Chi phí trả trước dài hạn', keys: ['Chi phí trả trước dài hạn'] },
                    { code: '262', name: '2. Tài sản thuế thu nhập hoãn lại', keys: ['Tài sản thuế thu nhập hoãn lại'] },
                    { code: '263', name: '3. Thiết bị, vật tư, phụ tùng thay thế dài hạn', keys: ['Thiết bị, vật tư, phụ tùng thay thế dài hạn'] },
                    { code: '268', name: '4. Tài sản dài hạn khác', keys: ['Tài sản dài hạn khác'] },
                    { code: '269', name: '5. Lợi thế thương mại', keys: ['Lợi thế thương mại'] }
                ]
            }
        ]
    },
    { code: '270', name: 'TỔNG CỘNG TÀI SẢN', isBold: true, keys: ['270. TỔNG CỘNG TÀI SẢN', 'TỔNG CỘNG TÀI SẢN', 'Tổng cộng tài sản'] },
    {
        code: '300', name: 'A. NỢ PHẢI TRẢ', isBold: true,
        keys: ['300. NỢ PHẢI TRẢ', 'NỢ PHẢI TRẢ', 'C- NỢ PHẢI TRẢ'],
        children: [
            {
                code: '310', name: 'I. Nợ ngắn hạn', isBold: true,
                keys: ['310. Nợ ngắn hạn', 'Nợ ngắn hạn'],
                children: [
                    { code: '311', name: '1. Phải trả người bán ngắn hạn', keys: ['Phải trả người bán ngắn hạn'] },
                    { code: '312', name: '2. Người mua trả tiền trước ngắn hạn', keys: ['Người mua trả tiền trước ngắn hạn'] },
                    { code: '313', name: '3. Thuế và các khoản phải nộp Nhà nước', keys: ['Thuế và các khoản phải nộp Nhà nước'] },
                    { code: '314', name: '4. Phải trả người lao động', keys: ['Phải trả người lao động'] },
                    { code: '315', name: '5. Chi phí phải trả ngắn hạn', keys: ['Chi phí phải trả ngắn hạn'] },
                    { code: '317', name: '7. Phải trả theo tiến độ kế hoạch hợp đồng xây dựng', keys: ['Phải trả theo tiến độ kế hoạch hợp đồng xây dựng (Nợ ngắn hạn)'] },
                    { code: '318', name: '8. Doanh thu chưa thực hiện ngắn hạn', keys: ['Doanh thu chưa thực hiện ngắn hạn'] },
                    { code: '319', name: '9. Phải trả ngắn hạn khác', keys: ['Phải trả ngắn hạn khác'] },
                    { code: '320', name: '10. Vay và nợ thuê tài chính ngắn hạn', keys: ['Vay và nợ thuê tài chính ngắn hạn'] },
                    { code: '321', name: '11. Dự phòng phải trả ngắn hạn', keys: ['Dự phòng phải trả ngắn hạn'] },
                    { code: '322', name: '12. Quỹ khen thưởng, phúc lợi', keys: ['Quỹ khen thưởng, phúc lợi'] }
                ]
            },
            {
                code: '330', name: 'II. Nợ dài hạn', isBold: true,
                keys: ['330. Nợ dài hạn', 'Nợ dài hạn'],
                children: [
                    { code: '336', name: '6. Doanh thu chưa thực hiện dài hạn', keys: ['Doanh thu chưa thực hiện dài hạn'] },
                    { code: '337', name: '7. Phải trả dài hạn khác', keys: ['Phải trả dài hạn khác'] },
                    { code: '338', name: '8. Vay và nợ thuê tài chính dài hạn', keys: ['Vay và nợ thuê tài chính dài hạn'] },
                    { code: '341', name: '11. Thuế thu nhập hoãn lại phải trả', keys: ['Thuế thu nhập hoãn lại phải trả'] },
                    { code: '342', name: '12. Dự phòng phải trả dài hạn', keys: ['Dự phòng phải trả dài hạn'] }
                ]
            }
        ]
    },
    {
        code: '400', name: 'B. VỐN CHỦ SỞ HỮU', isBold: true,
        keys: ['400. VỐN CHỦ SỞ HỮU', 'VỐN CHỦ SỞ HỮU', 'D- VỐN CHỦ SỞ HỮU'],
        children: [
            {
                code: '410', name: 'I. Vốn chủ sở hữu', isBold: true,
                keys: ['410. Vốn chủ sở hữu', 'Vốn chủ sở hữu', 'Vốn và các quỹ'],
                children: [
                    {
                        code: '411', name: '1. Vốn góp của chủ sở hữu', keys: ['Vốn đầu tư của chủ sở hữu', 'Vốn góp của chủ sở hữu', 'Vốn cổ phần'],
                        children: [
                            { code: '411a', name: '- Cổ phiếu phổ thông có quyền biểu quyết', keys: ['Cổ phiếu phổ thông có quyền biểu quyết'] }
                        ]
                    },
                    { code: '412', name: '2. Thặng dư vốn cổ phần', keys: ['Thặng dư vốn cổ phần'] },
                    { code: '414', name: '4. Vốn khác của chủ sở hữu', keys: ['Vốn khác của chủ sở hữu'] },
                    { code: '415', name: '5. Cổ phiếu quỹ (*)', keys: ['Cổ phiếu quỹ'] },
                    { code: '417', name: '7. Chênh lệch tỷ giá hối đoái', keys: ['Chênh lệch tỷ giá hối đoái'] },
                    { code: '418', name: '8. Quỹ đầu tư phát triển', keys: ['Quỹ đầu tư phát triển'] },
                    {
                        code: '421', name: '11. Lợi nhuận sau thuế chưa phân phối', keys: ['Lợi nhuận sau thuế chưa phân phối', 'Lợi nhuận chưa phân phối'],
                        children: [
                            { code: '421a', name: '- LNST chưa phân phối lũy kế đến cuối kỳ trước', keys: ['LNST chưa phân phối lũy kế đến cuối kỳ trước'] },
                            { code: '421b', name: '- LNST chưa phân phối kỳ này', keys: ['LNST chưa phân phối kỳ này'] }
                        ]
                    },
                    { code: '429', name: '13. Lợi ích cổ đông không kiểm soát', keys: ['Lợi ích cổ đông không kiểm soát'] },
                    { code: '419', name: '14. Quỹ dự phòng tài chính', keys: ['Quỹ dự phòng tài chính'] }
                ]
            },
            { code: '430', name: 'C. Lợi ích cổ đông thiểu số', isBold: true, keys: ['Lợi ích cổ đông thiểu số'] }
        ]
    },
    { code: '440', name: 'TỔNG CỘNG NGUỒN VỐN', isBold: true, keys: ['440. TỔNG CỘNG NGUỒN VỐN', 'TỔNG CỘNG NGUỒN VỐN', 'Tổng cộng nguồn vốn'] },
];


interface VASBalanceSheetProps {
    symbol: string | null;
}

const VASBalanceSheet: React.FC<VASBalanceSheetProps> = ({ symbol }) => {
    const [loading, setLoading] = useState(false);
    const [period, setPeriod] = useState<'year' | 'quarter'>('quarter');
    const [rawRecords, setRawRecords] = useState<any[]>([]);
    const [chartType, setChartType] = useState<'line' | 'bar' | 'stack'>('line');
    const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['TỔNG CỘNG TÀI SẢN']);
    const [metricAxes, setMetricAxes] = useState<Record<string, number>>({});
    const [metricTypes, setMetricTypes] = useState<Record<string, 'line' | 'bar' | 'stack'>>({});
    const [metricColors, setMetricColors] = useState<Record<string, string>>({});
    const [searchQuery, setSearchQuery] = useState('');

    const COLORS = ['#1677ff', '#52c41a', '#f5222d', '#faad14', '#13c2c2', '#722ed1', '#eb2f96'];

    const { setNodeRef, isOver } = useDroppable({
        id: 'vas-balance-chart-droppable',
    });

    useEffect(() => {
        if (symbol) fetchData();
    }, [symbol, period]);

    useEffect(() => {
        const handleGlobalDrop = (e: any) => {
            if (e.detail.overId === 'vas-balance-chart-droppable') {
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
                .eq('statement_type', 'balance_sheet')
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

            mapRecursive(VAS_BALANCE_STRUCTURE);

            // Consistency checks
            if (!result['TỔNG CỘNG TÀI SẢN'] || result['TỔNG CỘNG TÀI SẢN'] === 0) {
                result['TỔNG CỘNG TÀI SẢN'] = (result['A. TÀI SẢN NGẮN HẠN'] || 0) + (result['B. TÀI SẢN DÀI HẠN'] || 0);
            }
            if (!result['TỔNG CỘNG NGUỒN VỐN'] || result['TỔNG CỘNG NGUỒN VỐN'] === 0) {
                result['TỔNG CỘNG NGUỒN VỐN'] = (result['C. NỢ PHẢI TRẢ'] || 0) + (result['D. VỐN CHỦ SỞ HỮU'] || 0);
            }

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
        extract(VAS_BALANCE_STRUCTURE);
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
                        res += `<div style="display: flex; justify-content: space-between; gap: 20px; font-size: 12px; margin-bottom: 2px;">
                                    <span style="display: flex; align-items: center; gap: 6px;">${p.marker} ${p.seriesName}</span>
                                    <span style="font-weight: bold; color: #fff">${(p.value / 1e9).toFixed(2)} tỷ</span>
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
                    itemStyle: { color },
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
        setSelectedMetrics(['TỔNG CỘNG TÀI SẢN']);
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
                <span className={`inline-block align-middle ${record.isBold ? 'font-bold' : ''} text-[10px] py-1`}>
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
                    <div className="flex flex-col gap-3">
                        <Input
                            placeholder="Tìm chỉ tiêu..."
                            size="small"
                            prefix={<Activity size={12} className="text-gray-500" />}
                            className="bg-transparent border-gray-800 text-gray-300 placeholder:text-gray-600 focus:border-neon-blue"
                            allowClear
                            onChange={e => setSearchQuery(e.target.value)}
                        />
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
                    </div>
                </Card>
            </div>
            <Card className="border-none bg-[#0b0e11] shadow-2xl"
                title={
                    <div className="flex justify-between items-center w-full">
                        <Space split={<Divider type="vertical" className="bg-gray-700" />}>
                            <span className="text-white text-lg font-bold">CÂN ĐỐI KẾ TOÁN (VAS) - {symbol}</span>
                            <Radio.Group value={period} onChange={e => setPeriod(e.target.value)} buttonStyle="solid" size="small">
                                <Radio.Button value="year">NĂM</Radio.Button>
                                <Radio.Button value="quarter">QUÝ</Radio.Button>
                            </Radio.Group>
                        </Space>
                        <Tooltip title="Đơn vị: Tỷ VNĐ. Chuẩn Thông tư 200.">
                            <Info size={16} className="text-gray-500 cursor-help" />
                        </Tooltip>
                    </div>
                }>
                <Table
                    dataSource={VAS_BALANCE_STRUCTURE}
                    columns={columns as any}
                    pagination={false}
                    scroll={{ x: 1200, y: 500 }}
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

export default VASBalanceSheet;
