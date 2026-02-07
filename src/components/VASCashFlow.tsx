import React, { useEffect, useState, useMemo } from 'react';
import { Table, Radio, Card, Empty, Spin, Checkbox, Space, Divider, Tooltip, Button, Dropdown, Input, Modal } from 'antd';
import { Activity, BarChart3, TrendingUp, Info, ChevronRight, ChevronDown, RefreshCw, LineChart, BarChart, Layers, Trash2, Settings2, Maximize2, Minimize2 } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { useDroppable } from '@dnd-kit/core';
import { supabase } from '../supabaseClient';

// --- CHUẨN VAS (Thông tư 200/2014/TT-BTC) - LƯU CHUYỂN TIỀN TỆ (PHÂN CẤP) ---
// --- CHUẨN VAS (Thông tư 200/2014/TT-BTC) - LƯU CHUYỂN TIỀN TỆ (PHÂN CẤP) ---
export const VAS_CASHFLOW_STRUCTURE: any[] = [
    {
        code: '01', name: 'I. Lưu chuyển tiền từ hoạt động kinh doanh', isBold: true,
        keys: ['Lưu chuyển tiền thuần từ hoạt động kinh doanh', 'I. Lưu chuyển tiền từ hoạt động kinh doanh'],
        children: [
            { code: '01.1', name: '1. Lợi nhuận trước thuế', keys: ['Net profit/(loss) before tax', '01. Lợi nhuận trước thuế', 'Lợi nhuận trước thuế'] },
            {
                code: '02', name: '2. Điều chỉnh cho các khoản', keys: ['Điều chỉnh cho các khoản'],
                children: [
                    { code: '03', name: '- Khấu hao TSCĐ và BĐSĐT', keys: ['Khấu hao tài sản cố định'] },
                    { code: '05', name: '- Lãi/lỗ thuần từ hoạt động đầu tư', keys: ['Profit/loss from investing activities', '05. Lãi/lỗ từ hoạt động đầu tư', 'Lãi, lỗ từ hoạt động đầu tư'] },
                    { code: '06', name: '- Chi phí lãi vay', keys: ['Interest expense', '06. Chi phí lãi vay', 'Chi phí lãi vay'] }
                ]
            },
            { code: '20', name: 'Lưu chuyển tiền thuần từ hoạt động kinh doanh', keys: ['Lưu chuyển tiền thuần từ hoạt động kinh doanh'], isBold: true }
        ]
    },
    {
        code: '21', name: 'II. Lưu chuyển tiền từ hoạt động đầu tư', isBold: true,
        keys: ['Lưu chuyển tiền thuần từ hoạt động đầu tư', 'II. Lưu chuyển tiền từ hoạt động đầu tư'],
        children: [
            { code: '21.1', name: '1. Tiền chi mua sắm TSCĐ', keys: ['Tiền chi mua sắm, xây dựng TSCĐ và các TS dài hạn khác'] },
            { code: '21.2', name: '2. Tiền thu thanh lý TSCĐ', keys: ['Tiền thu từ thanh lý, nhượng bán TSCĐ và các TS dài hạn khác'] }
        ]
    },
    {
        code: '30', name: 'III. Lưu chuyển tiền từ hoạt động tài chính', isBold: true,
        keys: ['Lưu chuyển tiền thuần từ hoạt động tài chính', 'III. Lưu chuyển tiền từ hoạt động tài chính'],
        children: [
            { code: '31', name: '1. Tiền thu từ phát hành cổ phiếu', keys: ['Tiền thu từ phát hành cổ phiếu, nhận vốn góp của chủ sở hữu'] },
            { code: '33', name: '2. Tiền thu từ đi vay', keys: ['Proceeds from loans', '33. Tiền thu từ đi vay', 'Tiền thu từ đi vay'] },
            { code: '34', name: '3. Tiền trả nợ gốc vay', keys: ['Repayment of loans', '34. Tiền trả nợ gốc vay', 'Tiền trả nợ gốc vay'] }
        ]
    },
    { code: '50', name: 'Lưu chuyển tiền thuần trong kỳ', keys: ['Lưu chuyển tiền thuần trong kỳ'], isBold: true },
    { code: '60', name: 'Tiền và tương đương tiền đầu kỳ', keys: ['Cash and cash equivalents at the beginning of period', '60. Tiền và tương đương tiền đầu kỳ', 'Tiền và tương đương tiền đầu kỳ'], isBold: true },
    { code: '70', name: 'Tiền và tương đương tiền cuối kỳ', keys: ['Cash and cash equivalents at the end of period', '70. Tiền và tương đương tiền cuối kỳ', 'Tiền và tương đương tiền cuối kỳ'], isBold: true },
];

