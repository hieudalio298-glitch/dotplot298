import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from 'antd';
import { Search, GripVertical } from 'lucide-react';
import { AVAILABLE_METRICS } from '../types';

interface DraggableItemProps {
    id: string;
    label: string;
}

const DraggableItem: React.FC<DraggableItemProps> = ({ id, label }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: id,
        data: { label }
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 999,
    } : {};

    return (
        <motion.div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            whileHover={{ x: 2 }}
            className={`flex items-center space-x-2 p-2 mb-1 bg-[#111] border border-[#333] cursor-grab active:cursor-grabbing hover:border-[#ff9800] group transition-all rounded-none ${transform ? 'shadow-[0_0_15px_rgba(255,152,0,0.5)] border-[#ff9800] bg-black' : ''}`}
        >
            <GripVertical size={10} className="text-[#444] group-hover:text-[#ff9800] transition-colors" />
            <span className="text-[11px] font-mono text-[#aaa] group-hover:text-[#fff] truncate uppercase tracking-tight">
                {label.length > 30 ? label.substring(0, 28) + '...' : label}
            </span>
        </motion.div>
    );
};

const MetricsSidebar: React.FC = () => {
    const [search, setSearch] = useState('');

    const filteredMetrics = AVAILABLE_METRICS.filter(m =>
        m.toLowerCase().includes(search.toLowerCase())
    );

    const ratios = filteredMetrics.filter(m => ['P/E', 'P/B', 'ROE', 'ROA', 'EPS', 'Biên', 'ROIC', 'Thanh toán', 'Nợ', 'Vòng quay', 'Chu kỳ', 'Tăng trưởng', 'CCC', 'DSI', 'DSO', 'FAT'].some(key => m.includes(key)));
    const statements = filteredMetrics.filter(m => !ratios.includes(m));

    return (
        <div className="flex flex-col h-full gap-3 bg-black p-2 border-r border-[#333]">
            <Input
                placeholder="SEARCH METRICS..."
                prefix={<Search size={12} className="text-[#ff9800]" />}
                className="bg-[#0a0a0a] border-[#333] text-[#e0e0e0] hover:border-[#ff9800] focus:border-[#ff9800] rounded-none font-mono text-xs h-8 placeholder:text-[#444] uppercase"
                value={search}
                onChange={e => setSearch(e.target.value)}
                allowClear
            />

            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-4">
                <AnimatePresence>
                    {ratios.length > 0 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div className="text-[10px] font-bold text-[#666] uppercase tracking-widest mb-2 px-1 flex items-center gap-2 font-mono">
                                <div className="w-1 h-3 bg-[#ff9800]" />
                                KEY RATIOS
                            </div>
                            {ratios.map(m => (
                                <DraggableItem key={m} id={m} label={m} />
                            ))}
                        </motion.div>
                    )}

                    {statements.length > 0 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div className="text-[10px] font-bold text-[#666] uppercase tracking-widest mb-2 px-1 flex items-center gap-2 font-mono">
                                <div className="w-1 h-3 bg-[#1677ff]" />
                                FINANCIALS
                            </div>
                            {statements.map(m => (
                                <DraggableItem key={m} id={m} label={m} />
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {filteredMetrics.length === 0 && (
                    <div className="text-center py-10 text-[#444] text-[10px] font-mono uppercase">
                        NO RESULTS FOUND
                    </div>
                )}
            </div>
        </div>
    );
};

export default MetricsSidebar;
