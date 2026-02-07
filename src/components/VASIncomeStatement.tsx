import React, { useEffect, useState, useMemo } from 'react';
import { Table, Radio, Card, Empty, Spin, Checkbox, Tag, Space, Divider, Tooltip, Button, Dropdown, Input, Modal } from 'antd';
import { Activity, BarChart3, TrendingUp, Info, ChevronRight, ChevronDown, RefreshCw, LineChart, BarChart, Layers, Trash2, Settings2, Maximize2, Minimize2 } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { useDroppable } from '@dnd-kit/core';
import { supabase } from '../supabaseClient';

// --- CHUẨN VAS (Thông tư 200/2014/TT-BTC) - KẾT QUẢ KINH DOANH (PHÂN CẤP) ---
// --- CHUẨN VAS (Thông tư 200/2014/TT-BTC) - KẾT QUẢ KINH DOANH (PHÂN CẤC) ---
export const VAS_INCOME_STRUCTURE: any[] = [
    {
        code: '01', name: 'Doanh thu bán hàng và cung cấp dịch vụ', keys: ['1. Doanh thu bán hàng và cung cấp dịch vụ', 'Doanh thu bán hàng và cung cấp dịch vụ', 'Doanh thu bán hàng'],
        children: [
            { code: '02', name: 'Các khoản giảm trừ doanh thu', keys: ['2. Các khoản giảm trừ doanh thu', 'Các khoản giảm trừ doanh thu'] }
        ]
    },
    { code: '10', name: 'Doanh thu thuần về bán hàng và cung cấp dịch vụ', keys: ['3. Doanh thu thuần về bán hàng và cung cấp dịch vụ', '10. Doanh thu thuần về bán hàng và cung cấp dịch vụ', 'Doanh thu thuần về bán hàng và cung cấp dịch vụ', 'Doanh thu thuần'], isBold: true },
    { code: '11', name: 'Giá vốn hàng bán', keys: ['4. Giá vốn hàng bán bán', '4. Giá vốn hàng bán', '11. Giá vốn hàng bán', 'Giá vốn hàng bán'] },
    { code: '20', name: 'Lợi nhuận gộp về bán hàng và cung cấp dịch vụ', keys: ['5. Lợi nhuận gộp về bán hàng và cung cấp dịch vụ', '20. Lợi nhuận gộp về bán hàng và cung cấp dịch vụ', 'Lợi nhuận gộp về bán hàng và cung cấp dịch vụ', 'Lợi nhuận gộp'], isBold: true },
    { code: '21', name: 'Doanh thu hoạt động tài chính', keys: ['6.Doanh thu hoạt động tài chính', '6. Doanh thu hoạt động tài chính', '21. Doanh thu hoạt động tài chính', 'Doanh thu hoạt động tài chính'] },
    {
        code: '22', name: 'Chi phí tài chính', keys: ['7. Chi phí tài chính', '22. Chi phí tài chính', 'Chi phí tài chính'],
        children: [
            { code: '23', name: '- Trong đó: Chi phí lãi vay', keys: ['Trong đó :Chi phí lãi vay', 'Trong đó: Chi phí lãi vay', 'Chi phí lãi vay'] }
        ]
    },
    { code: '25', name: 'Chi phí bán hàng', keys: ['9. Chi phí bán hàng', '25. Chi phí bán hàng', 'Chi phí bán hàng'] },
    { code: '26', name: 'Chi phí quản lý doanh nghiệp', keys: ['10. Chi phí quản lý doanh nghiệp', '26. Chi phí quản lý doanh nghiệp', 'Chi phí quản lý doanh nghiệp'] },
    { code: '30', name: 'Lợi nhuận thuần từ hoạt động kinh doanh', keys: ['11. Lợi nhuận thuần từ hoạt động kinh doanh', '30. Lợi nhuận thuần từ hoạt động kinh doanh', 'Lợi nhuận thuần từ hoạt động kinh doanh', 'Lợi nhuận thuần HĐKD'], isBold: true },
    {
        code: '31', name: 'Thu nhập khác', keys: ['12. Thu nhập khác', '31. Thu nhập khác', 'Thu nhập khác'],
        children: [
            { code: '32', name: 'Chi phí khác', keys: ['13. Chi phí khác', '32. Chi phí khác', 'Chi phí khác'] }
        ]
    },
    { code: '40', name: 'Lợi nhuận khác', keys: ['14. Lợi nhuận khác', '40. Lợi nhuận khác', 'Lợi nhuận khác'] },
    { code: '50', name: 'Tổng lợi nhuận kế toán trước thuế', keys: ['15. Tổng lợi nhuận kế toán trước thuế', '50. Tổng lợi nhuận kế toán trước thuế', 'Tổng lợi nhuận kế toán trước thuế'], isBold: true },
    { code: '60', name: 'Lợi nhuận sau thuế thu nhập doanh nghiệp', keys: ['18. Lợi nhuận sau thuế thu nhập doanh nghiêp', '18. Lợi nhuận sau thuế thu nhập doanh nghiệp', '60. Lợi nhuận sau thuế thu nhập doanh nghiệp', 'Lợi nhuận sau thuế thu nhập doanh nghiệp', 'Lợi nhuận sau thuế'], isBold: true },
    { code: '70', name: 'LNST của cổ đông công ty mẹ', keys: ['Lợi nhuận sau thuế của cổ đông của Công ty mẹ', 'Lợi nhuận sau thuế của cổ đông công ty mẹ', '70. LNST của cổ đông công ty mẹ', 'LNST của cổ đông công ty mẹ', 'LNST của CĐ công ty mẹ'], isBold: true },
    { code: 'EPS', name: 'Lãi cơ bản trên cổ phiếu (EPS)', keys: ['19. Lãi cơ bản trên cổ phiếu (*) (VNĐ)', '19. Lãi cơ bản trên cổ phiếu (*) (VND)', 'Lãi cơ bản trên cổ phiếu', 'Lãi cơ bản trên cổ phiếu (EPS)', 'EPS'] }
];

