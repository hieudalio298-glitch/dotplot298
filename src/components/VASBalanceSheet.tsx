import React, { useEffect, useState, useMemo } from 'react';
import { Table, Radio, Card, Empty, Spin, Checkbox, Space, Divider, Tooltip, Button, Dropdown, Input, Modal } from 'antd';
import { Activity, BarChart3, TrendingUp, Info, ChevronRight, ChevronDown, RefreshCw, LineChart, BarChart, Layers, Trash2, Settings2, Maximize2, Minimize2 } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { useDroppable } from '@dnd-kit/core';
import { supabase } from '../supabaseClient';

// --- CHUẨN VAS (Thông tư 200/2014/TT-BTC) - BẢNG CÂN ĐỐI KẾ TOÁN (SIÊU CHI TIẾT) ---
export const VAS_BALANCE_STRUCTURE: any[] = [
    {
        code: '100', name: 'A. TÀI SẢN NGẮN HẠN', isBold: true,
        keys: ['CURRENT ASSETS', '100. TÀI SẢN NGẮN HẠN', 'TÀI SẢN NGẮN HẠN', 'A- TÀI SẢN NGẮN HẠN'],
        children: [
            {
                code: '110', name: 'I. Tiền và các khoản tương đương tiền', isBold: true,
                keys: ['Cash and cash equivalents', '110. Tiền và các khoản tương đương tiền', 'Tiền và các khoản tương đương tiền', 'Tiền và tương đương tiền'],
                children: [
                    { code: '111', name: '1. Tiền', keys: ['Tiền', '111. Tiền'] },
                    { code: '112', name: '2. Các khoản tương đương tiền', keys: ['Các khoản tương đương tiền', '112. Các khoản tương đương tiền'] }
                ]
            },
            {
                code: '120', name: 'II. Đầu tư tài chính ngắn hạn', isBold: true,
                keys: ['Short-term investments', '120. Đầu tư tài chính ngắn hạn', 'Đầu tư tài chính ngắn hạn'],
                children: [
                    { code: '121', name: '1. Chứng khoán kinh doanh', keys: ['Chứng khoán kinh doanh', '121. Chứng khoán kinh doanh'] },
                    { code: '123', name: '3. Đầu tư nắm giữ đến ngày đáo hạn', keys: ['Đầu tư nắm giữ đến ngày đáo hạn', '123. Đầu tư nắm giữ đến ngày đáo hạn'] }
                ]
            },
            {
                code: '130', name: 'III. Các khoản phải thu ngắn hạn', isBold: true,
                keys: ['Accounts receivable', 'Short-term receivables', '130. Các khoản phải thu ngắn hạn', 'Các khoản phải thu ngắn hạn'],
                children: [
                    { code: '131', name: '1. Phải thu ngắn hạn của khách hàng', keys: ['Phải thu ngắn hạn của khách hàng', '131. Phải thu ngắn hạn của khách hàng'] },
                    { code: '135', name: '5. Phải thu về cho vay ngắn hạn', keys: ['Phải thu về cho vay ngắn hạn', '135. Phải thu về cho vay ngắn hạn'] },
                    { code: '136', name: '6. Phải thu ngắn hạn khác', keys: ['Phải thu ngắn hạn khác', '136. Phải thu ngắn hạn khác'] }
                ]
            },
            {
                code: '140', name: 'IV. Hàng tồn kho', isBold: true,
                keys: ['Inventories', '140. Hàng tồn kho', 'Hàng tồn kho', 'Hàng tồn kho, ròng'],
                children: [
                    { code: '141', name: '1. Hàng tồn kho', keys: ['Hàng tồn kho', '141. Hàng tồn kho'] }
                ]
            }
        ]
    },
    {
        code: '200', name: 'B. TÀI SẢN DÀI HẠN', isBold: true,
        keys: ['LONG-TERM ASSETS', '200. TÀI SẢN DÀI HẠN', 'TÀI SẢN DÀI HẠN', 'B- TÀI SẢN DÀI HẠN'],
        children: [
            {
                code: '220', name: 'II. Tài sản cố định', isBold: true,
                keys: ['Fixed assets', '220. Tài sản cố định', 'Tài sản cố định'],
                children: [
                    { code: '221', name: '1. Tài sản cố định hữu hình', keys: ['Tài sản cố định hữu hình', '221. Tài sản cố định hữu hình'] },
                    { code: '227', name: '3. Tài sản cố định vô hình', keys: ['Tài sản cố định vô hình', '227. Tài sản cố định vô hình'] }
                ]
            },
            { code: '230', name: 'III. Bất động sản đầu tư', isBold: true, keys: ['Investment properties', '230. Bất động sản đầu tư', 'Bất động sản đầu tư'] },
            { code: '250', name: 'V. Đầu tư tài chính dài hạn', isBold: true, keys: ['Long-term investments', '250. Đầu tư tài chính dài hạn', 'Đầu tư tài chính dài hạn'] }
        ]
    },
    { code: '270', name: 'TỔNG CỘNG TÀI SẢN', isBold: true, keys: ['Total Assets', '270. TỔNG CỘNG TÀI SẢN', 'TỔNG CỘNG TÀI SẢN', 'TỔNG TÀI SẢN'] },
    {
        code: '300', name: 'A. NỢ PHẢI TRẢ', isBold: true,
        keys: ['Liabilities', '300. NỢ PHẢI TRẢ', 'NỢ PHẢI TRẢ', 'C- NỢ PHẢI TRẢ'],
        children: [
            { code: '310', name: 'I. Nợ ngắn hạn', isBold: true, keys: ['Current liabilities', '310. Nợ ngắn hạn', 'Nợ ngắn hạn'] },
            { code: '330', name: 'II. Nợ dài hạn', isBold: true, keys: ['Long-term liabilities', 'Non-current liabilities', '330. Nợ dài hạn', 'Nợ dài hạn'] }
        ]
    },
    {
        code: '400', name: 'B. VỐN CHỦ SỞ HỮU', isBold: true,
        keys: ['Owner\'s Equity', '400. VỐN CHỦ SỞ HỮU', 'VỐN CHỦ SỞ HỮU', 'D- VỐN CHỦ SỞ HỮU'],
        children: [
            {
                code: '410', name: 'I. Vốn chủ sở hữu', isBold: true,
                keys: ['Capital and reserves', '410. Vốn chủ sở hữu', 'Vốn chủ sở hữu', 'Vốn và các quỹ'],
                children: [
                    { code: '411', name: '1. Vốn góp của chủ sở hữu', keys: ['Vốn đầu tư của chủ sở hữu', 'Vốn góp của chủ sở hữu', 'Vốn cổ phần'] },
                    { code: '421', name: '11. Lợi nhuận sau thuế chưa phân phối', keys: ['Lợi nhuận sau thuế chưa phân phối', 'Lợi nhuận chưa phân phối'] }
                ]
            }
        ]
    },
    { code: '440', name: 'TỔNG CỘNG NGUỒN VỐN', isBold: true, keys: ['440. TỔNG CỘNG NGUỒN VỐN', 'TỔNG CỘNG NGUỒN VỐN', 'Tổng cộng nguồn vốn'] },
];

