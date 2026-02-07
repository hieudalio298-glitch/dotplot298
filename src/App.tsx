import React, { useState, useEffect } from 'react';
import { Layout, Tabs, ConfigProvider, theme, Space, Button, Divider, Tooltip, Modal, Input, Form, message, Dropdown, Avatar, App as AntdApp } from 'antd';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { LayoutGrid, BarChart3, ListOrdered, Wallet, TrendingUp, Search, RefreshCw, User, LogOut, Mail, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GripVertical } from 'lucide-react';
import { supabase } from './supabaseClient';
import type { User as SupabaseUser } from '@supabase/supabase-js';

import StockSelector from './components/StockSelector';
import VASIncomeStatement from './components/VASIncomeStatement';
import VASBalanceSheet from './components/VASBalanceSheet';
import VASCashFlow from './components/VASCashFlow';
import FinancialChart from './components/FinancialChart';
import MetricsSidebar from './components/MetricsSidebar';
import FinancialTable from './components/FinancialTable';
import { AVAILABLE_METRICS } from './types';
import logo from './assets/logo.png';
import 'antd/dist/reset.css';

const { Header, Content, Sider } = Layout;

const App: React.FC = () => {
    const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [isUpdating, setIsUpdating] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
    const [loading, setLoading] = useState(false);
    const [activeMetric, setActiveMetric] = useState<string | null>(null);

    useEffect(() => {
        // Check current session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleAuth = async (values: any) => {
        setLoading(true);
        try {
            if (authMode === 'login') {
                const { error } = await supabase.auth.signInWithPassword({
                    email: values.email,
                    password: values.password,
                });
                if (error) throw error;
                message.success('Logged in successfully');
            } else {
                const { error } = await supabase.auth.signUp({
                    email: values.email,
                    password: values.password,
                });
                if (error) throw error;
                message.success('Sign up successful! Please check your email for verification.');
            }
            setShowAuthModal(false);
        } catch (error: any) {
            message.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        message.success('Logged out');
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveMetric(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveMetric(null);
        const { active, over } = event;
        if (!over) return;

        const metric = active.id as string;

        // Phát sự kiện cho các component con xử lý local state
        const dropEvent = new CustomEvent('financialMetricDropped', {
            detail: { metric, overId: over.id }
        });
        document.dispatchEvent(dropEvent);
    };

    const resetMetrics = () => {
        // Gửi sự kiện reset cho các component con nếu cần
        const resetEvent = new CustomEvent('resetFinancialMetrics');
        document.dispatchEvent(resetEvent);
    };

    const handleUpdate = async () => {
        if (!selectedSymbol) return;
        setIsUpdating(true);
        message.loading({ content: `Updating data for ${selectedSymbol}... (Please wait 10-30s)`, key: 'updateData' });

        try {
            // Call local python server
            const response = await fetch(`http://localhost:8000/update/${selectedSymbol}`, {
                method: 'POST',
            });

            if (!response.ok) {
                throw new Error('Failed to update data via local server');
            }

            const result = await response.json();
            message.success({ content: `Updated ${selectedSymbol} successfully!`, key: 'updateData' });

            // Trigger UI refresh
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error(error);
            // Fallback: Just refresh UI if server is not running or blocked, hoping database was updated manually
            setRefreshTrigger(prev => prev + 1);
            message.warning({
                content: 'Could not connect to update server. Refreshing view only. (Ensure api_server.py is running for full update)',
                key: 'updateData',
                duration: 5
            });
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <ConfigProvider
            theme={{
                algorithm: theme.darkAlgorithm,
                token: {
                    colorPrimary: '#ff9800', /* Bloomberg Orange */
                    colorBgBase: '#000000',
                    colorBgContainer: '#0a0a0a',
                    borderRadius: 0, /* SHARP CORNERS */
                    fontFamily: "'Inter', sans-serif",
                },
                components: {
                    Tabs: {
                        itemSelectedColor: '#ff9800',
                        inkBarColor: '#ff9800',
                        titleFontSize: 12,
                    },
                    Layout: {
                        headerBg: '#000000',
                        bodyBg: '#000000',
                        siderBg: '#000000',
                    }
                }
            }}
        >
            <AntdApp>
                <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <Layout className="min-h-screen bg-black text-[#e0e0e0] selection:bg-[#ff9800] selection:text-black">
                        <Header className="h-12 px-4 bg-black border-b border-[#333] flex items-center justify-between sticky top-0 z-50">
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-[#ff9800] flex items-center justify-center font-bold text-black text-xs font-mono border border-[#cc7a00]">
                                    DOT
                                </div>
                                <span className="text-lg font-bold tracking-tight uppercase text-[#e0e0e0] font-mono">
                                    TERMINAL <span className="text-[#ff9800] text-xs align-top">PRO</span>
                                </span>
                            </div>
                            <div className="flex items-center space-x-6 text-[#666]">
                                <div className="flex items-center space-x-2 text-xs font-mono uppercase border border-[#333] px-2 py-1">
                                    <span className="w-1.5 h-1.5 bg-[#00ff00] animate-pulse" />
                                    <span className="tracking-wider text-[#00ff00]">Market Live</span>
                                </div>

                                {user ? (
                                    <Dropdown
                                        menu={{
                                            items: [
                                                { key: 'email', label: <span className="text-[10px] text-[#666]">{user.email}</span>, disabled: true },
                                                { type: 'divider' },
                                                { key: 'logout', label: 'Logout', icon: <LogOut size={14} />, onClick: handleLogout },
                                            ]
                                        }}
                                        placement="bottomRight"
                                        trigger={['click']}
                                    >
                                        <div className="flex items-center space-x-2 cursor-pointer group hover:text-[#ff9800] transition-colors">
                                            <div className="w-7 h-7 bg-[#111] border border-[#333] flex items-center justify-center group-hover:border-[#ff9800]">
                                                <User size={14} />
                                            </div>
                                        </div>
                                    </Dropdown>
                                ) : (
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<User size={14} />}
                                        className="text-[#666] hover:text-[#ff9800] font-mono text-[11px] uppercase tracking-wider"
                                        onClick={() => setShowAuthModal(true)}
                                    >
                                        Login
                                    </Button>
                                )}
                            </div>
                        </Header>

                        <Layout>
                            <Layout className="bg-black">
                                <Content className="p-4">
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="max-w-[1600px] mx-auto space-y-4"
                                    >
                                        {/* Control Bar */}
                                        <div className="border border-[#333] bg-black p-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex-1 max-w-lg flex items-center gap-2">
                                                <div className="flex-1">
                                                    <StockSelector onSelect={setSelectedSymbol} />
                                                </div>
                                                {selectedSymbol && (
                                                    <Tooltip title="Force Update Data">
                                                        <Button
                                                            icon={<RefreshCw size={14} className={isUpdating ? 'animate-spin' : ''} />}
                                                            onClick={handleUpdate}
                                                            disabled={isUpdating}
                                                            className="bg-transparent border-[#e91e63] text-[#e91e63] hover:bg-[#e91e63]/10 h-10 px-4 rounded-sm uppercase font-mono font-bold disabled:opacity-50"
                                                        >
                                                            {isUpdating ? 'UPDATING...' : 'UPDATE'}
                                                        </Button>
                                                    </Tooltip>
                                                )}
                                            </div>
                                            <div className="flex items-center space-x-4 text-xs font-mono text-[#666] uppercase">
                                                {selectedSymbol ? (
                                                    <>
                                                        <span className="text-[#ff9800] font-bold">SELECTED:</span>
                                                        <span className="text-white border-b border-[#ff9800]">{selectedSymbol}</span>
                                                    </>
                                                ) : (
                                                    "AWAITING INPUT..."
                                                )}
                                            </div>
                                        </div>

                                        {selectedSymbol ? (
                                            <AnimatePresence mode="wait">
                                                <motion.div
                                                    key={selectedSymbol}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <Tabs
                                                        defaultActiveKey="income"
                                                        className="trading-tabs font-mono"
                                                        items={[
                                                            {
                                                                label: 'CHART ANALYSIS',
                                                                key: 'chart',
                                                                children: (
                                                                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                                                                        <div className="lg:col-span-1">
                                                                            <div className="border border-[#333] bg-black h-[calc(100vh-200px)] overflow-y-auto sticky top-20">
                                                                                <div className="p-2 border-b border-[#333] flex items-center justify-between bg-[#0a0a0a]">
                                                                                    <span className="text-[10px] font-bold text-[#ff9800] uppercase">Data Metrics</span>
                                                                                    <Tooltip title="RESET VIEW">
                                                                                        <RefreshCw
                                                                                            size={12}
                                                                                            className="cursor-pointer text-[#666] hover:text-[#ff9800]"
                                                                                            onClick={resetMetrics}
                                                                                        />
                                                                                    </Tooltip>
                                                                                </div>
                                                                                <div className="p-2">
                                                                                    <MetricsSidebar />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="lg:col-span-4 border border-[#333] bg-black">
                                                                            <FinancialChart
                                                                                symbol={selectedSymbol}
                                                                                user={user}
                                                                                refreshTrigger={refreshTrigger}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )
                                                            },
                                                            {
                                                                label: 'FINANCIAL STATEMENTS',
                                                                key: 'statement',
                                                                children: (
                                                                    <Tabs
                                                                        type="card"
                                                                        className="sub-tabs"
                                                                        items={[
                                                                            {
                                                                                label: 'INCOME STATEMENT (VAS)',
                                                                                key: 'income',
                                                                                children: <VASIncomeStatement symbol={selectedSymbol} />
                                                                            },
                                                                            {
                                                                                label: 'BALANCE SHEET (VAS)',
                                                                                key: 'balance',
                                                                                children: <VASBalanceSheet symbol={selectedSymbol} />
                                                                            },
                                                                            {
                                                                                label: 'CASH FLOW (VAS)',
                                                                                key: 'cashflow',
                                                                                children: <VASCashFlow symbol={selectedSymbol} />
                                                                            }
                                                                        ]}
                                                                    />
                                                                )
                                                            },
                                                            {
                                                                label: 'KEY RATIOS',
                                                                key: 'ratio',
                                                                children: <FinancialTable symbol={selectedSymbol} type="ratio" />
                                                            }
                                                        ]}
                                                    />
                                                </motion.div>
                                            </AnimatePresence>
                                        ) : (
                                            <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                                                <div className="w-16 h-16 border border-[#333] flex items-center justify-center rounded-sm">
                                                    <Search size={32} className="text-[#666]" />
                                                </div>
                                                <p className="text-sm font-mono text-[#666] uppercase">Initialize Terminal: Select Ticker</p>
                                            </div>
                                        )}
                                    </motion.div>
                                </Content>
                            </Layout>
                        </Layout>
                    </Layout>
                    <DragOverlay dropAnimation={null}>
                        {activeMetric ? (
                            <div className="flex items-center space-x-2 p-2 bg-black border-2 border-[#ff9800] shadow-[0_0_20px_rgba(255,152,0,0.3)] opacity-90 cursor-grabbing pointer-events-none scale-105 transition-transform">
                                <GripVertical size={12} className="text-[#ff9800]" />
                                <span className="text-[12px] font-mono text-white uppercase tracking-wider font-bold">
                                    {activeMetric}
                                </span>
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>

                {/* Premium Auth Modal */}
                <Modal
                    open={showAuthModal}
                    onCancel={() => setShowAuthModal(false)}
                    footer={null}
                    width={360}
                    centered
                    closable={false}
                    className="premium-auth-modal"
                    styles={{
                        mask: { backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.8)' },
                        content: { backgroundColor: '#000', border: '1px solid #333', padding: 0, borderRadius: 0 }
                    }}
                >
                    <div className="p-8">
                        <div className="text-center mb-8">
                            <div className="w-12 h-12 bg-[#ff9800] mx-auto flex items-center justify-center font-bold text-black text-lg mb-4">
                                DOT
                            </div>
                            <h2 className="text-xl font-bold tracking-tight text-white uppercase font-mono">
                                {authMode === 'login' ? 'Terminal Login' : 'Create Account'}
                            </h2>
                            <p className="text-[#666] text-[10px] uppercase tracking-widest mt-2">
                                Secure Access to Stock Signals
                            </p>
                        </div>

                        <Form layout="vertical" onFinish={handleAuth} requiredMark={false}>
                            <Form.Item
                                name="email"
                                rules={[{ required: true, message: 'Please input your email!' }, { type: 'email' }]}
                            >
                                <Input
                                    prefix={<Mail size={14} className="text-[#444]" />}
                                    placeholder="EMAIL ADDRESS"
                                    className="bg-[#0a0a0a] border-[#333] hover:border-[#ff9800] focus:border-[#ff9800] text-white font-mono text-xs h-10 rounded-none"
                                />
                            </Form.Item>

                            <Form.Item
                                name="password"
                                rules={[{ required: true, message: 'Please input your password!' }, { min: 6 }]}
                            >
                                <Input.Password
                                    prefix={<Lock size={14} className="text-[#444]" />}
                                    placeholder="PASSWORD"
                                    className="bg-[#0a0a0a] border-[#333] hover:border-[#ff9800] focus:border-[#ff9800] text-white font-mono text-xs h-10 rounded-none"
                                />
                            </Form.Item>

                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={loading}
                                block
                                className="bg-[#ff9800] border-[#ff9800] hover:bg-[#ff8000] text-black font-bold h-10 rounded-none uppercase tracking-widest text-xs mt-2"
                            >
                                {authMode === 'login' ? 'AUTHORIZE' : 'REGISTER'}
                            </Button>
                        </Form>

                        <div className="text-center mt-6">
                            <Button
                                type="link"
                                onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                                className="text-[#666] hover:text-[#ff9800] text-[10px] uppercase tracking-widest"
                            >
                                {authMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Login"}
                            </Button>
                        </div>
                    </div>
                </Modal>
            </AntdApp>
        </ConfigProvider>
    );
};

export default App;