// --- CẤU TRÚC NGÂN HÀNG (BANKING) ---
export const BANK_INCOME_STRUCTURE: any[] = [
    {
        code: 'I_GRP', name: 'I. Thu nhập lãi thuần', isBold: true,
        keys: ['I. Thu nhập lãi thuần'],
        children: [
            { code: '1', name: '1. Thu nhập lãi và các khoản thu nhập tương tự', keys: ['1. Thu nhập lãi và các khoản thu nhập tương tự'] },
            { code: '2', name: '2. Chi phí lãi và các chi phí tương tự', keys: ['2. Chi phí lãi và các chi phí tương tự'] }
        ]
    },
    {
        code: 'II_GRP', name: 'II. Lãi/lỗ thuần từ hoạt động dịch vụ', isBold: true,
        keys: ['II. Lãi/lỗ thuần từ hoạt động dịch vụ'],
        children: [
            { code: '3', name: '3. Thu nhập từ hoạt động dịch vụ', keys: ['3. Thu nhập từ hoạt động dịch vụ'] },
            { code: '4', name: '4. Chi phí hoạt động dịch vụ', keys: ['4. Chi phí hoạt động dịch vụ'] }
        ]
    },
    { code: 'III', name: 'III. Lãi/lỗ thuần từ HĐ kinh doanh ngoại hối và vàng', keys: ['III. Lãi/lỗ thuần từ hoạt động kinh doanh ngoại hối và vàng'], isBold: true },
    { code: 'IV', name: 'IV. Lãi/lỗ thuần từ mua bán chứng khoán kinh doanh', keys: ['IV. Lãi/lỗ thuần từ mua bán chứng khoán kinh doanh'], isBold: true },
    { code: 'V', name: 'V. Lãi/lỗ thuần từ mua bán chứng khoán đầu tư', keys: ['V. Lãi/lỗ thuần từ mua bán chứng khoán đầu tư'], isBold: true },
    {
        code: 'VI_GRP', name: 'VI. Lãi/lỗ thuần từ hoạt động khác', isBold: true,
        keys: ['VI. Lãi/lỗ thuần từ hoạt động khác'],
        children: [
            { code: '5', name: '5. Thu nhập từ hoạt động khác', keys: ['5. Thu nhập từ hoạt động khác'] },
            { code: '6', name: '6. Chi phí hoạt động khác', keys: ['6. Chi phí hoạt động khác'] }
        ]
    },
    { code: 'VII', name: 'VII. Thu nhập từ góp vốn, mua cổ phần', keys: ['VII. Thu nhập từ góp vốn, mua cổ phần'], isBold: true },
    { code: 'VIII', name: 'VIII. Chi phí hoạt động', keys: ['VIII. Chi phí hoạt động'], isBold: true },
    { code: 'IX', name: 'IX. Lợi nhuận thuần trước dự phòng rủi ro', keys: ['IX. Lợi nhuận thuần từ hoạt động kinh doanh trước chi phí dự phòng rủi ro tín dụng (I+II+III+IV+V+VI+VII-VIII)'], isBold: true },
    { code: 'X', name: 'X. Chi phí dự phòng rủi ro tín dụng', keys: ['X. Chi phí dự phòng rủi ro tín dụng'], isBold: true },
    { code: 'XI', name: 'XI. Tổng lợi nhuận trước thuế', keys: ['XI. Tổng lợi nhuận trước thuế (IX-X)'], isBold: true },
    {
        code: 'XII_GRP', name: 'XII. Chi phí thuế TNDN', isBold: true,
        keys: ['XII. Chi phí thuế TNDN'],
        children: [
            { code: '7', name: '7. Chi phí thuế TNDN hiện hành', keys: ['7. Chi phí thuế TNDN hiện hành'] },
            { code: '8', name: '8. Chi phí thuế TNDN hoãn lại', keys: ['8. Chi phí thuế TNDN hoãn lại'] }
        ]
    },
    { code: 'XIII', name: 'XIII. Lợi nhuận sau thuế', keys: ['XIII. Lợi nhuận sau thuế (XI-XII)'], isBold: true },
    { code: 'XIV', name: 'XIV. Lợi ích của cổ đông thiểu số', keys: ['XIV. Lợi ích của cổ đông thiểu số'] },
    { code: 'XV', name: 'XV. LNST của cổ đông Ngân hàng mẹ', keys: ['XV. Lợi nhuận sau thuế của cổ đông của Ngân hàng mẹ (XIII-XIV)'], isBold: true },
    { code: 'EPS', name: 'Lãi cơ bản trên cổ phiếu (BCTC)', keys: ['Lãi cơ bản trên cổ phiếu (BCTC) (VNÐ)'] }
];