export const BANK_CASHFLOW_STRUCTURE: any[] = [
    {
        code: 'I', name: 'I - Lưu chuyển tiền thuần từ hoạt động kinh doanh', isBold: true,
        keys: ['Net cash inflows/(outflows) from operating activities', '20. Lưu chuyển tiền thuần từ hoạt động kinh doanh', 'Lưu chuyển tiền thuần từ hoạt động kinh doanh', 'I - Lưu chuyển tiền thuần từ hoạt động kinh doanh'],
        children: [
            { code: '1', name: '1. Thu nhập lãi và các khoản tương tự nhận được', keys: ['1. Thu nhập lãi và các khoản thu nhập tương tự nhận được', '1. Thu nhập lãi và các khoản thu nhập tương tự đã thu'] },
            { code: '2', name: '2. Chi phí lãi và các chi phí tương tự đã trả', keys: ['2. Chi phí lãi và các chi phí tương tự đã trả'] },
            { code: '3', name: '3. Thu nhập từ hoạt động dịch vụ nhận được', keys: ['3. Thu nhập từ hoạt động dịch vụ nhận được', '3. Thu nhập từ hoạt động dịch vụ đã thu'] },
            { code: '4', name: '4. Chênh lệch thực thu/chi từ HĐKD', keys: ['Unrealized foreign exchange gain/(loss)', '04. Lãi/lỗ chênh lệch tỷ giá hối đoái do đánh giá lại các khoản mục tiền tệ có gốc ngoại tệ', 'Lãi/lỗ chênh lệch tỷ giá hối đoái', '4- Chênh lệch số tiền thực thu/thực chi từ hoạt động kinh doanh (ngoại tệ, vàng bạc, chứng khoán)', '4. Chênh lệch tiền thực tế thu/ thực tế chi từ hoạt động kinh doanh'] },
            { code: '5', name: '5. Thu nhập khác', keys: ['5. Thu nhập khác'] },
            { code: '6', name: '6. Tiền thu nợ đã xử lý xóa', keys: ['6. Tiền thu các khoản nợ đã được xử lý xóa, bù đắp bằng nguồn rủi ro'] },
            { code: '7', name: '7. Tiền chi trả cho nhân viên và hoạt động quản lý', keys: ['7. Tiền chi trả cho nhân viên và hoạt động quản lý, công vụ'] },
            { code: '8', name: '8. Tiền thuế thu nhập thực nộp', keys: ['8. Tiền thuế thu nhập thực nộp trong kỳ'] },
            {
                code: 'changes', name: 'Thay đổi về tài sản và công nợ hoạt động', isBold: true,
                keys: ['Lưu chuyển tiền thuần từ hoạt động kinh doanh trước những thay đổi về tài sản và vốn lưu động'],
                children: [
                    {
                        code: 'assets', name: 'Thay đổi về tài sản hoạt động', isBold: true, keys: ['Những thay đổi về tài sản hoạt động'],
                        children: [
                            { code: '9', name: '9. (Tăng)/Giảm tiền gửi tại TCTD khác', keys: ['9. (Tăng)/Giảm các khoản tiền, vàng gửi và cho vay các TCTD khác'] },
                            { code: '10', name: '10. (Tăng)/Giảm các khoản về kinh doanh chứng khoán', keys: ['10. (Tăng)/Giảm các khoản về kinh doanh chứng khoán'] },
                            { code: '12', name: '12. (Tăng)/Giảm các khoản cho vay khách hàng', keys: ['12. (Tăng)/Giảm các khoản cho vay khách hàng'] },
                            { code: '13', name: '13. Giảm dự phòng rủi ro', keys: ['13. Giảm nguồn dự phòng để bù đắp tổn thất các khoản'] },
                            { code: '14', name: '14. (Tăng)/Giảm khác về tài sản hoạt động', keys: ['14. (Tăng)/Giảm khác về tài sản hoạt động'] }
                        ]
                    },
                    {
                        code: 'liabs', name: 'Thay đổi về công nợ hoạt động', isBold: true, keys: ['Những thay đổi về công nợ hoạt động'],
                        children: [
                            { code: '15', name: '15. Tăng/(Giảm) nợ Chính phủ/NHNN', keys: ['15. Tăng/(Giảm) các khoản nợ chính phủ và NHNN'] },
                            { code: '16', name: '16. Tăng/(Giảm) tiền gửi, vay TCTD', keys: ['16. Tăng/(Giảm) các khoản tiền gửi, tiền vay các tổ chức tín dụng'] },
                            { code: '17', name: '17. Tăng/(Giảm) tiền gửi của khách hàng', keys: ['17. Tăng/(Giảm) tiền gửi của khách hàng (bao gồm cả Kho bạc Nhà nước)'] },
                            { code: '18', name: '18. Tăng/(Giảm) phát hành giấy tờ có giá', keys: ['18. Tăng/(Giảm) phát hành giấy tờ có giá (ngoại trừ giấy tờ có giá phát hành được tình vào hoạt động tài chính)'] },
                            { code: '19', name: '19. Tăng/(Giảm) vốn ủy thác đầu tư', keys: ['19. Tăng/(Giảm) vốn tài trợ, ủy thác đầu tư, cho vay mà TCTD chịu rủi ro'] },
                            { code: '21', name: '21. Tăng/(Giảm) khác về công nợ hoạt động', keys: ['21. Tăng/(Giảm) khác về công nợ hoạt động'] },
                            { code: '22', name: '22. Chi từ các quỹ của TCTD', keys: ['22. Chi từ các quỹ của TCTD'] }
                        ]
                    }
                ]
            }
        ]
    },
    {
        code: 'II', name: 'II- Lưu chuyển tiền thuần từ hoạt động đầu tư', isBold: true,
        keys: ['Net cash inflows/(outflows) from investing activities', '30. Lưu chuyển tiền thuần từ hoạt động đầu tư', 'Lưu chuyển tiền thuần từ hoạt động đầu tư', 'II- Lưu chuyển tiền thuần từ hoạt động đầu tư'],
        children: [
            { code: '1', name: '1. Mua sắm tài sản cố định', keys: ['1. Mua sắm tài sản cố định'] },
            { code: '2', name: '2. Tiền thu từ thanh lý TSCĐ', keys: ['2. Tiền thu từ thanh lý, nhượng bán TSCĐ'] },
            { code: '4', name: '4. Mua sắm bất động sản đầu tư', keys: ['4. Mua sắm bất động sản đầu tư'] },
            { code: '7', name: '7. Chi đầu tư, góp vốn đơn vị khác', keys: ['Investments in other entities', '25. Tiền chi đầu tư góp vốn vào đơn vị khác', 'Tiền chi đầu tư góp vốn vào đơn vị khác', '7. Tiền chi đầu tư, góp vốn vào các đơn vị khác (mua công ty con, góp vốn liên doanh, liên kết, đầu tư dài hạn khác)'] },
            { code: '9', name: '9. Tiền thu cổ tức and lợi nhuận được chia', keys: ['9. Tiền thu cổ tức and lợi nhuận được chia từ các khoản đầu tư, góp vốn dài hạn'] }
        ]
    },
    {
        code: 'III', name: 'III- Lưu chuyển tiền thuần từ hoạt động tài chính', isBold: true,
        keys: ['Net cash inflows/(outflows) from financing activities', '40. Lưu chuyển tiền thuần từ hoạt động tài chính', 'Lưu chuyển tiền thuần từ hoạt động tài chính', 'III- Lưu chuyển tiền thuần từ hoạt động tài chính'],
        children: [
            { code: '1', name: '1. Tăng vốn cổ phần', keys: ['1. Tăng v ốn cổ phần từ góp vốn và/hoặc phát hành cổ phiếu'] },
            { code: '2', name: '2. Tiền thu phát hành GTCG dài hạn', keys: ['2. Tiền thu từ phát hành giấy tờ có giá dài hạn có đủ điều kiện tính vào vốn tự có and các khoản vốn vay dài hạn khác'] },
            { code: '4', name: '4. Cổ tức trả cho cổ đông', keys: ['4. Cổ tức trả cho cổ đông, lợi nhuận đã chia'] }
        ]
    },
    { code: 'IV', name: 'IV- Lưu chuyển tiền thuần trong kỳ', keys: ['Net increase in cash and cash equivalents', '50. Lưu chuyển tiền thuần trong kỳ', 'Lưu chuyển tiền thuần trong kỳ', 'IV- Lưu chuyển tiền thuần trong kỳ'], isBold: true },
    { code: 'V', name: 'V- Tiền and các khoản tương đương tiền đầu kỳ', keys: ['V- Tiền and các khoản tương đương tiền tại thời điểm đầu kỳ', 'Tiền and tương đương tiền đầu kỳ'], isBold: true },
    { code: 'VI', name: 'VI- Điều chỉnh ảnh hưởng của thay đổi tỷ giá', keys: ['Effect of foreign exchange differences', '61. Ảnh hưởng của thay đổi tỷ giá hối đoái quy đổi ngoại tệ', 'Ảnh hưởng của thay đổi tỷ giá hối đoái', 'VI- Điều chỉnh ảnh hưởng của thay đổi tỷ giá'] },
    { code: 'VII', name: 'VII. Tiền and các khoản tương đương tiền cuối kỳ', keys: ['VII. Tiền and các khoản tương đương tiền tại thời điểm cuối kỳ', 'Tiền and tương đương tiền cuối kỳ'], isBold: true }
];