export const BANK_BALANCE_STRUCTURE: any[] = [
    {
        code: 'A', name: 'A. TÀI SẢN', isBold: true,
        keys: ['A. TÀI SẢN', 'TÀI SẢN'],
        children: [
            { code: 'I', name: 'I. Tiền mặt, vàng bạc, đá quý', keys: ['I. Tiền mặt, vàng bạc, đá quý', 'Tiền mặt, vàng, bạc', '1. Tiền mặt, vàng, bạc'] },
            { code: 'II', name: 'II. Tiền gửi tại NHNN', keys: ['II. Tiền gửi tại NHNN', 'Tiền gửi tại Ngân hàng Nhà nước', '2. Tiền gửi tại Ngân hàng Nhà nước'] },
            {
                code: 'III', name: 'III. Tiền, vàng gửi tại các TCTD khác và cho vay các TCTD khác', isBold: true,
                keys: ['III. Tiền, vàng gửi tại các TCTD khác và cho vay các TCTD khác', '3. Tiền, vàng gửi tại các tổ chức tín dụng (TCTD) khác và cho vay các TCTD khác'],
                children: [
                    { code: '1', name: '1. Tiền, vàng gửi tại các TCTD khác', keys: ['1. Tiền, vàng gửi tại các TCTD khác'] },
                    { code: '2', name: '2. Cho vay các TCTD khác', keys: ['2. Cho vay các TCTD khác'] },
                    { code: '3', name: '3. Dự phòng rủi ro cho vay các TCTD khác', keys: ['3. Dự phòng rủi ro cho vay các TCTD khác'] }
                ]
            },
            {
                code: 'IV', name: 'IV. Chứng khoán kinh doanh', isBold: true,
                keys: ['IV. Chứng khoán kinh doanh', '4. Chứng khoán kinh doanh'],
                children: [
                    { code: '1', name: '1. Chứng khoán kinh doanh', keys: ['1. Chứng khoán kinh doanh'] },
                    { code: '2', name: '2. Dự phòng giảm giá chứng khoán kinh doanh', keys: ['2. Dự phòng giảm giá chứng khoán kinh doanh'] }
                ]
            },
            { code: 'V', name: 'V. Các công cụ tài chính phái sinh và các tài sản tài chính khác', keys: ['V. Các công cụ tài chính phái sinh và các tài sản tài chính khác'] },
            {
                code: 'VI', name: 'VI. Cho vay khách hàng', isBold: true,
                keys: ['VI. Cho vay khách hàng', '6. Cho vay khách hàng'],
                children: [
                    { code: '1', name: '1. Cho vay và cho thuê tài chính khách hàng', keys: ['1. Cho vay và cho thuê tài chính khách hàng'] },
                    { code: '2', name: '2. Dự phòng rủi ro cho vay và cho thuê tài chính khách hàng', keys: ['2. Dự phòng rủi rủi ro cho vay và cho thuê tài chính khách hàng', '2. Dự phòng rủi ro cho vay và cho thuê tài chính khách hàng'] }
                ]
            },
            {
                code: 'VII', name: 'VII. Hoạt động mua nợ', isBold: true,
                keys: ['VII. Hoạt động mua nợ'],
                children: [
                    { code: '1', name: '1. Mua nợ', keys: ['1. Mua nợ'] },
                    { code: '2', name: '2. Dự phòng rủi ro hoạt động mua nợ', keys: ['2. Dự phòng rủi ro hoạt động mua nợ'] }
                ]
            },
            {
                code: 'VIII', name: 'VIII. Chứng khoán đầu tư', isBold: true,
                keys: ['VIII. Chứng khoán đầu tư', '8. Chứng khoán đầu tư', 'VII. Chứng khoán đầu tư'],
                children: [
                    { code: '1', name: '1. Chứng khoán đầu tư sẵn sàng để bán', keys: ['1. Chứng khoán đầu tư sẵn sàng để bán'] },
                    { code: '2', name: '2. Chứng khoán đầu tư giữ đến ngày đáo hạn', keys: ['2. Chứng khoán đầu tư giữ đến ngày đáo hạn'] },
                    { code: '3', name: '3. Dự phòng ggiảm giá chứng khoán đầu tư', keys: ['3. Dự phòng ggiảm giá chứng khoán đầu tư'] }
                ]
            },
            {
                code: 'IX', name: 'IX. Góp vốn, đầu tư dài hạn', isBold: true,
                keys: ['IX. Góp vốn, đầu tư dài hạn', '9. Góp vốn, đầu tư dài hạn', 'VIII. Góp vốn, đầu tư dài hạn'],
                children: [
                    { code: '1', name: '1. Đầu tư vào công ty con', keys: ['1. Đầu tư vào công ty con'] },
                    { code: '2', name: '2. Đầu tư vào công ty liên doanh, liên kết', keys: ['2. Đầu tư vào công ty liên doanh, liên kết'] },
                    { code: '3', name: '3. Đầu tư dài hạn khác', keys: ['3. Đầu tư dài hạn khác'] },
                    { code: '4', name: '4. Dự phòng giảm giá đầu tư dài hạn', keys: ['4. Dự phòng giảm giá đầu tư dài hạn'] }
                ]
            },
            {
                code: 'X', name: 'X. Tài sản cố định', isBold: true,
                keys: ['Fixed assets', '10. Tài sản cố định', 'IX. Tài sản cố định'],
                children: [
                    {
                        code: '1', name: '1. Tài sản cố định hữu hình', keys: ['1. Tài sản cố định hữu hình'],
                        children: [
                            { code: 'a', name: 'a. Nguyên giá TSCĐ', keys: ['a. Nguyên giá TSCĐ'] },
                            { code: 'b', name: 'b. Hao mòn TSCĐ', keys: ['b. Hao mòn TSCĐ'] }
                        ]
                    },
                    { code: '2', name: '2. Tài sản cố định thuê tài chính', keys: ['2. Tài sản cố định thuê tài chính'] },
                    { code: '3', name: '3. Tài sản cố định vô hình', keys: ['3. Tài sản cố định vô hình'] }
                ]
            },
            {
                code: 'XI', name: 'XI. Bất động sản đầu tư', isBold: true,
                keys: ['Investment properties', 'X. Bất động sản đầu tư'],
                children: [
                    { code: 'a', name: 'a. Nguyên giá BĐSĐT', keys: ['a. Nguyên giá BĐSĐT'] },
                    { code: 'b', name: 'b. Hao mòn BĐSĐT', keys: ['b. Hao mòn BĐSĐT'] }
                ]
            },
            {
                code: 'XII', name: 'XII. Tài sản "Có" khác', isBold: true,
                keys: ['Other assets', '12. Tài sản Có khác', 'XI. Tài sản "Có" khác'],
                children: [
                    { code: '1', name: '1. Các khoản phải thu', keys: ['1. Các khoản phải thu'] },
                    { code: '2', name: '2. Các khoản lãi, phí phải thu', keys: ['2. Các khoản lãi, phí phải thu'] },
                    { code: '3', name: '3. Tài sản thuế TNDN hoãn lại', keys: ['3. Tài sản thuế TNDN hoãn lại'] },
                    {
                        code: '4', name: '4. Tài sản Có khác', keys: ['4. Tài sản Có khác'],
                        children: [
                            { code: 'extra', name: '- Trong đó: Lợi thế thương mại', keys: ['- Trong đó: Lợi thế thương mại'] }
                        ]
                    },
                    { code: '5', name: '5. Các khoản dự phòng rủi ro cho các tài sản Có nội bảng khác', keys: ['5. Các khoản dự phòng rủi ro cho các tài sản Có nội bảng khác'] }
                ]
            }
        ]
    },
    { code: 'total_assets', name: 'TỔNG CỘNG TÀI SẢN', isBold: true, keys: ['TỔNG CỘNG TÀI SẢN'] },
    {
        code: 'B', name: 'B. NỢ PHẢI TRẢ VÀ VỐN CHỦ SỞ HỮU', isBold: true,
        keys: ['B. NỢ PHẢI TRẢ VÀ VỐN CHỦ SỞ HỮU'],
        children: [
            { code: 'I', name: 'I. Các khoản nợ Chính phủ và NHNN', keys: ['I. Các khoản nợ Chính phủ và NHNN', '1. Các khoản nợ Chính phủ và Ngân hàng Nhà nước'] },
            {
                code: 'II', name: 'II. Tiền gửi và vay các TCTD khác', isBold: true,
                keys: ['II. Tiền gửi và vay các TCTD khác', '2. Tiền gửi và vay các TCTD khác'],
                children: [
                    { code: '1', name: '1. Tiền gửi của các TCTD khác', keys: ['1. Tiền gửi của các TCTD khác'] },
                    { code: '2', name: '2. Vay các TCTD khác', keys: ['2. Vay các TCTD khác'] }
                ]
            },
            { code: 'III', name: 'III. Tiền gửi của khách hàng', keys: ['III. Tiền gửi của khách hàng', '3. Tiền gửi của khách hàng'], isBold: true },
            { code: 'IV', name: 'IV. Các công cụ tài chính phái sinh và các khoản nợ tài chính khác', keys: ['IV. Các công cụ tài chính phái sinh và các khoản nợ tài chính khác'] },
            { code: 'V', name: 'V. Vốn tài trợ, ủy thác đầu tư, cho vay mà TCTD chịu rủủi ro', keys: ['V. Vốn tài trợ, ủy thác đầu tư, cho vay mà TCTD chịu rủủi ro'] },
            { code: 'VI', name: 'VI. Phát hành giấy tờ có giá', keys: ['VI. Phát hành giấy tờ có giá', '5. Phát hành giấy tờ có giá'] },
            {
                code: 'VII', name: 'VII. Các khoản nợ khác', isBold: true,
                keys: ['VII. Các khoản nợ khác'],
                children: [
                    { code: '1', name: '1. Các khoản lãi, phí phải trả', keys: ['1. Các khoản lãi, phí phải trả'] },
                    { code: '2', name: '2. Thuế TNDN hoãn lại phải trả', keys: ['2. Thuế TNDN hoãn lại phải trả'] },
                    { code: '3', name: '3. Các khoản phải trả và công nợ khác', keys: ['3. Các khoản phải trả và công nợ khác'] },
                    { code: '4', name: '4. Dự phòng rủi ro khác (Dự phòng cho công nợ tiềm ẩn và cam kết ngoại bảng)', keys: ['4. Dự phòng rủi ro khác (Dự phòng cho công nợ tiềm ẩn và cam kết ngoại bảng)'] }
                ]
            },
            { code: 'total_liabilities', name: 'TỔNG NỢ PHẢI TRẢ', isBold: true, keys: ['TỔNG NỢ PHẢI TRẢ'] },
            {
                code: 'VIII', name: 'VIII. Vốn và các quỹ', isBold: true,
                keys: ['VIII. Vốn và các quỹ', 'Vốn và các quỹ'],
                children: [
                    {
                        code: '1', name: '1. Vốn của TCTD', isBold: true,
                        keys: ['1. Vốn của TCTD'],
                        children: [
                            { code: 'a', name: 'a. Vốn điều lệ', keys: ['a. Vốn điều lệ'] },
                            { code: 'b', name: 'b. Vốn đầu tư XDCB', keys: ['b. Vốn đầu tư XDCB'] },
                            { code: 'c', name: 'c. Thặng dư vốn cổ phần', keys: ['c. Thặng dư vốn cổ phần', 'II. Thặng dư vốn cổ phần'] },
                            { code: 'd', name: 'd. Cổ phiếu quỹ', keys: ['d. Cổ phiếu quỹ'] },
                            { code: 'e', name: 'e. Cổ phiếu ưu đãi', keys: ['e. Cổ phiếu ưu đãi'] },
                            { code: 'g', name: 'g. Vốn khác', keys: ['g. Vốn khác'] }
                        ]
                    },
                    { code: '2', name: '2. Quỹ của TCTD', keys: ['2. Quỹ của TCTD'] },
                    { code: '3', name: '3. Chênh lệch tỷ giá hối đoái', keys: ['3. Chênh lệch tỷ giá hối đoái'] },
                    { code: '4', name: '4. Chênh lệch đánh giá lại tài sản', keys: ['4. Chênh lệch đánh giá lại tài sản'] },
                    { code: '5', name: '5. Lợi nhuận chưa phân phối/Lỗ lũy kế', keys: ['5. Lợi nhuận chưa phân phối/Lỗ lũy kế', 'Lợi nhuận chưa phân phối'] },
                    { code: '6', name: '6. Lợi ích cổ đông không kiểm soát', keys: ['6. Lợi ích cổ đông không kiểm soát'] }
                ]
            },
            { code: 'IX', name: 'IX. Lợi ích của cổ đông thiểu số', keys: ['IX. Lợi ích của cổ đông thiểu số'] }
        ]
    },
    { code: 'total_liabilities_equity', name: 'TỔNG NỢ PHẢI TRẢ VÀ VỐN CHỦ SỞ HỮU', isBold: true, keys: ['TỔNG NỢ PHẢI TRẢ VÀ VỐN CHỦ SỞ HỮU', 'TỔNG CỘNG NGUỒN VỐN'] },
];