// --- CẤU TRÚC CHỨNG KHOÁN (SECURITIES) ---
export const SECURITIES_INCOME_STRUCTURE: any[] = [
    {
        code: 'I', name: 'I. DOANH THU HOẠT ĐỘNG', isBold: true,
        keys: ['Cộng doanh thu hoạt động (01->11)', 'I. DOANH THU HOẠT ĐỘNG'],
        children: [
            {
                code: '1.1', name: '1.1. Lãi từ các tài sản tài chính (FVTPL)', isBold: true,
                keys: ['1.1. Lãi từ các tài sản tài chính ghi nhận thông qua lãi/lỗ (FVTPL)'],
                children: [
                    { code: '1.1.a', name: 'a. Lãi bán các tài sản tài chính', keys: ['a. Lãi bán các tài sản tài chính'] },
                    { code: '1.1.b', name: 'b. Chênh lệch tăng đánh giá lại FVTPL', keys: ['b. Chênh lệch tăng đánh giá lại các TSTC thông qua lãi/lỗ'] },
                    { code: '1.1.c', name: 'c. Cổ tức, tiền lãi phát sinh từ FVTPL', keys: ['c. Cổ tức, tiền lãi phát sinh từ tài sản tài chính PVTPL'] },
                    { code: '1.1.d', name: 'd. Chênh lệch giảm do đánh giá lại phải trả chứng quyền', keys: ['d. Chênh lệch giảm do đánh giá lại phải trả chứng quyền đang lưu hành'] }
                ]
            },
            { code: '1.2', name: '1.2. Lãi từ HTM', keys: ['1.2. Lãi từ các khoản đầu tư nắm giữ đến ngày đáo hạn (HTM)'] },
            { code: '1.3', name: '1.3. Lãi từ các khoản cho vay và phải thu', keys: ['1.3. Lãi từ các khoản cho vay và phải thu'] },
            { code: '1.4', name: '1.4. Lãi từ AFS', keys: ['1.4. Lãi từ các tài sản tài chính sẵn sàng để bán (AFS)'] },
            { code: '1.5', name: '1.5. Lãi từ các công cụ phái sinh phòng ngừa rủi ro', keys: ['1.5. Lãi từ các công cụ phái sinh phòng ngừa rủi ro'] },
            {
                code: '1.6', name: '1.6. Doanh thu môi giới chứng khoán', keys: ['1.6. Doanh thu môi giới chứng khoán'],
                children: [
                    { code: 'dt_dau_tu_ck', name: '- Doanh thu hoạt động đầu tư CK, góp vốn', keys: ['- Doanh thu hoạt động đầu tư chứng khoán, góp vốn'] }
                ]
            },
            {
                code: '1.7', name: '1.7. Doanh thu bảo lãnh, đại lý phát hành', keys: ['1.7. Doanh thu bảo lãnh phát hành, đại lý phát hành chứng khoán'],
                children: [
                    { code: 'dt_quan_ly', name: '- Doanh thu quản lý danh mục đầu tư cho người ủy thác', keys: ['- Doanh thu quản lý danh mục đầu tư cho  người uỷ thác đầu tư'] }
                ]
            },
            { code: '1.8', name: '1.8. Doanh thu hoạt động tư vấn', keys: ['1.8. Doanh thu hoạt động tư vấn'] },
            { code: '1.9', name: '1.9. Doanh thu hoạt động ủy thác đấu giá', keys: ['1.9. Doanh thu hoạt động ủy thác đấu giá'] },
            {
                code: '1.10', name: '1.10. Doanh thu lưu ký chứng khoán', keys: ['1.10. Doanh thu lưu ký chứng khoán'],
                children: [
                    { code: 'dt_cho_thue', name: '- Doanh thu cho thuê sử dụng tài sản', keys: ['- Doanh thu cho thuê sử dụng tài sản'] }
                ]
            },
            { code: '1.11', name: '1.11. Thu nhập hoạt động khác', keys: ['1.11. Thu nhập hoạt động khác'] }
        ]
    },
    { code: 'GIAM_TRU_DT', name: 'Các khoản giảm trừ doanh thu', keys: ['Các khoản giảm trừ doanh thu'] },
    { code: 'CONG_DT', name: 'Cộng doanh thu hoạt động (01->11)', isBold: true, keys: ['Cộng doanh thu hoạt động (01->11)'] },
    { code: 'DTT', name: 'Doanh thu thuần', keys: ['Doanh thu thuần'], isBold: true },
    {
        code: 'II', name: 'II. CHI PHÍ HOẠT ĐỘNG', isBold: true,
        keys: ['Cộng chi phí hoạt động (21->33)', 'II. CHI PHÍ HOẠT ĐỘNG'],
        children: [
            {
                code: '2.1', name: '2.1. Lỗ các tài sản tài chính (FVTPL)', isBold: true,
                keys: ['2.1. Lỗ các tài sản tài chính ghi nhận thông qua lỗ (FVTPL)'],
                children: [
                    { code: '2.1.a', name: 'a. Lỗ bán các tài sản tài chính', keys: ['a. Lỗ bán các tài sản tài chính'] },
                    { code: '2.1.b', name: 'b. Chênh lệch giảm đánh giá lại FVTPL', keys: ['b. Chênh lệch giảm đánh giá lại các TSTC thông qua lãi/lỗ'] },
                    { code: '2.1.c', name: 'c. Chi phí giao dịch mua FVTPL', keys: ['c. Chi phí giao dịch mua các tài sản tài chính (FVTPL)'] },
                    { code: '2.1.d', name: 'd. Chênh lệch tăng do đánh giá lại phải trả chứng quyền', keys: ['d. Chênh lệch tăng do đánh giá lại phải trả chứng quyền đang lưu hành'] }
                ]
            },
            { code: '2.2', name: '2.2. Lỗ các khoản đầu tư HTM', keys: ['2.2. Lỗ các khoản đầu tư năm giữ đến ngày đáo hạn (HTM)'] },
            { code: '2.3', name: '2.3. Chi phí lãi vay, lỗ từ khoản cho vay', keys: ['2.3. Chi phí lãi vay, lỗ từ các khoản cho vay và phải thu'] },
            { code: '2.4', name: '2.4. Lỗ bán các tài sản tài chính AFS', keys: ['2.4 Lỗ bán các tài sản tài chính sẵn sàng để bán (AFS)'] },
            { code: 'prov_loss', name: 'Chi phí dự phòng TSTC, xử lý tổn thất', keys: ['Chi phí dự phòng TSTC, xử lý tổn thất các khoản phải thu khó đòi và lỗ suy giảm TSTC và chi phí đi vay của các khoản cho vay'] },
            { code: '2.5', name: '2.5. Lỗ từ các tài sản tài chính phái sinh', keys: ['2.5. Lỗ từ các tài sản tài chính phái sinh phòng ngừa rủi ro'] },
            { code: '2.6', name: '2.6. Chi phí hoạt động tự doanh', keys: ['2.6. Chi phí hoạt động tự doanh'] },
            { code: '2.7', name: '2.7. Chi phí môi giới chứng khoán', keys: ['2.7. Chi phí môi giới chứng khoán'] },
            { code: '2.8', name: '2.8. Chi phí hoạt động bảo lãnh, đại lý phát hành', keys: ['2.8. Chi phí hoạt động bảo lãnh, đại lý phát hành chứng  khoán'] },
            { code: '2.9', name: '2.9. Chi phí tư vấn', keys: ['2.9. Chi phí tư vấn'] },
            { code: '2.10', name: '2.10. Chi phí hoạt động đấu giá, ủy thác', keys: ['2.10. Chi phí hoạt động đấu giá, ủy thác'] },
            { code: '2.11', name: '2.11. Chi phí lưu ký chứng khoán', keys: ['2.11. Chi phí lưu ký chứng khoán'] },
            {
                code: '2.12', name: '2.12. Chi phí khác', keys: ['2.12. Chi phí khác'],
                children: [
                    { code: 'cp_sua_loi', name: 'Trong đó: Chi phí sửa lỗi giao dịch CK', keys: ['Trong đó: Chi phí sửa lỗi giao dịch chứng khoán, lỗi khác'] },
                    { code: 'cp_truc_tiep', name: '- Chi phí trực tiếp hoạt động kinh doanh CK', keys: ['- Chi phí trực tiếp hoạt động kinh doanh chứng khoán'] },
                    { code: 'cp_du_phong_ck', name: '- Chi phí dự phòng chứng khoán', keys: ['- Chi phí dự phòng chứng khoán'] }
                ]
            }
        ]
    },
    { code: 'CONG_CP', name: 'Cộng chi phí hoạt động (21->33)', isBold: true, keys: ['Cộng chi phí hoạt động (21->33)'] },
    { code: 'GOP', name: 'Lợi nhuận gộp của hoạt động kinh doanh', keys: ['Lợi nhuận gộp của hoạt động kinh doanh'], isBold: true },
    {
        code: 'III_GRP', name: 'III. DOANH THU HOẠT ĐỘNG TÀI CHÍNH', isBold: true,
        keys: ['Cộng doanh thu hoạt động tài chính (41->44)', 'III. DOANH THU HOẠT ĐỘNG TÀI CHÍNH'],
        children: [
            { code: '3.1', name: '3.1. Chênh lệch lãi tỷ giá hối đoái', keys: ['3.1. Chênh lệch lãi tỷ giá hối đoái đã và chưa thực hiện'] },
            { code: '3.2', name: '3.2. Doanh thu cổ tức, lãi tiền gửi', keys: ['3.2. Doanh thu, dự thu cổ tức, lãi tiền gửi không cố định phát sinh trong kỳ'] },
            { code: '3.3', name: '3.3. Lãi bán, thanh lý các khoản đầu tư liên kết', keys: ['3.3. Lãi bán, thanh lý các khoản đầu tư vào công ty con, liên kết, liên doanh'] },
            { code: '3.4', name: '3.4. Doanh thu khác về đầu tư', keys: ['3.4. Doanh thu khác về đầu tư'] }
        ]
    },
    { code: 'CONG_DT_TC', name: 'Cộng doanh thu hoạt động tài chính (41->44)', isBold: true, keys: ['Cộng doanh thu hoạt động tài chính (41->44)'] },
    {
        code: 'IV_GRP', name: 'IV. CHI PHÍ TÀI CHÍNH', isBold: true,
        keys: ['Cộng chi phí tài chính (51->54)', 'IV. CHÍ PHÍ TÀI CHÍNH'],
        children: [
            { code: '4.1', name: '4.1. Chênh lệch lỗ tỷ giá hối đoái', keys: ['4.1. Chênh lệch lỗ tỷ giá hối đoái đã và chưa thưc hiện'] },
            { code: '4.2', name: '4.2. Chi phí lãi vay', keys: ['4.2. Chi phí lãi vay'] },
            { code: '4.3', name: '4.3. Lỗ bán, thanh lý các khoản đầu tư liên kết', keys: ['4.3. Lỗ bán, thanh lý các khoản đầu tư vào công ty con, liên kết, liên doanh'] },
            { code: '4.4', name: '4.4. Chi phí đầu tư khác', keys: ['4.4. Chi phí đầu tư khác'] }
        ]
    },
    { code: 'CONG_CP_TC', name: 'Cộng chi phí tài chính (51->54)', isBold: true, keys: ['Cộng chi phí tài chính (51->54)'] },
    { code: 'V', name: 'V. CHI PHÍ BÁN HÀNG', keys: ['V. CHI PHÍ BÁN HÀNG'], isBold: true },
    { code: 'VI', name: 'VI. CHI PHÍ QUẢN LÝ CÔNG TY CK', keys: ['VI. CHI PHÍ QUẢN LÝ CÔNG TY CHỨNG KHOÁN'], isBold: true },
    { code: 'VII', name: 'VII. KẾT QUẢ HOẠT ĐỘNG', keys: ['VII. KẾT QUẢ HOẠT ĐỘNG'], isBold: true },
    {
        code: 'VIII_GRP', name: 'VIII. THU NHẬP KHÁC VÀ CHI PHÍ KHÁC', isBold: true,
        keys: ['VIII. THU NHẬP KHÁC VÀ CHI PHÍ KHÁC'],
        children: [
            { code: '8.1', name: '8.1. Thu nhập khác', keys: ['8.1. Thu nhập khác'] },
            { code: '8.2', name: '8.2. Chi phí khác', keys: ['8.2. Chi phí khác'] }
        ]
    },
    { code: 'CONG_KQ_KHAC', name: 'Cộng kết quả hoạt động khác', isBold: true, keys: ['Cộng kết quả hoạt động khác'] },
    { code: 'LAI_LO_LK', name: 'Lãi/lỗ từ công ty liên doanh, liên kết', keys: ['Lãi/lỗ từ công ty liên doanh, liên kết'] },
    {
        code: 'IX_GRP', name: 'IX. TỔNG LỢI NHUẬN KẾ TOÁN TRƯỚC THUẾ', isBold: true,
        keys: ['IX. TỔNG LỢI NHUẬN KẾ TOÁN TRƯỚC THUẾ'],
        children: [
            { code: '9.1', name: '9.1. Lợi nhuận đã thực hiện', keys: ['9.1. Lợi nhuận đã thực hiện'] },
            { code: '9.2', name: '9.2. Lợi nhuận chưa thực hiện', keys: ['9.2. Lợi nhuận chưa thực hiện'] }
        ]
    },
    {
        code: 'X_GRP', name: 'X. CHI PHÍ THUẾ THU NHẬP DOANH NGHIỆP', isBold: true,
        keys: ['X. CHI PHÍ THUẾ THU NHẬP DOANH NGHIỆP'],
        children: [
            { code: '10.1', name: '10.1. Chi phí thuế TNDN hiện hành', keys: ['10.1. Chi phí thuế TNDN hiện hành'] },
            { code: '10.2', name: '10.2. Chi phí thuế TNDN hoãn lại', keys: ['10.2. Chi phí thuế TNDN hoãn lại'] }
        ]
    },
    {
        code: 'XI_GRP', name: 'XI. LỢI NHUẬN KẾ TOÁN SAU THUẾ TNDN', isBold: true,
        keys: ['XI.  LỢI NHUẬN KẾ TOÁN SAU THUẾ TNDN'],
        children: [
            { code: '11.1', name: '11.1. LNST phân bổ cho chủ sở hữu', keys: ['11.1. Lợi nhuận sau thuế phân bổ cho chủ sở hữu'] },
            { code: '11.2', name: '11.2. LNST trích các Quỹ', keys: ['11.2. Lợi nhuận sau thuế trích các Quỹ (Quỹ dự trữ điều lệ, Quỹ Dự phòng tài chính và rủi ro nghề nghiệp theo quy định của Điều lệ Công ty là %)'] },
            { code: '11.3', name: '11.3. LN thuần phân bổ cho CĐ không kiểm soát', keys: ['11.3.  Lợi nhuận thuần phân bổ cho  lợi ích cổ đông không kiểm soát'] }
        ]
    },
    {
        code: 'XII_GRP', name: 'XII. THU NHẬP (LỖ) TOÀN DIỆN KHÁC', isBold: true,
        keys: ['XII. THU NHẬP (LỖ) TOÀN DIỆN KHÁC SAU THUẾ TNDN'],
        children: [
            { code: '12.1', name: '12.1. Lãi/(Lỗ) từ đánh giá lại HTM', keys: ['12.1. Lãi/(Lỗ) từ đánh giá lại các khoản đầu tư giữ đến ngày đáo hạn'] },
            { code: '12.2', name: '12.2. Lãi/(Lỗ) từ đánh giá lại AFS', keys: ['12.2.Lãi/(Lỗ) từ đánh giá lại các tài sản tài chính sẵn sàng để bán'] },
            { code: '12.3', name: '12.3. Lãi (lỗ) toàn diện khác từ đầu tư con, liên kết', keys: ['12.3. Lãi (lỗ) toàn diện khác được chia từ hoạt động đầu tư vào công ty con, đầu tư liên kết, liên doanh'] },
            { code: '12.4', name: '12.4. Lãi/(Lỗ) từ đánh giá lại phái sinh', keys: ['12.4. Lãi/(Lỗ) từ đánh giá lại các công cụ tài chính phái sinh'] },
            { code: '12.5', name: '12.5. Lãi/(lỗ) chênh lệch tỷ giá hoạt động nước ngoài', keys: ['12.5. Lãi/(lỗ) chênh lệch tỷ giá của hoạt động tại nước ngoài'] },
            { code: '12.6', name: '12.6. Lãi, lỗ từ đầu tư con liên kết chưa chia', keys: ['12.6. Lãi, lỗ từ các khoản đầu tư vào công ty con. Công ty liên kết, liên doanh chưa chia'] },
            { code: '12.7', name: '12.7. Lãi, lỗ đánh giá công cụ phái sinh', keys: ['12.7. Lãi, lỗ đánh giá công cụ phái sinh'] },
            { code: '12.8', name: '12.8. Lãi, lỗ đánh giá lại TSCĐ theo giá hợp lý', keys: ['12.8. Lãi, lỗ đánh giá lại tài sản cố định theo mô hình giá trị hợp lý'] }
        ]
    },
    { code: 'TND_ALL', name: 'Tổng thu nhập toàn diện', keys: ['Tổng thu nhập toàn diện'], isBold: true },
    { code: 'TND_CSH', name: 'Thu nhập toàn diện phân bổ cho chủ sở hữu', keys: ['Thu nhập toàn diện phân bổ cho chủ sở hữu'] },
    { code: 'TND_NCI', name: 'Thu nhập toàn diện phân bổ cho CĐ không nắm quyền kiểm soát', keys: ['Thu nhập toàn diện phân bổ cho cổ đông không nắm quyền kiểm soát'] },
    {
        code: 'XIII_GRP', name: 'XIII. THU NHẬP THUẦN TRÊN CỔ PHIẾU', isBold: true,
        keys: ['XIII. THU NHẬP THUẦN TRÊN CỔ PHIẾU PHỔ THÔNG'],
        children: [
            { code: '13.1', name: '13.1. Lãi cơ bản trên cổ phiếu', keys: ['13.1.Lãi cơ bản trên cổ phiếu (Đồng/1 cổ phiếu) (VNÐ)'] },
            { code: '13.2', name: '13.2. Thu nhập pha loãng trên cổ phiếu', keys: ['13.2.Thu nhập pha loãng trên cổ phiếu (Đồng/1 cổ phiếu)'] }
        ]
    }
];