export const SECURITIES_CASHFLOW_STRUCTURE: any[] = [
    {
        code: '1', name: '1. Lợi nhuận trước thuế', keys: ['1. Lợi nhuận trước thuế'],
        children: [
            { code: '2', name: '2. Điều chỉnh cho các khoản', keys: ['2. Điều chỉnh cho các khoản'] }
        ]
    },
    { code: 'KH', name: '- Khấu hao tài sản cố định', keys: ['Depreciation and amortization', '02. Khấu hao tài sản cố định và BĐSĐT', 'Khấu hao tài sản cố định và BĐSĐT', '- Khấu hao tài sản cố định'] },
    { code: 'DP', name: '- Các khoản lập dự phòng', keys: ['- Các khoản lập dự phòng'] },
    { code: 'DT_LL', name: '- Lãi, lỗ từ hoạt động đầu tư (đầu tư công ty con, liên doanh, liên kết)', keys: ['- Lãi, lỗ từ hoạt động đầu tư (đầu tư công ty con, liên doanh, liên kết)'] },
    { code: 'CP_LV', name: '- Chi phí lãi vay', keys: ['- Chi phí lãi vay'] },
    { code: 'LL_TSCD', name: '- Lãi, lỗ do thanh lý TSCĐ', keys: ['- Lãi, lỗ do thanh lý TSCĐ'] },
    { code: 'PB_LTTM', name: '- Phân bổ lợi thế thương mại', keys: ['- Phân bổ lợi thế thương mại'] },
    {
        code: 'DU_THU', name: '- Dự thu tiền lãi', keys: ['- Dự thu tiền lãi'],
        children: [
            { code: '3', name: '3. Tăng các chi phí phi tiền tệ', keys: ['3. Tăng các chi phí phi tiền tệ'] }
        ]
    },
    {
        code: 'LO_DG', name: '- Lỗ đánh giá giá trị các tài sản tài chính ghi nhận thông qua kết quả kinh doanh', keys: ['- Lỗ đánh giá giá trị các tài sản tài chính ghi nhận thông qua kết quả kinh doanh'],
        children: [
            { code: '4', name: '4. Giảm các doanh thu phi tiền tệ', keys: ['4. Giảm các doanh thu phi tiền tệ'] }
        ]
    },
    {
        code: 'LAI_DG', name: '- Lãi đánh giá giá trị các tài sản tài chính ghi nhận thông qua kết quả kinh doanh', keys: ['- Lãi đánh giá giá trị các tài sản tài chính ghi nhận thông qua kết quả kinh doanh'],
        children: [
            { code: '5', name: '5. Thay đổi tài sản và nợ phải trả hoạt động', keys: ['5. Thay đổi tài sản và nợ phải trả hoạt động'] }
        ]
    },
    { code: 'TG_FVTPL', name: '- Tăng (giảm) tài sản tài chính ghi nhận thông qua lãi lỗ', keys: ['- Tăng (giảm) tài sản tài chính ghi nhận thông qua lãi lỗ'] },
    { code: 'TG_HTM', name: '- Tăng (giảm) các khoản đầu tư giữ đến ngày đáo hạn', keys: ['- Tăng (giảm) các khoản đầu tư giữ đến ngày đáo hạn'] },
    { code: 'TG_CHO_VAY', name: '- Tăng, giảm các khoản cho vay khách hàng', keys: ['- Tăng, giảm các khoản cho vay khách hàng'] },
    { code: 'TG_AFS', name: '- Tăng (giảm) tài sản tài chính sẵn sàng để bán', keys: ['- Tăng (giảm) tài sản tài chính sẵn sàng để bán'] },
    {
        code: 'TG_PT', name: '- Tăng (giảm) các khoản phải thu', keys: ['(Increase)/decrease in receivables', '09. Tăng/giảm các khoản phải thu', 'Tăng/giảm các khoản phải thu', '- Tăng (giảm) các khoản phải thu'],
        children: [
            { code: '6', name: '6. Lợi nhuận từ hoạt động kinh doanh trước thay đổi vốn lưu động', keys: ['Operating profit/(loss) before changes in Working Capital', '08. Lợi nhuận từ hoạt động kinh doanh trước thay đổi vốn lưu động', 'Lợi nhuận từ hoạt động kinh doanh trước thay đổi vốn lưu động', 'Lưu chuyển tiền thuần từ HĐKD trước thay đổi VĐL', '6. Lợi nhuận từ hoạt động kinh doanh trước thay đổi vốn lưu động'] }
        ]
    },
    { code: 'PT_BAN_TSTC', name: '(-) Tăng, (+) giảm phải thu bán các tài sản tài chính', keys: ['(-) Tăng, (+) giảm phải thu bán các tài sản tài chính'] },
    { code: 'PT_LAI_TSTC', name: '(-) Tăng, (+) giảm phải thu tiền lãi các tài sản tài chính', keys: ['(-) Tăng, (+) giảm phải thu tiền lãi các tài sản tài chính'] },
    { code: 'PT_DV_CTCK', name: '(-) Tăng, (+) giảm các khoản phải thu các dịch vụ CTCK cung cấp', keys: ['(-) Tăng, (+) giảm các khoản phải thu các dịch vụ CTCK cung cấp'] },
    {
        code: 'PT_KHAC', name: '(-) Tăng, (+) giảm các khoản phải thu khác', keys: ['(-) Tăng, (+) giảm các khoản phải thu khác'],
        children: [
            { code: 'TG_TS_KHAC', name: '- Tăng (giảm) các tài sản khác', keys: ['- Tăng (giảm) các tài sản khác'] },
            { code: 'TG_PHAI_TRA', name: '- Tăng, giảm các khoản phải trả (Không kể lãi vay phải trả, thuế thu nhập doanh nghiệp phải nộp)', keys: ['Increase/(decrease) in payables', '11. Tăng/giảm các khoản phải trả', 'Tăng/giảm các khoản phải trả (Không kể lãi vay phải trả, thuế TNDN phải nộp)', '- Tăng, giảm các khoản phải trả (Không kể lãi vay phải trả, thuế thu nhập doanh nghiệp phải nộp)'] },
            { code: 'TG_CPTT', name: '- Tăng, giảm chi phí trả trước', keys: ['(Increase)/decrease in prepaid expenses', '12. Tăng/giảm chi phí trả trước', 'Tăng/giảm chi phí trả trước', '- Tăng, giảm chi phí trả trước'] },
            { code: 'THUE_TNDN', name: '- Thuế thu nhập doanh nghiệp đã nộp', keys: ['Corporate Income Tax paid', '15. Thuế thu nhập doanh nghiệp đã nộp', 'Thuế thu nhập doanh nghiệp đã nộp', '- Thuế thu nhập doanh nghiệp đã nộp'] },
            { code: 'LAI_VAY_TRA', name: '- Tiền lãi vay đã trả', keys: ['Interest paid', '14. Tiền lãi vay đã trả', 'Tiền lãi vay đã trả', '- Tiền lãi vay đã trả'] }
        ]
    },
    { code: 'TRA_NB', name: '(+) Tăng, (-) giảm phải trả cho người bán', keys: ['(+) Tăng, (-) giảm phải trả cho người bán'] },
    { code: 'PHUC_LOI', name: '(+) Tăng, (-) giảm các khoản trích nộp phúc lợi nhân viên', keys: ['(+) Tăng, (-) giảm các khoản trích nộp phúc lợi nhân viên'] },
    { code: 'THUE_NN', name: '(+) Tăng, (-) giảm thuế và các khoản phải nộp Nhà nước', keys: ['(+) Tăng, (-) giảm thuế và các khoản phải nộp Nhà nước'] },
    { code: 'NGUOI_LD', name: '(+) Tăng, (-) giảm phải trả người lao động', keys: ['(+) Tăng, (-) giảm phải trả người lao động'] },
    {
        code: 'PT_KHAC_2', name: '(+) Tăng, (-) giảm phải trả, phải nộp khác', keys: ['(+) Tăng, (-) giảm phải trả, phải nộp khác'],
        children: [
            { code: 'TG_HTK', name: '- Tăng, giảm hàng tồn kho (Tăng/giảm chứng khoán tự doanh)', keys: ['(Increase)/decrease in inventories', '10. Tăng/giảm hàng tồn kho', 'Tăng/giảm hàng tồn kho', '- Tăng, giảm hàng tồn kho (Tăng/giảm chứng khoán tự doanh)'] },
            { code: 'TIEN_THU_KHAC', name: '- Tiền thu khác từ hoạt động kinh doanh', keys: ['Other receipts from operating activities', '16. Tiền thu khác từ hoạt động kinh doanh', 'Tiền thu khác từ hoạt động kinh doanh', '- Tiền thu khác từ hoạt động kinh doanh'] },
            { code: 'TIEN_CHI_KHAC', name: '- Tiền chi khác cho hoạt động kinh doanh', keys: ['Other payments on operating activities', '17. Tiền chi khác cho hoạt động kinh doanh', 'Tiền chi khác cho hoạt động kinh doanh', '- Tiền chi khác cho hoạt động kinh doanh'] }
        ]
    },
    {
        code: 'LCTT_KD', name: 'Lưu chuyển tiền thuần từ hoạt động kinh doanh chứng khoán', isBold: true,
        keys: ['Other adjustments', '07. Các khoản điều chỉnh khác', 'Các khoản điều chỉnh khác', 'Lưu chuyển tiền thuần từ hoạt động kinh doanh chứng khoán'],
        children: [
            { code: '1_DT', name: '1. Tiền chi để mua sắm, xây dựng TSCĐ và các tài sản dài hạn khác', keys: ['Purchases of fixed assets and other long term assets', '21. Tiền chi để mua sắm, xây dựng TSCĐ và các tài sản dài hạn khác', 'Tiền chi để mua sắm, xây dựng TSCĐ', '1. Tiền chi để mua sắm, xây dựng TSCĐ và các tài sản dài hạn khác'] },
            { code: '2_DT', name: '2. Tiền thu từ thanh lý, nhượng bán TSCĐ và các tài sản dài hạn khác', keys: ['Proceeds from disposal of fixed assets', '22. Tiền thu từ thanh lý, nhượng bán TSCĐ và các tài sản dài hạn khác', 'Tiền thu từ thanh lý, nhượng bán TSCĐ', '2. Tiền thu từ thanh lý, nhượng bán TSCĐ và các tài sản dài hạn khác'] },
            { code: '3_DT', name: '3. Tiền chi cho vay, mua các công cụ nợ của đơn vị khác', keys: ['Loans granted, purchases of debt instruments', '23. Tiền chi cho vay, mua các công cụ nợ của đơn vị khác', 'Tiền chi cho vay, mua các công cụ nợ', '3. Tiền chi cho vay, mua các công cụ nợ của đơn vị khác'] },
            { code: '4_DT', name: '4. Tiền thu hồi cho vay, bán lại các công cụ nợ của đơn vị khác', keys: ['Collection of loans, proceeds from sales of debts instruments', '24. Tiền thu hồi cho vay, bán lại các công cụ nợ của đơn vị khác', 'Tiền thu hồi cho vay, bán lại các công cụ nợ', '4. Tiền thu hồi cho vay, bán lại các công cụ nợ của đơn vị khác'] },
            { code: '5_DT', name: '5. Tiền chi đầu tư vốn vào công ty con, công ty liên doanh, liên kết và đầu tư khác', keys: ['5. Tiền chi đầu tư vốn vào công ty con, công ty liên doanh, liên kết và đầu tư khác'] },
            {
                code: '6_DT', name: '6. Tiền thu thanh lý các khoản đầu tư vào công ty con, công ty liên doanh, liên kết và đầu tư khác', keys: ['6. Tiền thu thanh lý các khoản đầu tư vào công ty con, công ty liên doanh, liên kết và đầu tư khác'],
                children: [
                    { code: '7_DT', name: '7. Tiền thu về cổ tức và lợi nhuận được chia', keys: ['Dividends and interest received', '27. Tiền thu lãi cho vay, cổ tức và lợi nhuận được chia', 'Tiền thu lãi cho vay, cổ tức và lợi nhuận được chia', '7. Tiền thu về cổ tức và lợi nhuận được chia'] }
                ]
            }
        ]
    },
    {
        code: 'LCTT_DT', name: 'Lưu chuyển tiền thuần từ hoạt động đầu tư', isBold: true,
        keys: ['Lưu chuyển tiền thuần từ hoạt động đầu tư'],
        children: [
            { code: '1_TC', name: '1. Tiền thu từ phát hành cổ phiếu, nhận vốn góp của chủ sở hữu', keys: ['Proceeds from share issues', '31. Tiền thu từ phát hành cổ phiếu, nhận vốn góp của chủ sở hữu', 'Tiền thu từ phát hành cổ phiếu', '1. Tiền thu từ phát hành cổ phiếu, nhận vốn góp của chủ sở hữu'] },
            { code: '2_TC', name: '2. Tiền chi trả vốn góp cho các chủ sở hữu, mua lại cổ phiếu quỹ', keys: ['Payments for share returns and repurchases', '32. Tiền trả lại vốn góp cho các chủ sở hữu...', 'Tiền trả lại vốn góp cho các chủ sở hữu', '2. Tiền chi trả vốn góp cho các chủ sở hữu, mua lại cổ phiếu quỹ'] },
            {
                code: '3_TC', name: '3. Tiền vay gốc', keys: ['3. Tiền vay gốc'],
                children: [
                    { code: '3.2_TC', name: '3.2. Tiền vay khác', keys: ['3.2. Tiền vay khác'] }
                ]
            },
            {
                code: '4_TC', name: '4. Tiền chi trả nợ gốc vay', keys: ['4. Tiền chi trả nợ gốc vay'],
                children: [
                    { code: '4.3_TC', name: '4.3. Tiền chi trả gốc nợ vay khác', keys: ['4.3. Tiền chi trả gốc nợ vay khác'] }
                ]
            },
            { code: '6_TC', name: '6. Cổ tức, lợi nhuận đã trả cho chủ sở hữu', keys: ['Dividends paid', '36. Cổ tức, lợi nhuận đã trả cho chủ sở hữu', 'Cổ tức, lợi nhuận đã trả cho chủ sở hữu', '6. Cổ tức, lợi nhuận đã trả cho chủ sở hữu'] }
        ]
    },
    {
        code: 'LCTT_TC', name: 'Lưu chuyển tiền thuần từ hoạt động tài chính', isBold: true,
        keys: ['Lưu chuyển tiền thuần từ hoạt động tài chính'],
        children: [
            { code: 'IV', name: 'IV. Lưu chuyển tiền thuần trong kỳ', isBold: true, keys: ['IV. Lưu chuyển tiền thuần trong kỳ'] }
        ]
    },
    { code: 'V', name: 'V. Tiền và tương đương tiền đầu kỳ', isBold: true, keys: ['V. Tiền và tương đương tiền đầu kỳ'] },
    {
        code: 'TG_NH_DK', name: 'Tiền gửi ngân hàng đầu kỳ:', keys: ['Tiền gửi ngân hàng đầu kỳ:'],
        children: [
            { code: 'TG_CTCK_DK', name: '- Tiền gửi ngân hàng cho hoạt động CTCK', keys: ['- Tiền gửi ngân hàng cho hoạt động CTCK'] },
            { code: 'TDT_DK', name: '- Các khoản tương đương tiền', keys: ['- Các khoản tương đương tiền'] }
        ]
    },
    { code: 'TDT_CK', name: 'Tiền và tương đương tiền cuối kỳ', isBold: true, keys: ['Tiền và tương đương tiền cuối kỳ'] },
    {
        code: 'TG_NH_CK', name: 'Tiền gửi ngân hàng cuối kỳ:', keys: ['Tiền gửi ngân hàng cuối kỳ:'],
        children: [
            { code: '1_MG', name: '1. Tiền thu bán chứng khoán môi giới cho khách hàng', keys: ['1. Tiền thu bán chứng khoán môi giới cho khách hàng'] },
            { code: '2_MG', name: '2. Tiền chi mua chứng khoán môi giới cho khách hàng', keys: ['2. Tiền chi mua chứng khoán môi giới cho khách hàng'] },
            {
                code: '9_MG', name: '9. Nhận tiền gửi để thanh toán giao dịch chứng khoán của khách hàng', keys: ['9. Nhận tiền gửi để thanh toán giao dịch chứng khoán của khách hàng'],
                children: [
                    { code: '10_MG', name: '10. Tiền gửi ký quỹ của NĐT tại VSD', keys: ['10. Tiền gửi ký quỹ của NĐT tại VSD'] }
                ]
            },
            {
                code: '12_MG', name: '12. Nhận tiền gửi của Nhà đầu tư cho hoạt động ủy thác đầu tư của khách hàng', keys: ['12. Nhận tiền gửi của Nhà đầu tư cho hoạt động ủy thác đầu tư của khách hàng'],
                children: [
                    { code: '14_MG', name: '14. Chi trả phí lưu ký chứng khoán của khách hàng', keys: ['14. Chi trả phí lưu ký chứng khoán của khách hàng'] }
                ]
            }
        ]
    },
    {
        code: 'TG_THUAN', name: 'Tăng/giảm tiền thuần trong kỳ', keys: ['Tăng/giảm tiền thuần trong kỳ'],
        children: [
            { code: 'II_KH', name: 'II. Tiền và các khoản tương đương tiền đầu kỳ của khách hàng', keys: ['II. Tiền và các khoản tương đương tiền đầu kỳ của khách hàng'] },
            { code: 'TG_NĐT_GD', name: '-Tiền gửi của Nhà đầu tư về giao dịch chứng khoán theo phương thức CTCK quản lý', keys: ['-Tiền gửi của Nhà đầu tư về giao dịch chứng khoán theo phương thức CTCK quản lý'] },
            { code: 'TG_BU_TRU', name: '-Tiền gửi bù trừ và thanh toán giao dịch chứng khoán', keys: ['-Tiền gửi bù trừ và thanh toán giao dịch chứng khoán'] },
            { code: 'III_KH', name: 'III. Tiền và các khoản tương đương tiền cuối kỳ của khách hàng', keys: ['III. Tiền và các khoản tương đương tiền cuối kỳ của khách hàng'] }
        ]
    }
];


