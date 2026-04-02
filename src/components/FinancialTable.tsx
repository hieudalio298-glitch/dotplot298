import React, { useEffect, useState } from 'react';
import { Table, Radio, Card, Empty, Spin } from 'antd';
import { supabase } from '../supabaseClient';
import { FinancialStatement, FinancialRatio } from '../types';
import type { ColumnsType } from 'antd/es/table';

interface Props {
    symbol: string | null;
    type: 'statement' | 'ratio';
    subType?: 'income_statement' | 'balance_sheet' | 'cash_flow';
}

const FinancialTable: React.FC<Props> = ({ symbol, type, subType }) => {
    const [loading, setLoading] = useState(false);
    const [period, setPeriod] = useState<'year' | 'quarter'>('year');
    const [dataSource, setDataSource] = useState<any[]>([]);
    const [columns, setColumns] = useState<ColumnsType<any>>([]);

    useEffect(() => {
        if (symbol) {
            fetchData();
        } else {
            setDataSource([]);
        }
    }, [symbol, period, type, subType]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const findVal = (data: any, aliases: string[], minAbs: number = 0) => {
                if (!data) return 0;
                const keys = Object.keys(data);

                const cleanStr = (s: string) => s.toLowerCase().replace(/^[0-9ivx.-]+\s*/i, '').replace(/[:\s]/g, '').trim();

                // Priority 1: Exact Clean Match
                for (const alias of aliases) {
                    const ca = cleanStr(alias);
                    const match = keys.find(k => cleanStr(k) === ca);
                    if (match !== undefined) {
                        const val = data[match];
                        if (val !== null && val !== undefined && val !== '') {
                            const num = typeof val === 'string' ? parseFloat(val.replace(/,/g, '').replace(/\s/g, '')) : Number(val);
                            if (!isNaN(num) && (minAbs === 0 || Math.abs(num) >= minAbs)) return num;
                        }
                    }
                }

                // Priority 2: Fuzzy Match
                for (const alias of aliases) {
                    const ca = cleanStr(alias);
                    if (ca.length < 5) continue;
                    const match = keys.find(k => cleanStr(k).includes(ca));
                    if (match !== undefined) {
                        const val = data[match];
                        if (val !== null && val !== undefined && val !== '') {
                            const num = typeof val === 'string' ? parseFloat(val.replace(/,/g, '').replace(/\s/g, '')) : Number(val);
                            if (!isNaN(num) && (minAbs === 0 || Math.abs(num) >= minAbs)) return num;
                        }
                    }
                }
                return 0;
            };

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
                LIABILITIES: ['Nợ phải trả', 'Tổng nợ phải trả']
            };

            // Fetch multiple tables if type is ratio
            const tablesToFetch = type === 'ratio'
                ? ['financial_ratios', 'financial_statements']
                : [type === 'statement' ? 'financial_statements' : 'financial_ratios'];

            const allDataPromises = tablesToFetch.map(t =>
                supabase.from(t).select('*').eq('symbol', symbol).eq('period_type', period)
            );

            const results = await Promise.all(allDataPromises);
            let mergedRawData: any[] = [];

            const ratioTableKeys = new Set<string>();
            results.forEach((res, idx) => {
                const tableName = tablesToFetch[idx];
                if (res.data) {
                    res.data.forEach((record: any) => {
                        if (record.data) {
                            const rows = Array.isArray(record.data) ? record.data : [record.data];
                            if (tableName === 'financial_ratios') {
                                rows.forEach((r: any) => Object.keys(r).forEach(k => ratioTableKeys.add(k)));
                            }
                            mergedRawData = [...mergedRawData, ...rows];
                        }
                    });
                }
            });

            if (mergedRawData.length > 0) {
                // 1. NORMALIZE PERIODS
                const getPeriodKey = (d: any) => {
                    const y = d['Năm'] || d['year'] || d['Year'] || d['reported date']?.substring(0, 4) || d['reported_date']?.substring(0, 4);
                    const q = d['Quý'] || d['quarter'] || d['Quarter'];
                    if (period === 'year') return y?.toString();
                    if (q) return `Q${q}/${y}`;
                    return d['Kỳ báo cáo'] || d['period'] || d['index'] || y?.toString();
                };

                const uniqueDataMap = new Map();
                mergedRawData.forEach(d => {
                    const p = getPeriodKey(d);
                    if (!p) return;
                    if (!uniqueDataMap.has(p)) {
                        uniqueDataMap.set(p, d);
                    } else {
                        uniqueDataMap.set(p, { ...uniqueDataMap.get(p), ...d });
                    }
                });

                let cleanData = Array.from(uniqueDataMap.values());
                let periods = Array.from(new Set(cleanData.map(getPeriodKey)))
                    .filter(Boolean)
                    .sort((a, b) => {
                        const parse = (s: string) => {
                            const m = s.match(/Q(\d)\/(\d{4})/);
                            if (m) return { q: parseInt(m[1]), y: parseInt(m[2]) };
                            return { q: 0, y: parseInt(s) };
                        };
                        const pA = parse(a);
                        const pB = parse(b);
                        if (pB.y !== pA.y) return pB.y - pA.y;
                        return pB.q - pA.q;
                    });

                // 2. DEFINE CALCULATED RATIOS (CFA Standards)
                const cfaRatios = [
                    { metric: 'CHỈ SỐ TRỰC QUAN (Key Indicators)', isHeader: true },
                    {
                        metric: 'ROIC (%)',
                        compute: (d: any, prevD?: any, allData?: any[], currentPeriod?: string) => {
                            // Rolling calculation for quarterly data
                            if (period === 'quarter' && allData && currentPeriod) {
                                const match = currentPeriod.match(/Q(\d)\/(\d{4})/);
                                if (!match) return null;

                                const currentQ = parseInt(match[1]);
                                const currentY = parseInt(match[2]);

                                // Get last 4 quarters including current
                                const last4Quarters: any[] = [];
                                for (let i = 0; i < 4; i++) {
                                    let q = currentQ - i;
                                    let y = currentY;
                                    while (q <= 0) {
                                        q += 4;
                                        y -= 1;
                                    }
                                    const targetP = `Q${q}/${y}`;
                                    const foundData = allData.find(dd => getPeriodKey(dd) === targetP);
                                    if (foundData) last4Quarters.push(foundData);
                                }

                                if (last4Quarters.length < 4) return null;

                                // Sum EBIT over 4 quarters
                                const totalEbit = last4Quarters.reduce((sum, qd) => sum + findVal(qd, ALIAS.EBIT), 0) * 0.8;

                                // Average Equity + Long Debt over 4 quarters
                                const avgInvestedCapital = last4Quarters.reduce((sum, qd) => {
                                    return sum + (findVal(qd, ALIAS.EQUITY, 1000) + findVal(qd, ALIAS.LONG_DEBT));
                                }, 0) / 4;

                                return avgInvestedCapital > 0 ? (totalEbit / avgInvestedCapital) * 100 : null;
                            }

                            // Simple calculation for yearly data
                            const ebit = findVal(d, ALIAS.EBIT);
                            const equity = findVal(d, ALIAS.EQUITY, 1000);
                            const longDebt = findVal(d, ALIAS.LONG_DEBT);
                            return (equity + longDebt) > 0 ? (ebit * 0.8 / (equity + longDebt)) * 100 : null;
                        }
                    },
                    { metric: 'NHÓM CHỈ SỐ THANH TOÁN (Liquidity)', isHeader: true },
                    {
                        metric: 'Thanh toán hiện hành (Current Ratio)',
                        compute: (d: any) => {
                            const curAssets = findVal(d, ALIAS.CUR_ASSETS);
                            const curLiab = findVal(d, ALIAS.CUR_LIAB);
                            return curLiab > 0 ? curAssets / curLiab : null;
                        }
                    },
                    {
                        metric: 'Thanh toán nhanh (Quick Ratio)',
                        compute: (d: any) => {
                            const curAssets = findVal(d, ALIAS.CUR_ASSETS);
                            const inv = findVal(d, ALIAS.INV);
                            const curLiab = findVal(d, ALIAS.CUR_LIAB);
                            return curLiab > 0 ? (curAssets - inv) / curLiab : null;
                        }
                    },
                    {
                        metric: 'Thanh toán tức thời (Cash Ratio)',
                        compute: (d: any) => {
                            const cash = findVal(d, ALIAS.CASH);
                            const curLiab = findVal(d, ALIAS.CUR_LIAB);
                            return curLiab > 0 ? cash / curLiab : null;
                        }
                    },
                    {
                        metric: 'Khả năng chi trả lãi vay (ICR)',
                        compute: (d: any, prevD?: any, allData?: any[], currentPeriod?: string) => {
                            // Rolling calculation for quarterly data
                            if (period === 'quarter' && allData && currentPeriod) {
                                const match = currentPeriod.match(/Q(\d)\/(\d{4})/);
                                if (!match) return null;

                                const currentQ = parseInt(match[1]);
                                const currentY = parseInt(match[2]);

                                // Get last 4 quarters including current
                                const last4Quarters: any[] = [];
                                for (let i = 0; i < 4; i++) {
                                    let q = currentQ - i;
                                    let y = currentY;
                                    while (q <= 0) {
                                        q += 4;
                                        y -= 1;
                                    }
                                    const targetP = `Q${q}/${y}`;
                                    const foundData = allData.find(dd => getPeriodKey(dd) === targetP);
                                    if (foundData) last4Quarters.push(foundData);
                                }

                                if (last4Quarters.length < 4) return null;

                                // Sum EBIT and Interest Expense over 4 quarters
                                const totalEbit = last4Quarters.reduce((sum, qd) => sum + findVal(qd, ALIAS.EBIT), 0);
                                const totalInterest = last4Quarters.reduce((sum, qd) => sum + Math.abs(findVal(qd, ALIAS.INTEREST)), 0);

                                return totalInterest > 0 ? totalEbit / totalInterest : null;
                            }

                            // Simple calculation for yearly data
                            const ebit = findVal(d, ALIAS.EBIT);
                            const interest = Math.abs(findVal(d, ALIAS.INTEREST));
                            return interest > 0 ? ebit / interest : null;
                        }
                    },
                    { metric: 'NHÓM CƠ CẤU NGUỒN VỐN (Capital Structure)', isHeader: true },
                    {
                        metric: 'Nợ/Tổng tài sản (%)',
                        compute: (d: any) => {
                            const debt = findVal(d, ALIAS.SHORT_DEBT) + findVal(d, ALIAS.LONG_DEBT);
                            const assets = findVal(d, ALIAS.ASSETS);
                            return assets > 0 ? (debt / assets) * 100 : null;
                        }
                    },
                    {
                        metric: 'VCSH/Tổng tài sản (%)',
                        compute: (d: any) => {
                            const equity = findVal(d, ALIAS.EQUITY);
                            const assets = findVal(d, ALIAS.ASSETS);
                            return assets > 0 ? (equity / assets) * 100 : null;
                        }
                    },
                    {
                        metric: 'Nợ/VCSH (D/E)',
                        compute: (d: any) => {
                            const debt = findVal(d, ALIAS.SHORT_DEBT) + findVal(d, ALIAS.LONG_DEBT);
                            const equity = findVal(d, ALIAS.EQUITY);
                            return equity > 0 ? debt / equity : null;
                        }
                    },
                    { metric: 'NHÓM HIỆU QUẢ HOẠT ĐỘNG (Activity)', isHeader: true },
                    {
                        metric: 'Vòng quay hàng tồn kho (lần)',
                        compute: (d: any) => {
                            const cogs = Math.abs(findVal(d, ALIAS.COGS));
                            const inv = findVal(d, ALIAS.INV, 1000);
                            return inv > 0 ? cogs / inv : null;
                        }
                    },
                    {
                        metric: 'Số ngày tồn kho (DSI)',
                        compute: (d: any) => {
                            const cogs = Math.abs(findVal(d, ALIAS.COGS, 1000));
                            const inv = findVal(d, ALIAS.INV);
                            return cogs > 0 ? (inv * 365) / cogs : null;
                        }
                    },
                    {
                        metric: 'Vòng quay khoản phải thu (lần)',
                        compute: (d: any) => {
                            const rev = findVal(d, ALIAS.REV, 1000);
                            const rec = findVal(d, ALIAS.REC, 1000);
                            return rec > 0 ? rev / rec : null;
                        }
                    },
                    {
                        metric: 'Số ngày phải thu (DSO)',
                        compute: (d: any) => {
                            const rev = findVal(d, ALIAS.REV, 1000); // Doanh thu phải lớn
                            const rec = findVal(d, ALIAS.REC);
                            return rev > 0 ? (rec * 365) / rev : null;
                        }
                    },
                    {
                        metric: 'Chu kỳ tiền mặt (CCC)',
                        compute: (d: any) => {
                            const cogs = Math.abs(findVal(d, ALIAS.COGS, 1000));
                            const rev = findVal(d, ALIAS.REV, 1000);
                            const inv = findVal(d, ALIAS.INV);
                            const rec = findVal(d, ALIAS.REC);
                            const pay = findVal(d, ALIAS.PAYABLES);
                            const dsi = cogs > 0 ? (inv * 365) / cogs : 0;
                            const dso = rev > 0 ? (rec * 365) / rev : 0;
                            const dpo = cogs > 0 ? (pay * 365) / cogs : 0;
                            return dsi + dso - dpo;
                        }
                    },
                    {
                        metric: 'Vòng quay tài sản cố định (FAT)',
                        compute: (d: any) => {
                            const rev = findVal(d, ALIAS.REV);
                            const fa = findVal(d, ALIAS.FA, 1000);
                            return fa > 0 ? rev / fa : null;
                        }
                    },
                    { metric: 'NHÓM TĂNG TRƯỞNG (Growth)', isHeader: true },
                    {
                        metric: 'Tăng trưởng doanh thu (%)',
                        compute: (d: any, prevD?: any) => {
                            if (!prevD) return null;
                            const rev = findVal(d, ALIAS.REV);
                            const prevRev = findVal(prevD, ALIAS.REV);
                            return prevRev > 0 ? ((rev - prevRev) / prevRev) * 100 : null;
                        }
                    },
                    {
                        metric: 'Tăng trưởng LNST (%)',
                        compute: (d: any, prevD?: any) => {
                            if (!prevD) return null;
                            const ni = findVal(d, ALIAS.NI);
                            const prevNi = findVal(prevD, ALIAS.NI);
                            return prevNi > 0 ? ((ni - prevNi) / prevNi) * 100 : null;
                        }
                    },
                    {
                        metric: 'Tăng trưởng LNST Cty mẹ (%)',
                        compute: (d: any, prevD?: any) => {
                            if (!prevD) return null;
                            const val = findVal(d, ALIAS.NI_PARENT);
                            const prevVal = findVal(prevD, ALIAS.NI_PARENT);
                            return prevVal > 0 ? ((val - prevVal) / prevVal) * 100 : null;
                        }
                    },
                    {
                        metric: 'Tăng trưởng LN từ HĐKD (%)',
                        compute: (d: any, prevD?: any) => {
                            if (!prevD) return null;
                            const val = findVal(d, ALIAS.EBIT);
                            const prevVal = findVal(prevD, ALIAS.EBIT);
                            return prevVal > 0 ? ((val - prevVal) / prevVal) * 100 : null;
                        }
                    },
                    {
                        metric: 'Biên lợi nhuận gộp (%)',
                        compute: (d: any) => {
                            const rev = findVal(d, ALIAS.REV, 1000);
                            const gp = findVal(d, ALIAS.GP);
                            return rev > 0 ? (gp / rev) * 100 : null;
                        }
                    },
                    {
                        metric: 'Biên lợi nhuận ròng (%)',
                        compute: (d: any) => {
                            const rev = findVal(d, ALIAS.REV, 1000);
                            const ni = findVal(d, ALIAS.NI);
                            return rev > 0 ? (ni / rev) * 100 : null;
                        }
                    },
                    { metric: 'HIỆU QUẢ SINH LỜI (Profitability)', isHeader: true },
                    {
                        metric: 'Biên EBIT (%)',
                        compute: (d: any) => {
                            const rev = findVal(d, ALIAS.REV, 1000); // Doanh thu phải > 1000
                            const ebit = findVal(d, ALIAS.EBIT);
                            return rev > 0 ? (ebit / rev) * 100 : null;
                        }
                    },
                    {
                        metric: 'ROE (%)',
                        compute: (d: any, prevD?: any, allData?: any[], currentPeriod?: string) => {
                            // Rolling calculation for quarterly data
                            if (period === 'quarter' && allData && currentPeriod) {
                                const match = currentPeriod.match(/Q(\d)\/(\d{4})/);
                                if (!match) return null;

                                const currentQ = parseInt(match[1]);
                                const currentY = parseInt(match[2]);

                                // Get last 4 quarters including current
                                const last4Quarters: any[] = [];
                                for (let i = 0; i < 4; i++) {
                                    let q = currentQ - i;
                                    let y = currentY;
                                    while (q <= 0) {
                                        q += 4;
                                        y -= 1;
                                    }
                                    const targetP = `Q${q}/${y}`;
                                    const foundData = allData.find(dd => getPeriodKey(dd) === targetP);
                                    if (foundData) last4Quarters.push(foundData);
                                }

                                if (last4Quarters.length < 4) return null;

                                // Sum Net Income over 4 quarters
                                const totalNI = last4Quarters.reduce((sum, qd) => sum + findVal(qd, ALIAS.NI), 0);

                                // Average Equity over 4 quarters
                                const avgEquity = last4Quarters.reduce((sum, qd) => sum + findVal(qd, ALIAS.EQUITY, 1000), 0) / 4;

                                return avgEquity > 0 ? (totalNI / avgEquity) * 100 : null;
                            }

                            // Simple calculation for yearly data
                            const ni = findVal(d, ALIAS.NI);
                            const equity = findVal(d, ALIAS.EQUITY, 1000);
                            return equity > 0 ? (ni / equity) * 100 : null;
                        }
                    },
                    {
                        metric: 'ROA (%)',
                        compute: (d: any, prevD?: any, allData?: any[], currentPeriod?: string) => {
                            // Rolling calculation for quarterly data
                            if (period === 'quarter' && allData && currentPeriod) {
                                const match = currentPeriod.match(/Q(\d)\/(\d{4})/);
                                if (!match) return null;

                                const currentQ = parseInt(match[1]);
                                const currentY = parseInt(match[2]);

                                // Get last 4 quarters including current
                                const last4Quarters: any[] = [];
                                for (let i = 0; i < 4; i++) {
                                    let q = currentQ - i;
                                    let y = currentY;
                                    while (q <= 0) {
                                        q += 4;
                                        y -= 1;
                                    }
                                    const targetP = `Q${q}/${y}`;
                                    const foundData = allData.find(dd => getPeriodKey(dd) === targetP);
                                    if (foundData) last4Quarters.push(foundData);
                                }

                                if (last4Quarters.length < 4) return null;

                                // Sum Net Income over 4 quarters
                                const totalNI = last4Quarters.reduce((sum, qd) => sum + findVal(qd, ALIAS.NI), 0);

                                // Average Assets over 4 quarters
                                const avgAssets = last4Quarters.reduce((sum, qd) => sum + findVal(qd, ALIAS.ASSETS, 1000), 0) / 4;

                                return avgAssets > 0 ? (totalNI / avgAssets) * 100 : null;
                            }

                            // Simple calculation for yearly data
                            const ni = findVal(d, ALIAS.NI);
                            const assets = findVal(d, ALIAS.ASSETS, 1000);
                            return assets > 0 ? (ni / assets) * 100 : null;
                        }
                    }
                ];

                // 3. PIVOT DATA & INJECT CALCULATED RATIOS
                const timeKeys = ['Năm', 'Quý', 'Kỳ báo cáo', 'year', 'quarter', 'period', 'index', 'symbol', 'id', 'updated_at', 'Mã CP', 'report_period', 'reported date', 'reported_date'];
                const allKeys = Array.from(new Set(cleanData.flatMap(d => Object.keys(d))));
                const dbMetrics = allKeys.filter(k => !timeKeys.includes(k) && !periods.includes(k));

                // Final records to show
                let finalMetrics: any[] = [];

                if (type === 'ratio') {
                    // Add Calculated CFA Ratios First
                    cfaRatios.forEach(cfa => {
                        const row: any = { metric: cfa.metric, isHeader: cfa.isHeader };
                        if (!cfa.isHeader && cfa.compute) {
                            periods.forEach((p, idx) => {
                                const found = cleanData.find(d => getPeriodKey(d) === p);

                                // Determine the comparison period for Growth metrics (YoY)
                                let prevFound = null;
                                if (period === 'year') {
                                    const prevPeriod = periods[idx + 1];
                                    prevFound = prevPeriod ? cleanData.find(d => getPeriodKey(d) === prevPeriod) : null;
                                } else {
                                    // For quarter, search for same quarter last year (YoY)
                                    const match = p.match(/Q(\d)\/(\d{4})/);
                                    if (match) {
                                        const q = match[1];
                                        const y = parseInt(match[2]) - 1;
                                        const targetP = `Q${q}/${y}`;
                                        prevFound = cleanData.find(d => getPeriodKey(d) === targetP);
                                    }
                                }

                                row[p] = found ? (cfa as any).compute(found, prevFound, cleanData, p) : null;
                            });
                        }
                        finalMetrics.push(row);
                    });

                    finalMetrics.push({ metric: 'CHỈ SỐ TỪ HỆ THỐNG (Database)', isHeader: true });
                }

                dbMetrics.filter(m => {
                    if (type === 'ratio') {
                        // 1. Chỉ giữ lại các chỉ số THỰC SỰ đến từ bảng financial_ratios
                        if (!ratioTableKeys.has(m)) return false;

                        // 2. Loại bỏ các mã số kế toán hoặc chỉ tiêu thô nếu chúng lọt vào bảng ratio
                        if (/^(\d+|[IVXLC]+)\./.test(m)) return false;

                        // 3. Loại bỏ các trường hệ thống
                        const hideList = ['ticker', 'period_type', 'year_period', 'quarter_period', 'lãi suất', 'interest', 'index', 'symbol', 'id', 'updated_at', 'Mã CP'];
                        if (hideList.some(h => m.toLowerCase().includes(h))) return false;

                        // 4. Nếu giá trị trung bình quá lớn (hàng triệu/tỷ), khả năng là số thô lọt vào, cũng nên ẩn
                        return true;
                    }
                    return true;
                }).forEach(m => {
                    const row: any = { metric: m };
                    periods.forEach(p => {
                        const found = cleanData.find(d => getPeriodKey(d) === p);
                        row[p] = found ? found[m] : null;
                    });
                    finalMetrics.push(row);
                });

                // 4. SETUP COLUMNS
                const newCols: ColumnsType<any> = [
                    {
                        title: 'METRIC',
                        dataIndex: 'metric',
                        key: 'metric',
                        fixed: 'left',
                        width: 450,
                        className: 'bg-[#0a0a0a] text-[#e0e0e0] font-mono border-r border-[#333]',
                        render: (text: string, record: any) => (
                            <div
                                className={`${record.isHeader ? 'text-[#ff9800] font-black tracking-widest text-[11px] uppercase border-b border-[#333] w-full block py-1' : 'text-[#e0e0e0] text-[11px] font-mono'} pl-2`}
                                style={{
                                    maxWidth: '430px',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: 'block'
                                }}
                                title={text}
                            >

                                {(() => {
                                    let cleanText = text.replace(/---/g, '').trim();
                                    const replacements: Record<string, string> = {
                                        'Lưu chuyển tiền thuần từ hoạt động kinh doanh': 'LCT thuần từ HĐKD',
                                        'Lưu chuyển tiền thuần từ hoạt động đầu tư': 'LCT thuần từ HĐĐT',
                                        'Lưu chuyển tiền thuần từ hoạt động tài chính': 'LCT thuần từ HĐTC',
                                        'Tiền và tương đương tiền': 'Tiền & TĐT',
                                        'Doanh thu thuần về bán hàng và cung cấp dịch vụ': 'Doanh thu thuần',
                                        'Lợi nhuận sau thuế thu nhập doanh nghiệp': 'LNST thu nhập DN',
                                        'Lợi nhuận gộp về bán hàng và cung cấp dịch vụ': 'Lợi nhuận gộp'
                                    };

                                    // Exact match replacement first
                                    if (replacements[cleanText]) return replacements[cleanText];

                                    // Partial replacements if no exact match
                                    Object.entries(replacements).forEach(([key, val]) => {
                                        if (cleanText.includes(key)) {
                                            cleanText = cleanText.replace(key, val);
                                        }
                                    });
                                    return cleanText;
                                })()}
                            </div>
                        )
                    }
                ];

                periods.forEach(p => {
                    newCols.push({
                        title: <span className="text-[#ff9800] tracking-wider uppercase">{p}</span>,
                        dataIndex: p,
                        key: p,
                        align: 'right',
                        width: 140,
                        className: 'bg-black text-[#e0e0e0] font-mono border-r border-[#1a1a1a]',
                        render: (value: any, record: any) => {
                            if (record.isHeader) return null;

                            let numValue = value;
                            if (typeof value === 'string') {
                                // Try to parse string as number
                                const clean = value.replace(/,/g, '');
                                if (!isNaN(Number(clean)) && clean.trim() !== '') {
                                    numValue = Number(clean);
                                }
                            }

                            if (typeof numValue === 'number') {
                                const isPercent = record.metric.includes('(%)');
                                const isTurnover = record.metric.includes('(lần)') || record.metric.includes('FAT') || record.metric.includes('ICR');
                                const isDays = record.metric.includes('DSI') || record.metric.includes('DSO') || record.metric.includes('CCC');

                                let formatted;
                                if (isPercent || isTurnover || isDays || Math.abs(numValue) < 1000) {
                                    formatted = numValue.toFixed(2);
                                } else {
                                    formatted = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(numValue);
                                }

                                const colorClass = numValue < 0 ? 'text-[#ff4d4f]' : 'text-[#e0e0e0]'; // Red for negative

                                return <span className={`font-mono ${colorClass}`}>{formatted}{isPercent ? '%' : ''}</span>;
                            }
                            return <span className="text-[#444]">-</span>;
                        }
                    });
                });

                setColumns(newCols);
                setDataSource(finalMetrics);
            } else {
                setDataSource([]);
                setColumns([]);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Helper to determine row style based on VAS hierarchy
    const getRowClassName = (record: any) => {
        if (record.isHeader) return 'bg-[#111] font-bold hover:bg-[#111]';
        const m = record.metric || '';
        // Group: A. B. C. (Major sections)
        if (/^[A-Z]\.\s/.test(m)) return 'bg-[#050505] font-bold text-[#ddd]';
        // Subgroup: I. II. III. IV. V. (Roman numerals)
        if (/^(IX|IV|V?I{0,3})\.\s/.test(m)) return 'bg-[#000] font-semibold text-[#ccc] pl-4';
        return 'bg-[#000] hover:bg-[#1a1a1a] transition-colors';
    };

    if (!symbol) return <Empty description="SELECT SYMBOL" image={Empty.PRESENTED_IMAGE_SIMPLE} className="text-[#666]" />;

    const getTitle = () => {
        if (type === 'ratio') return "KEY RATIOS";
        switch (subType) {
            case 'income_statement': return "INCOME STATEMENT";
            case 'balance_sheet': return "BALANCE SHEET";
            case 'cash_flow': return "CASH FLOW";
            default: return "FINANCIALS";
        }
    };

    return (
        <Card
            className="ant-card"
            title={<span className="text-[#e0e0e0] font-bold tracking-tight uppercase font-mono pl-2">{getTitle()}</span>}
            extra={
                <Radio.Group value={period} onChange={e => setPeriod(e.target.value)} buttonStyle="solid" size="small" className="font-mono">
                    <Radio.Button value="year">YEAR</Radio.Button>
                    <Radio.Button value="quarter">QTR</Radio.Button>
                </Radio.Group>
            }
        >
            <Table
                dataSource={dataSource}
                columns={columns}
                scroll={{ x: 'max-content', y: 700 }}
                loading={loading}
                pagination={{ pageSize: 200, size: 'small', hideOnSinglePage: true }}
                rowKey="metric"
                className="trading-table border-t border-[#333]"
                size="small"
                rowClassName={getRowClassName}
                bordered
            />
        </Card>
    );
};

export default FinancialTable;