export const SECURITIES_BALANCE_STRUCTURE: any[] = [
    {
        code: 'A', name: 'A. TÀI SẢN NGẮN HẠN', isBold: true,
        keys: ['A. TÀI SẢN NGẮN HẠN', 'TÀI SẢN NGẮN HẠN'],
        children: [
            {
                code: 'I', name: 'I. Tài sản tài chính ngắn hạn', isBold: true,
                keys: ['I. Tài sản tài chính ngắn hạn', 'I. TÀI SẢN TÀI CHÍNH'],
                children: [
                    {
                        code: '1', name: '1. Tiền và các khoản tương đương tiền', isBold: true,
                        keys: ['1. Tiền và các khoản tương đương tiền'],
                        children: [
                            { code: '1.1', name: '1.1. Tiền', keys: ['1.1. Tiền'] },
                            { code: '1.2', name: '1.2. Các khoản tương đương tiền', keys: ['1.2. Các khoản tương đương tiền'] }
                        ]
                    }
                ]
            },
            {
                code: 'INVEST', name: 'Các khoản đầu tư tài chính ngắn hạn', isBold: true,
                keys: ['Các khoản đầu tư tài chính ngắn hạn'],
                children: [
                    {
                        code: 'DT_NH', name: '+Đầu tư ngắn hạn', keys: ['+Đầu tư ngắn hạn'],
                        children: [
                            { code: 'DP_NH', name: 'Dự phòng giảm giá đầu tư ngắn hạn', keys: ['Dự phòng giảm giá đầu tư ngắn hạn'] }
                        ]
                    },
                    { code: '2', name: '2. Các tài sản tài chính ghi nhận thông qua lãi lỗ (FVTPL)', keys: ['2. Các tài sản tài chính ghi nhận thông qua lãi lỗ (FVTPL)'] },
                    { code: '3', name: '3. Các khoản đầu tư nắm giữ đến ngày đáo hạn (HTM)', keys: ['3. Các khoản đầu tư nắm giữ đến ngày đáo hạn (HTM)'] },
                    { code: '4', name: '4. Các khoản cho vay', keys: ['4. Các khoản cho vay'] },
                    {
                        code: '5', name: '5. Các tài sản tài chính sẵn sàn để bán (AFS)', keys: ['5. Các tài sản tài chính sẵn sàn để bán (AFS)'],
                        children: [
                            { code: '6', name: '6. Dự phòng suy giảm giá trị tài sản tài chính', keys: ['6. Dự phòng suy giảm giá trị tài sản tài chính và tài sản thế chấp'] }
                        ]
                    },
                    {
                        code: '7', name: '7. Các khoản phải thu ngắn hạn', isBold: true,
                        keys: ['7. Các khoản phải thu ngắn hạn'],
                        children: [
                            { code: '7.1', name: '7.1. Phải thu bán các tài sản tài chính', keys: ['7.1. Phải thu bán các tài sản tài chính'] },
                            {
                                code: '7.2', name: '7.2. Phải thu và dự thu cổ tức, tiền lãi', keys: ['7.2. Phải thu và dự thu cổ tức, tiền lãi các tài sản tài chính'],
                                children: [
                                    { code: '7.2.2', name: '7.2.2. Dự thu cổ tức, tiền lãi chưa đến ngày nhận', keys: ['7.2.2. Dự thu cổ tức, tiền lãi chưa đến ngày nhận'] }
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                code: 'TRA_TRUOC', name: 'Trả trước cho người bán', keys: ['Trả trước cho người bán'],
                children: [
                    { code: '9', name: '9. Phải thu các dịch vụ CTCK cung cấp', keys: ['9. Phải thu các dịch vụ CTCK cung cấp'] }
                ]
            },
            {
                code: 'PT_GDCK', name: 'Phải thu hoạt động giao dịch chứng khoán', keys: ['Phải thu hoạt động giao dịch chứng khoán'],
                children: [
                    {
                        code: '12', name: '12. Các khoản phải thu khác', keys: ['12. Các khoản phải thu khác'],
                        children: [
                            {
                                code: '13', name: '13. Dự phòng suy giảm giá trị các khoản phải thu', keys: ['13. Dự phòng suy giảm giá trị các khoản phải thu'],
                                children: [
                                    { code: 'DP_PT_KD', name: 'Dự phòng các khoản phải thu ngắn hạn khó đòi', keys: ['Dự phòng các khoản phải thu ngắn hạn khó đòi'] }
                                ]
                            }
                        ]
                    }
                ]
            },
            { code: 'PT_KH', name: 'Phải thu khách hàng', keys: ['Phải thu khách hàng'] },
            { code: 'HTK', name: 'Hàng tồn kho', keys: ['Hàng tồn kho'] },
            {
                code: 'HTK_CT', name: 'Hàng tồn kho (chi tiết)', keys: ['Hàng tồn kho (chi tiết)'],
                children: [
                    {
                        code: 'II', name: 'II. Tài sản ngắn hạn khác', isBold: true,
                        keys: ['II. Tài sản ngắn hạn khác'],
                        children: [
                            { code: '1_II', name: '1. Tạm ứng', keys: ['1. Tạm ứng'] },
                            { code: '2_II', name: '2. Vật tư văn phòng, công cụ, dụng cụ', keys: ['2. Vật tư văn phòng, công cụ, dụng cụ'] },
                            {
                                code: '3_II', name: '3. Chi phí trả trước ngắn hạn', keys: ['3. Chi phí trả trước ngắn hạn'],
                                children: [
                                    { code: '4_II', name: '4. Cầm cố, thế chấp, ký quỹ, ký cược ngắn hạn', keys: ['4. Cầm cố, thế chấp, ký quỹ, ký cược ngắn hạn'] }
                                ]
                            },
                            { code: '8_II', name: '8. Thuế GTGT còn được khấu trừ', keys: ['8. Thuế GTGT còn được khấu trừ'] }
                        ]
                    }
                ]
            },
            {
                code: 'THUE_PT', name: 'Thuế và các khoản khác phải thu của nhà nước', keys: ['Thuế và các khoản khác phải thu của nhà nước'],
                children: [
                    { code: '5_II', name: '5. Tài sản ngắn hạn khác', keys: ['5. Tài sản ngắn hạn khác'] }
                ]
            }
        ]
    },
    {
        code: 'B', name: 'B. TÀI SẢN DÀI HẠN', isBold: true,
        keys: ['B. TÀI SẢN DÀI HẠN', 'TÀI SẢN DÀI HẠN'],
        children: [
            { code: '2_B', name: '2. Các khoản đầu tư', isBold: true, keys: ['2. Các khoản đầu tư'] }
        ]
    },
    {
        code: '2.5_B', name: '2.5 Đầu tư dài hạn khác', keys: ['2.5 Đầu tư dài hạn khác'],
        children: [
            { code: '2.6_B', name: '2.6 Dự phòng giảm giá đầu tư dài hạn', keys: ['2.6 Dự phòng giảm giá đầu tư dài hạn'] }
        ]
    },
    {
        code: 'II_B', name: 'II. Tài sản cố định', isBold: true,
        keys: ['II. Tài sản cố định'],
        children: [
            { code: '1_B', name: '1. Tài sản cố định hữu hình', keys: ['1. Tài sản cố định hữu hình'] },
            { code: '3_B', name: '3. Tài sản cố định vô hình', keys: ['3. Tài sản cố định vô hình'] }
        ]
    },
    { code: 'IV_B', name: 'IV. Chi phí xây dựng cơ bản dở dang', keys: ['IV. Chi phí xây dựng cơ bản dở dang'] },
    {
        code: 'V_B', name: 'V. Tài sản dài hạn khác', isBold: true,
        keys: ['V. Tài sản dài hạn khác'],
        children: [
            { code: '1_V_B', name: '1. Cầm cố, thế chấp, ký quỹ, ký cược dài hạn', keys: ['1. Cầm cố, thế chấp, ký quỹ, ký cược dài hạn'] },
            { code: '2_V_B', name: '2. Chi phí trả trước dài hạn', keys: ['2. Chi phí trả trước dài hạn'] },
            { code: '3_V_B', name: '3. Tài sản thuế thu nhập hoãn lại', keys: ['3. Tài sản thuế thu nhập hoãn lại'] },
            { code: '4_V_B', name: '4. Tiền nộp Quỹ hỗ trợ thanh toán', keys: ['4. Tiền nộp Quỹ hỗ trợ thanh toán'] },
            {
                code: '5_V_B', name: '5. Tài sản dài hạn khác', keys: ['5. Tài sản dài hạn khác'],
                children: [
                    { code: '6_V_B', name: '6. Lợi thế thương mại', keys: ['6. Lợi thế thương mại'] }
                ]
            }
        ]
    },
    { code: 'TỔNG_CỘNG_TÀI_SẢN', name: 'TỔNG CỘNG TÀI SẢN (270=100+200)', isBold: true, keys: ['TỔNG CỘNG TÀI SẢN (270=100+200)', 'TỔNG CỘNG TÀI SẢN'] },
    { code: 'NỢ_PHẢI_TRẢ', name: 'A. NỢ PHẢI TRẢ (300=310+340)', isBold: true, keys: ['A. NỢ PHẢI TRẢ (300=310+340)', 'NỢ PHẢI TRẢ'] },
    {
        code: 'I_NỢ', name: 'I. Nợ ngắn hạn', isBold: true,
        keys: ['I. Nợ ngắn hạn'],
        children: [
            {
                code: '1_I_NỢ', name: '1. Vay và nợ thuê tài chính ngắn hạn', isBold: true,
                keys: ['1. Vay và nợ thuê tài chính ngắn hạn'],
                children: [
                    { code: '1.1_I_NỢ', name: '1.1. Vay ngắn hạn', keys: ['1.1. Vay ngắn hạn'] }
                ]
            },
            { code: '4_I_NỢ', name: '4. Trái phiếu phát hành ngắn hạn', keys: ['4. Trái phiếu phát hành ngắn hạn'] },
            { code: '6_I_NỢ', name: '6. Phải trả hoạt động giao dịch chứng khoán', keys: ['6. Phải trả hoạt động giao dịch chứng khoán'] },
            { code: '7_I_NỢ', name: '7. Phải trả về lỗi giao dịch các tài sản tài chính', keys: ['7. Phải trả về lỗi giao dịch các tài sản tài chính'] },
            { code: '8_I_NỢ', name: '8. Phải trả người bán ngắn hạn', keys: ['8. Phải trả người bán ngắn hạn'] },
            { code: '9_I_NỢ', name: '9. Người mua trả tiền trước ngắn hạn', keys: ['9. Người mua trả tiền trước ngắn hạn'] },
            { code: '10_I_NỢ', name: '10. Thuế và các khoản phải nộp Nhà nước', keys: ['10. Thuế và các khoản phải nộp Nhà nước'] },
            { code: '11_I_NỢ', name: '11. Phải trả người lao động', keys: ['11. Phải trả người lao động'] },
            { code: '12_I_NỢ', name: '12. Các khoản trích nộp phúc lợi nhân viên', keys: ['12. Các khoản trích nộp phúc lợi nhân viên'] },
            { code: '13_I_NỢ', name: '13. Chi phí phải trả ngắn hạn', keys: ['13. Chi phí phải trả ngắn hạn'] },
            { code: '17_I_NỢ', name: '17. Các khoản phải trả, phải nộp khác ngắn hạn', keys: ['17. Các khoản phải trả, phải nộp khác ngắn hạn'] }
        ]
    },
    {
        code: 'PT_CO_TUC', name: 'Phải trả hộ cổ tức, gốc và lãi trái phiếu', keys: ['Phải trả hộ cổ tức, gốc và lãi trái phiếu'],
        children: [
            { code: '19_I_NỢ', name: '19. Quỹ khen thưởng phúc lợi', keys: ['19. Quỹ khen thưởng phúc lợi'] }
        ]
    },
    {
        code: 'II_NỢ', name: 'II. Nợ dài hạn', isBold: true,
        keys: ['II. Nợ dài hạn'],
        children: [
            { code: '1_II_NỢ', name: '1. Vay và nợ thuê tài chính dài hạn', keys: ['1. Vay và nợ thuê tài chính dài hạn'] },
            {
                code: '11_II_NỢ', name: '11. Phải trả, phải nộp khác dài hạn', keys: ['11. Phải trả, phải nộp khác dài hạn'],
                children: [
                    { code: '13_II_NỢ', name: '13. Dự phòng bồi thường thiệt hại cho nhà đầu tư', keys: ['13. Dự phòng bồi thường thiệt hại cho nhà đầu tư'] }
                ]
            },
            { code: '14_II_NỢ', name: '14. Thuế thu nhập hoãn lại phải trả', keys: ['14. Thuế thu nhập hoãn lại phải trả'] }
        ]
    },
    { code: 'VỐN_CHỦ', name: 'B. VỐN CHỦ SỞ HỮU (400=410+420)', isBold: true, keys: ['B. VỐN CHỦ SỞ HỮU (400=410+420)', 'VỐN CHỦ SỞ HỮU'] },
    {
        code: 'I_VỐN', name: 'I. Vốn chủ sở hữu', isBold: true,
        keys: ['I. Vốn chủ sở hữu'],
        children: [
            {
                code: '1_I_VỐN', name: '1. Vốn đầu tư của chủ sở hữu', isBold: true,
                keys: ['1. Vốn đầu tư của chủ sở hữu'],
                children: [
                    { code: '1.1_I_VỐN', name: '1.1. Vốn góp của chủ sở hữu', keys: ['1.1. Vốn góp của chủ sở hữu'] }
                ]
            }
        ]
    },
    {
        code: '1.1.a', name: 'a. Cổ phiếu phổ thông', keys: ['a. Cổ phiếu phổ thông'],
        children: [
            { code: '1.2_I_VỐN', name: '1.2. Thặng dư vốn cổ phần', keys: ['1.2. Thặng dư vốn cổ phần'] },
            { code: '1.5_I_VỐN', name: '1.5. Cổ phiếu quỹ', keys: ['1.5. Cổ phiếu quỹ'] }
        ]
    },
    {
        code: '2_I_VỐN', name: '2. Chênh lệch đánh giá lại tài sản theo giá trị hợp lý', keys: ['2. Chênh lệch đánh giá lại tài sản theo giá trị hợp lý'],
        children: [
            { code: '4_I_VỐN', name: '4. Quỹ dự trữ điều lệ', keys: ['4. Quỹ dự trữ điều lệ'] }
        ]
    },
    {
        code: 'QUY_DT', name: 'Quỹ đầu tư phát triển', keys: ['Quỹ đầu tư phát triển'],
        children: [
            { code: '5_I_VỐN', name: '5. Quỹ dự phòng tài chính và rủi ro nghề nghiệp', keys: ['5. Quỹ dự phòng tài chính và rủi ro nghề nghiệp'] },
            {
                code: '7_I_VỐN', name: '7. Lợi nhuận sau thuế chưa phân phối', isBold: true,
                keys: ['7. Lợi nhuận sau thuế chưa phân phối'],
                children: [
                    { code: '7.1_I_VỐN', name: '7.1. Lợi nhuận đã thực hiện', keys: ['7.1. Lợi nhuận đã thực hiện'] },
                    { code: '7.2_I_VỐN', name: '7.2. Lợi nhuận chưa thực hiện', keys: ['7.2. Lợi nhuận chưa thực hiện'] }
                ]
            },
            { code: '8_I_VỐN', name: '8. Lợi ích cổ đông không nắm quyền kiểm soát', keys: ['8. Lợi ích cổ đông không nắm quyền kiểm soát'] }
        ]
    },
    { code: 'TỔNG_NGUỒN_VỐN', name: 'TỔNG CỘNG NGUỒN VỐN  (440=300+400)', isBold: true, keys: ['TỔNG CỘNG NGUỒN VỐN  (440=300+400)', 'TỔNG CỘNG NGUỒN VỐN'] }
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
    const [industry, setIndustry] = useState<string>('');
    const [isExpanded, setIsExpanded] = useState(false);

    const currentStructure = useMemo(() => {
        const ind = industry.toLowerCase();
        if (ind.includes('ngân hàng')) return BANK_BALANCE_STRUCTURE;
        if (ind.includes('dịch vụ tài chính')) return SECURITIES_BALANCE_STRUCTURE;
        return VAS_BALANCE_STRUCTURE;
    }, [industry]);

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
            const [stmRes, metaRes] = await Promise.all([
                supabase.from('financial_statements')
                    .select('*')
                    .eq('symbol', symbol)
                    .eq('statement_type', 'balance_sheet')
                    .eq('period_type', period),
                supabase.from('stock_symbols')
                    .select('icb_name2')
                    .eq('symbol', symbol)
                    .single()
            ]);

            setIndustry(metaRes.data?.icb_name2 || '');
            const data = stmRes.data || [];
            if (stmRes.error) throw stmRes.error;

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

            mapRecursive(currentStructure);

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
        extract(currentStructure);
        return list;
    }, [currentStructure]);

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
                        <Space>
                            <Tooltip title="Mở rộng bảng">
                                <Button
                                    type="text"
                                    size="small"
                                    onClick={() => setIsExpanded(true)}
                                    className="text-gray-500 hover:text-neon-blue transition-colors"
                                    icon={<Maximize2 size={16} />}
                                />
                            </Tooltip>
                            <Tooltip title="Đơn vị: Tỷ VNĐ. Chuẩn Thông tư 200.">
                                <Info size={16} className="text-gray-500 cursor-help" />
                            </Tooltip>
                        </Space>
                    </div>
                }>
                <Table
                    dataSource={currentStructure}
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

            {/* EXPANDED MODAL */}
            <Modal
                open={isExpanded}
                onCancel={() => setIsExpanded(false)}
                footer={null}
                width="95vw"
                style={{ top: 20 }}
                styles={{ body: { padding: 0, background: '#0b0e11' } }}
                closeIcon={<Minimize2 size={18} className="text-gray-400 hover:text-white" />}
                title={
                    <div className="flex justify-between items-center w-full pr-8">
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
                }
            >
                <Table
                    dataSource={currentStructure}
                    columns={columns as any}
                    pagination={false}
                    scroll={{ x: 1600, y: 'calc(90vh - 120px)' }}
                    size="middle"
                    rowKey="code"
                    className="vas-table-custom vas-table-expanded"
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
            </Modal>

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
                
                /* Expanded modal styles */
                .vas-table-expanded .ant-table-thead > tr > th {
                    font-size: 11px !important;
                    padding: 8px 12px !important;
                }
                .vas-table-expanded .ant-table-tbody > tr > td {
                    font-size: 12px !important;
                    padding: 6px 12px !important;
                }
                .vas-table-expanded .ant-table-cell-fix-left:first-child {
                    min-width: 500px !important;
                }
                .ant-modal-content {
                    background: #0b0e11 !important;
                    border: 1px solid #2a2e39 !important;
                }
                .ant-modal-header {
                    background: #131722 !important;
                    border-bottom: 1px solid #2a2e39 !important;
                }
                .ant-modal-title {
                    color: #fff !important;
                }
            `}</style>
        </div>
    );
};

export default VASBalanceSheet;