interface VASIncomeStatementProps {
    symbol: string | null;
}

const VASIncomeStatement: React.FC<VASIncomeStatementProps> = ({ symbol }) => {
    const [loading, setLoading] = useState(false);
    const [period, setPeriod] = useState<'year' | 'quarter'>('quarter');
    const [rawRecords, setRawRecords] = useState<any[]>([]);
    const [chartType, setChartType] = useState<'line' | 'bar' | 'stack'>('line');
    const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['Doanh thu thuần về bán hàng và cung cấp dịch vụ']);
    const [metricAxes, setMetricAxes] = useState<Record<string, number>>({});
    const [metricTypes, setMetricTypes] = useState<Record<string, 'line' | 'bar' | 'stack'>>({});
    const [metricColors, setMetricColors] = useState<Record<string, string>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [industry, setIndustry] = useState<string>('');
    const [isExpanded, setIsExpanded] = useState(false);

    const currentStructure = useMemo(() => {
        const ind = industry.toLowerCase();
        if (ind.includes('ngân hàng')) return BANK_INCOME_STRUCTURE;
        if (ind.includes('dịch vụ tài chính')) return SECURITIES_INCOME_STRUCTURE;
        return VAS_INCOME_STRUCTURE;
    }, [industry]);

    const COLORS = ['#1677ff', '#52c41a', '#f5222d', '#faad14', '#13c2c2', '#722ed1', '#eb2f96'];

    const { setNodeRef, isOver } = useDroppable({
        id: 'vas-income-chart-droppable',
    });

    useEffect(() => {
        if (symbol) fetchData();
    }, [symbol, period]);

    useEffect(() => {
        const handleGlobalDrop = (e: any) => {
            if (e.detail.overId === 'vas-income-chart-droppable') {
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
                    .eq('statement_type', 'income_statement')
                    .eq('period_type', period),
                supabase.from('stock_symbols')
                    .select('icb_name2')
                    .eq('symbol', symbol)
                    .single()
            ]);

            setIndustry(metaRes.data?.icb_name2 || '');

            const data = stmRes.data || [];
            if (stmRes.error) throw stmRes.error;

            // Xử lý làm sạch keys và parse data
            const processed = (data || []).flatMap(record => {
                const innerData = Array.isArray(record.data) ? record.data : [record.data];
                return innerData.map((d: any) => {
                    const cleanObj: any = {};
                    Object.keys(d).forEach((k: string) => {
                        const cleanKey = k.replace(/^_+/, '');
                        const val = d[k];
                        // Chuyển đổi string sang number nếu có thể, xử lý null
                        if (val === null || val === undefined || val === '') {
                            cleanObj[cleanKey] = 0;
                        } else if (typeof val === 'string') {
                            // Xóa dấu phẩy nếu là chuỗi định dạng số
                            const num = parseFloat(val.replace(/,/g, ''));
                            cleanObj[cleanKey] = isNaN(num) ? 0 : num;
                        } else {
                            cleanObj[cleanKey] = val;
                        }
                    });
                    return cleanObj;
                });
            });

            // Sắp xếp thời gian (Sort by Year, then Quarter if available)
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
                // 2. Specialized Case: EPS and Parent Profit
                if (item.code === 'EPS') {
                    const epsKey = allKeys.find(k => k.includes('Lãi cơ bản') || k.includes('EPS'));
                    if (epsKey) return record[epsKey];
                }
                if (item.code === '70') {
                    const mKey = allKeys.find(k => (k.includes('Lợi nhuận sau thuế') || k.includes('LNST')) && (k.includes('công ty mẹ') || k.includes('Công ty mẹ')));
                    if (mKey) return record[mKey];
                }
                // 3. Code match
                if (item.code && !isNaN(parseInt(item.code))) {
                    const codeMatch = allKeys.find(k => k.includes(`(${item.code})`) || k.startsWith(`${item.code}.`));
                    if (codeMatch) return record[codeMatch];
                }
                // 4. Fuzzy name match (strip numbering)
                const cleanName = item.name.toLowerCase().replace(/^[ivx]+\.\s*/, '').replace(/^\d+\.\s*/, '').replace(/^[a-d]\.\s*/, '').replace('- ', '').trim();
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

            // Standard VAS Calculations if missing
            if (!result['Doanh thu thuần về bán hàng và cung cấp dịch vụ'] || result['Doanh thu thuần về bán hàng và cung cấp dịch vụ'] === 0) {
                const dt = result['Doanh thu bán hàng và cung cấp dịch vụ'] || 0;
                const gt = result['Các khoản giảm trừ doanh thu'] || 0;
                result['Doanh thu thuần về bán hàng và cung cấp dịch vụ'] = dt - gt;
            }
            if (!result['Lợi nhuận gộp về bán hàng và cung cấp dịch vụ'] || result['Lợi nhuận gộp về bán hàng và cung cấp dịch vụ'] === 0) {
                const dtt = result['Doanh thu thuần về bán hàng và cung cấp dịch vụ'] || 0;
                const gv = result['Giá vốn hàng bán'] || 0;
                result['Lợi nhuận gộp về bán hàng và cung cấp dịch vụ'] = dtt - gv;
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

    const displayPeriods = useMemo(() => processedData.map((d: any) => d.periodLabel), [processedData]);

    const formatValue = (val: any, isEPS = false) => {
        if (val === null || val === undefined || val === 0) return '-';
        if (typeof val !== 'number') return val;

        // EPS GIỮ NGUYÊN ĐỊNH DẠNG (VND)
        if (isEPS) {
            return new Intl.NumberFormat('en-US').format(val);
        }

        // Đơn vị Tỷ đồng (Billion VND)
        const inBillions = val / 1e9;
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: Math.abs(inBillions) < 10 ? 2 : 1,
            maximumFractionDigits: 2
        }).format(inBillions);
    };

    // --- CHART CONFIG ---
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
                        const isEPS = p.seriesName.includes('EPS');
                        const isRatio = p.seriesName.toLowerCase().includes('tỷ lệ') || p.seriesName.toLowerCase().includes('biên');
                        let valText = '';
                        if (isEPS) valText = p.value.toLocaleString();
                        else if (isRatio) valText = p.value.toFixed(2) + '%';
                        else valText = (p.value / 1e9).toFixed(2) + ' tỷ';

                        res += `<div style="display: flex; justify-content: space-between; gap: 20px; font-size: 12px; margin-bottom: 2px;">
                                    <span style="display: flex; align-items: center; gap: 6px;">${p.marker} ${p.seriesName}</span>
                                    <span style="font-weight: bold; color: #fff">${valText}</span>
                                </div>`;
                    });
                    return res;
                }
            },
            legend: {
                show: false // Tắt legend mặc định vì đã có Tags ở dưới
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
                    axisLabel: { color: '#848e9c', fontSize: 10, formatter: (value: number) => (value / 1e9).toLocaleString() }
                },
                {
                    type: 'value',
                    name: 'VND / %',
                    splitLine: { show: false },
                    axisLabel: { color: '#1677ff', fontSize: 10, formatter: (value: number) => value.toLocaleString() }
                }
            ],
            series: selectedMetrics.map((m, idx) => {
                const isEPS = m.includes('EPS') || m.toLowerCase().includes('tỷ lệ') || m.toLowerCase().includes('biên');
                const color = metricColors[m] || COLORS[idx % COLORS.length];
                const axisIndex = metricAxes[m] !== undefined ? metricAxes[m] : (isEPS ? 1 : 0);
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
        setSelectedMetrics(['Doanh thu thuần về bán hàng và cung cấp dịch vụ']);
        setChartType('line');
        setMetricAxes({});
        setMetricTypes({});
        setMetricColors({});
    };

    const updateMetricAxis = (metric: string, axis: number) => setMetricAxes(prev => ({ ...prev, [metric]: axis }));
    const updateMetricType = (metric: string, type: 'line' | 'bar' | 'stack') => setMetricTypes(prev => ({ ...prev, [metric]: type }));
    const updateMetricColor = (metric: string, color: string) => setMetricColors(prev => ({ ...prev, [metric]: color }));


    // --- TABLE COLUMNS ---
    const columns = [
        {
            title: <div className="text-[10px] text-gray-500">CHỈ TIÊU (TỶ VNĐ)</div>,
            dataIndex: 'name',
            key: 'name',
            fixed: 'left',
            width: 360,
            render: (text: string, record: any) => (
                <span className={`inline-block align-middle ${record.isBold ? 'font-bold' : ''} text-[10px] whitespace-nowrap overflow-hidden text-ellipsis`}>
                    {text}
                </span>
            )
        },
        ...displayPeriods.map(p => ({
            title: p,
            dataIndex: p,
            key: p,
            align: 'right',
            width: 80, // Narrower columns
            render: (_: any, record: any) => {
                const val = processedData.find(d => d.periodLabel === p)?.[record.name];
                const isEPS = record.code === 'EPS';
                return <span className={`${record.isBold ? 'font-bold' : ''}`}>{formatValue(val, isEPS)}</span>;
            }
        }))
    ];

    if (loading && rawRecords.length === 0) return <div className="h-64 flex items-center justify-center"><Spin /></div>;

    return (
        <div className="flex flex-col gap-4">
            {/* --- VISUALIZATION BOX --- */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* CHART AREA */}
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

                {/* SIDEBAR METRICS */}
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
                                    .filter(v => v.code !== '23' && v.name.toLowerCase().includes(searchQuery.toLowerCase()))
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

            {/* --- DATA TABLE --- */}
            <Card
                className="border-none bg-[#0b0e11] shadow-2xl"
                title={
                    <div className="flex justify-between items-center w-full">
                        <Space split={<Divider type="vertical" className="bg-gray-700" />}>
                            <span className="text-white text-lg font-bold">CHUẨN VAS - {symbol}</span>
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
                            <Tooltip title="Đơn vị: VND. Dữ liệu đã được chuẩn hóa theo Thông tư 200/2014/TT-BTC">
                                <Info size={16} className="text-gray-500 cursor-help" />
                            </Tooltip>
                        </Space>
                    </div>
                }
            >
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
                            <span className="text-white text-lg font-bold">KẾT QUẢ KINH DOANH (VAS) - {symbol}</span>
                            <Radio.Group value={period} onChange={e => setPeriod(e.target.value)} buttonStyle="solid" size="small">
                                <Radio.Button value="year">NĂM</Radio.Button>
                                <Radio.Button value="quarter">QUÝ</Radio.Button>
                            </Radio.Group>
                        </Space>
                        <Tooltip title="Đơn vị: VND. Chuẩn Thông tư 200.">
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

export default VASIncomeStatement;
