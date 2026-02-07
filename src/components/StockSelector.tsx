import React, { useEffect, useState } from 'react';
import { Select, Spin, Empty, Tooltip } from 'antd';
import { supabase } from '../supabaseClient';
import { StockSymbol } from '../types';
import { TrendingUp } from 'lucide-react';

interface Props {
    onSelect: (symbol: string) => void;
}

const POPULAR_STOCKS = [
    { symbol: 'HPG', name: 'Hoa Phat Group' },
    { symbol: 'GAS', name: 'PV GAS' },
    { symbol: 'FPT', name: 'FPT Corporation' },
    { symbol: 'VCB', name: 'Vietcombank' },
    { symbol: 'VIC', name: 'Vingroup' },
];

// Nguồn 1: DNSE (Thường ổn định nhất)
const getLogoUrl = (symbol: string) => `https://cdn.dnse.com.vn/backend/stock-logo/${symbol.toUpperCase()}.jpg`;

const StockSelector: React.FC<Props> = ({ onSelect }) => {
    const [loading, setLoading] = useState(false);
    const [options, setOptions] = useState<StockSymbol[]>([]);
    const [searchText, setSearchText] = useState('');
    const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

    const fetchSymbols = async (query: string) => {
        setLoading(true);
        try {
            let request = supabase
                .from('stock_symbols')
                .select('*');

            if (query) {
                request = request.or(`symbol.ilike.%${query}%,company_name.ilike.%${query}%`)
                    .order('symbol', { ascending: true })
                    .limit(100); // Tăng giới hạn lên 100 để không bỏ lỡ mã
            } else {
                request = request.limit(20)
                    .order('symbol', { ascending: true });
            }

            const { data, error } = await request;

            if (data) {
                // Sắp xếp ưu tiên mã khớp chính xác lên đầu
                if (query) {
                    const sortedData = [...data].sort((a, b) => {
                        const aFullMatch = a.symbol.toLowerCase() === query.toLowerCase();
                        const bFullMatch = b.symbol.toLowerCase() === query.toLowerCase();
                        if (aFullMatch && !bFullMatch) return -1;
                        if (!aFullMatch && bFullMatch) return 1;
                        return a.symbol.localeCompare(b.symbol);
                    });
                    setOptions(sortedData);
                } else {
                    setOptions(data);
                }
            }
        } catch (error) {
            console.error('Error fetching symbols:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSymbols('');
    }, []);

    const handleSearch = (value: string) => {
        setSearchText(value);
        if (value.length > 0) {
            fetchSymbols(value);
        }
    };

    const handleSelect = (value: string | undefined) => {
        if (value) {
            setSelectedSymbol(value);
            onSelect(value);
        } else {
            setSelectedSymbol(null);
        }
    };

    const handlePopClick = (symbol: string) => {
        setSelectedSymbol(symbol);
        onSelect(symbol);
    };

    return (
        <div className="w-full space-y-4">
            <div className="relative group">
                <Select
                    showSearch
                    allowClear
                    style={{ width: '100%' }}
                    placeholder="🔍 TÌM KIẾM MÃ (VD: HPG, VIC...)"
                    defaultActiveFirstOption={false}
                    filterOption={false}
                    onSearch={handleSearch}
                    onChange={handleSelect}
                    loading={loading}
                    notFoundContent={loading ? <Spin size="small" /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="NO DATA" />}
                    className="stock-terminal-select"
                    size="large"
                    value={selectedSymbol}
                    dropdownClassName="stock-terminal-dropdown"
                    optionLabelProp="label"
                >
                    {options.map(d => (
                        <Select.Option key={d.symbol} value={d.symbol} label={d.symbol}>
                            <div className="flex items-center space-x-3 py-1">
                                <div className="flex flex-col">
                                    <span className="font-bold text-base text-[#e0e0e0] font-mono">{d.symbol}</span>
                                    <span className="text-xs text-gray-500 truncate max-w-[300px] uppercase font-mono">{d.company_name}</span>
                                </div>
                            </div>
                        </Select.Option>
                    ))}
                </Select>
            </div>

            {/* Popular Stocks Section */}
            <div>
                <div className="flex items-center space-x-2 mb-3 text-neon-blue/80">
                    <TrendingUp size={16} />
                    <span className="text-xs font-semibold uppercase tracking-wider font-mono text-[#666]">QUICK ACCESS</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {POPULAR_STOCKS.map((stock) => (
                        <Tooltip title={stock.name} key={stock.symbol}>
                            <button
                                onClick={() => handlePopClick(stock.symbol)}
                                className={`
                                    flex items-center justify-center p-2 rounded-sm transition-all duration-200
                                    border border-[#333] bg-black hover:bg-[#1a1a1a] hover:border-[#666]
                                    group h-10
                                    ${selectedSymbol === stock.symbol ? 'bg-[#ff9800] border-[#ff9800] text-black' : ''}
                                `}
                            >
                                <span className={`text-sm font-bold font-mono ${selectedSymbol === stock.symbol ? 'text-black' : 'text-[#a0a0a0] group-hover:text-white'}`}>
                                    {stock.symbol}
                                </span>
                            </button>
                        </Tooltip>
                    ))}
                </div>
            </div>

            <style>{`
                /* --- TERMINAL CONTAINER --- */
                .stock-terminal-select .ant-select-selector {
                    background-color: #000000 !important;
                    border: 1px solid #333333 !important;
                    border-radius: 2px !important;
                    color: #e0e0e0 !important;
                    display: flex;
                    align-items: center;
                    padding-left: 12px !important;
                    padding-right: 12px !important;
                    height: 48px !important;
                    box-shadow: none !important;
                    transition: border-color 0.1s ease !important;
                }

                /* Focus State */
                .stock-terminal-select.ant-select-focused .ant-select-selector {
                    border-color: #ff9800 !important;
                    box-shadow: 0 0 0 1px #ff9800 !important;
                }

                /* --- SEARCH INPUT --- */
                .stock-terminal-select .ant-select-selection-search {
                    left: 12px !important;
                    right: 12px !important;
                }

                .stock-terminal-select .ant-select-selection-search-input {
                    height: 100% !important;
                    color: #ff9800 !important;
                    font-size: 16px !important;
                    font-family: 'Roboto Mono', 'Consolas', monospace !important;
                    font-weight: 500;
                    text-transform: uppercase;
                }

                /* --- PLACEHOLDER --- */
                .stock-terminal-select .ant-select-selection-placeholder {
                    line-height: 46px !important;
                    color: #666666 !important;
                    font-family: 'Roboto Mono', monospace;
                    font-size: 14px;
                    text-transform: uppercase;
                }

                /* --- SELECTED ITEM --- */
                .stock-terminal-select .ant-select-selection-item {
                    line-height: 46px !important;
                    color: #e0e0e0 !important;
                    font-family: 'Roboto Mono', monospace !important;
                    font-weight: 700;
                    font-size: 16px;
                }

                /* --- DROPDOWN --- */
                .stock-terminal-dropdown {
                    background-color: #000000 !important;
                    border: 1px solid #333333 !important;
                    border-radius: 0px !important;
                    padding: 0 !important;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.8) !important;
                }
                
                .stock-terminal-dropdown .ant-select-item {
                    border-radius: 0px !important;
                    margin-bottom: 0px;
                    color: #b0b0b0 !important;
                    padding: 8px 12px !important;
                    border-bottom: 1px solid #1a1a1a;
                }

                .stock-terminal-dropdown .ant-select-item-option-active {
                    background-color: #1a1a1a !important;
                }

                .stock-terminal-dropdown .ant-select-item-option-selected {
                    background-color: #ff9800 !important;
                    color: #000 !important;
                }

                .ant-select-arrow {
                    color: #666666 !important;
                    right: 12px !important;
                }
                
                .ant-select-clear {
                    background: transparent !important;
                    color: #666 !important;
                    right: 32px !important;
                }
            `}</style>
        </div>
    );
};

export default StockSelector;