interface VASCashFlowProps {
    symbol: string | null;
}

const VASCashFlow: React.FC<VASCashFlowProps> = ({ symbol }) => {
    const [loading, setLoading] = useState(false);
    const [period, setPeriod] = useState<'year' | 'quarter'>('quarter');
    const [rawRecords, setRawRecords] = useState<any[]>([]);
    const [chartType, setChartType] = useState<'line' | 'bar' | 'stack'>('line');
    const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['I. Lưu chuyển tiền từ hoạt động kinh doanh']);
    const [metricAxes, setMetricAxes] = useState<Record<string, number>>({});
    const [metricTypes, setMetricTypes] = useState<Record<string, 'line' | 'bar' | 'stack'>>({});
    const [metricColors, setMetricColors] = useState<Record<string, string>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [industry, setIndustry] = useState<string>('');
    const [isExpanded, setIsExpanded] = useState(false);

    const currentStructure = useMemo(() => {
        const ind = industry.toLowerCase();
        if (ind.includes('ngân hàng')) return BANK_CASHFLOW_STRUCTURE;
        if (ind.includes('dịch vụ tài chính')) return SECURITIES_CASHFLOW_STRUCTURE;
        return VAS_CASHFLOW_STRUCTURE;
    }, [industry]);

    const COLORS = ['#1677ff', '#52c41a', '#f5222d', '#faad14', '#13c2c2', '#722ed1', '#eb2f96'];

    const { setNodeRef, isOver } = useDroppable({
        id: 'vas-cashflow-chart-droppable',
    });

    useEffect(() => {
        if (symbol) fetchData();
    }, [symbol, period]);

    useEffect(() => {
        const handleGlobalDrop = (e: any) => {
            if (e.detail.overId === 'vas-cashflow-chart-droppable') {
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
                    .eq('statement_type', 'cash_flow')
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
                        const color = p.value >= 0 ? '#00c076' : '#f6465d';
                        res += `<div style="display: flex; justify-content: space-between; gap: 20px; font-size: 12px; margin-bottom: 2px;">
                                    <span style="display: flex; align-items: center; gap: 6px;">${p.marker} ${p.seriesName}</span>
                                    <span style="font-weight: bold; color: ${color}">${(p.value / 1e9).toFixed(2)} tỷ</span>
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
                    itemStyle: {
                        color: (params: any) => {
                            if (selectedMetrics.length === 1 && !metricColors[m]) {
                                return params.value >= 0 ? '#00c076' : '#f6465d';
                            }
                            return color;
                        }
                    },
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
        setSelectedMetrics(['I. Lưu chuyển tiền từ hoạt động kinh doanh']);
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
                <span
                    className={`inline-block align-middle ${record.isBold ? 'font-bold' : ''} text-[10px] whitespace-nowrap overflow-hidden text-ellipsis`}
                    style={{ maxWidth: '430px' }}
                    title={text}
                >
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
                </Card>
            </div>
            <Card className="border-none bg-[#0b0e11] shadow-2xl"
                title={
                    <div className="flex justify-between items-center w-full">
                        <Space split={<Divider type="vertical" className="bg-gray-700" />}>
                            <span className="text-white text-lg font-bold">LƯU CHUYỂN TIỀN TỆ (VAS) - {symbol}</span>
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
                            <Tooltip title="Đơn vị: Tỷ VNĐ. Lưu chuyển tiền tệ gián tiếp.">
                                <Info size={16} className="text-gray-500 cursor-help" />
                            </Tooltip>
                        </Space>
                    </div>
                }>
                <Table
                    dataSource={currentStructure}
                    columns={columns as any}
                    pagination={false}
                    scroll={{ x: 'max-content', y: 500 }}
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
                            <span className="text-white text-lg font-bold">LƯU CHUYỂN TIỀN TỆ (VAS) - {symbol}</span>
                            <Radio.Group value={period} onChange={e => setPeriod(e.target.value)} buttonStyle="solid" size="small">
                                <Radio.Button value="year">NĂM</Radio.Button>
                                <Radio.Button value="quarter">QUÝ</Radio.Button>
                            </Radio.Group>
                        </Space>
                        <Tooltip title="Đơn vị: Tỷ VNĐ. LCTT gián tiếp.">
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

export default VASCashFlow;
