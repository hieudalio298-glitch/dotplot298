import React, { useEffect, useState, useMemo } from 'react';
import { Table, Radio, Card, Empty, Spin, Checkbox, Space, Divider, Tooltip, Button, Dropdown, Input, Modal, Slider, Popover } from 'antd';
import { Activity, BarChart3, TrendingUp, Info, ChevronRight, ChevronDown, RefreshCw, LineChart, BarChart, Layers, Trash2, Settings2, Maximize2, Minimize2, Settings } from 'lucide-react';
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
                    { code: '122', name: '2. Dự phòng giảm giá chứng khoán kinh doanh (*)', keys: ['Dự phòng giảm giá chứng khoán kinh doanh', '122. Dự phòng giảm giá chứng khoán kinh doanh'] },
                    { code: '123', name: '3. Đầu tư nắm giữ đến ngày đáo hạn', keys: ['Đầu tư nắm giữ đến ngày đáo hạn', '123. Đầu tư nắm giữ đến ngày đáo hạn'] }
                ]
            },
            {
                code: '130', name: 'III. Các khoản phải thu ngắn hạn', isBold: true,
                keys: ['Accounts receivable', 'Short-term receivables', '130. Các khoản phải thu ngắn hạn', 'Các khoản phải thu ngắn hạn'],
                children: [
                    { code: '131', name: '1. Phải thu ngắn hạn của khách hàng', keys: ['Phải thu ngắn hạn của khách hàng', '131. Phải thu ngắn hạn của khách hàng'] },
                    { code: '132', name: '2. Trả trước cho người bán ngắn hạn', keys: ['Trả trước cho người bán ngắn hạn', '132. Trả trước cho người bán ngắn hạn'] },
                    { code: '133', name: '3. Phải thu nội bộ ngắn hạn', keys: ['Phải thu nội bộ ngắn hạn', '133. Phải thu nội bộ ngắn hạn'] },
                    { code: '134', name: '4. Phải thu theo tiến độ kế hoạch hợp đồng xây dựng', keys: ['Phải thu theo tiến độ kế hoạch hợp đồng xây dựng', '134. Phải thu theo tiến độ kế hoạch hợp đồng xây dựng'] },
                    { code: '135', name: '5. Phải thu về cho vay ngắn hạn', keys: ['Phải thu về cho vay ngắn hạn', '135. Phải thu về cho vay ngắn hạn'] },
                    { code: '136', name: '6. Phải thu ngắn hạn khác', keys: ['Phải thu ngắn hạn khác', '136. Phải thu ngắn hạn khác'] },
                    { code: '137', name: '7. Dự phòng phải thu ngắn hạn khó đòi (*)', keys: ['Dự phòng phải thu ngắn hạn khó đòi', '137. Dự phòng phải thu ngắn hạn khó đòi'] },
                    { code: '139', name: '8. Tài sản thiếu chờ xử lý', keys: ['Tài sản thiếu chờ xử lý', '139. Tài sản thiếu chờ xử lý'] }
                ]
            },
            {
                code: '140', name: 'IV. Hàng tồn kho', isBold: true,
                keys: ['Inventories', '140. Hàng tồn kho', 'Hàng tồn kho', 'Hàng tồn kho, ròng'],
                children: [
                    { code: '141', name: '1. Hàng tồn kho', keys: ['Hàng tồn kho', '141. Hàng tồn kho'] },
                    { code: '149', name: '2. Dự phòng giảm giá hàng tồn kho (*)', keys: ['Dự phòng giảm giá hàng tồn kho', '149. Dự phòng giảm giá hàng tồn kho'] }
                ]
            },
            {
                code: '150', name: 'V. Tài sản ngắn hạn khác', isBold: true,
                keys: ['Other current assets', '150. Tài sản ngắn hạn khác', 'TÀI SẢN NGẮN HẠN KHÁC'],
                children: [
                    { code: '151', name: '1. Chi phí trả trước ngắn hạn', keys: ['Chi phí trả trước ngắn hạn', '151. Chi phí trả trước ngắn hạn'] },
                    { code: '152', name: '2. Thuế GTGT được khấu trừ', keys: ['Thuế GTGT được khấu trừ', '152. Thuế GTGT được khấu trừ'] },
                    { code: '153', name: '3. Thuế và các khoản khác phải thu của nhà nước', keys: ['Thuế và các khoản khác phải thu của nhà nước', '153. Thuế và các khoản khác phải thu của nhà nước'] },
                    { code: '154', name: '4. Giao dịch mua bán lại trái phiếu chính phủ', keys: ['Giao dịch mua bán lại trái phiếu chính phủ', '154. Giao dịch mua bán lại trái phiếu chính phủ'] },
                    { code: '155', name: '5. Tài sản ngắn hạn khác', keys: ['Tài sản ngắn hạn khác', '155. Tài sản ngắn hạn khác'] }
                ]
            }
        ]
    },
    {
        code: '200', name: 'B. TÀI SẢN DÀI HẠN', isBold: true,
        keys: ['LONG-TERM ASSETS', '200. TÀI SẢN DÀI HẠN', 'TÀI SẢN DÀI HẠN', 'B- TÀI SẢN DÀI HẠN'],
        children: [
            {
                code: '210', name: 'I. Các khoản phải thu dài hạn', isBold: true,
                keys: ['Long-term receivables', '210. Các khoản phải thu dài hạn'],
                children: [
                    { code: '211', name: '1. Phải thu dài hạn của khách hàng', keys: ['Phải thu dài hạn của khách hàng', '211. Phải thu dài hạn của khách hàng'] },
                    { code: '212', name: '2. Trả trước cho người bán dài hạn', keys: ['Trả trước cho người bán dài hạn', '212. Trả trước cho người bán dài hạn'] },
                    { code: '213', name: '3. Vốn kinh doanh ở các đơn vị trực thuộc', keys: ['Vốn kinh doanh ở các đơn vị trực thuộc', '213. Vốn kinh doanh ở các đơn vị trực thuộc'] },
                    { code: '214', name: '4.  Phải thu nội bộ dài hạn', keys: ['Phải thu nội bộ dài hạn', '214. Phải thu nội bộ dài hạn'] },
                    { code: '215', name: '5. Phải thu về cho vay dài hạn', keys: ['Phải thu về cho vay dài hạn', '215. Phải thu về cho vay dài hạn'] },
                    { code: '216', name: '6. Phải thu dài hạn khác', keys: ['Phải thu dài hạn khác', '216. Phải thu dài hạn khác'] },
                    { code: '219', name: '7. Dự phòng phải thu dài hạn khó đòi (*)', keys: ['Dự phòng phải thu dài hạn khó đòi', '219. Dự phòng phải thu dài hạn khó đòi'] }
                ]
            },
            {
                code: '220', name: 'II. Tài sản cố định', isBold: true,
                keys: ['Fixed assets', '220. Tài sản cố định', 'TÀI SẢN CỐ ĐỊNH'],
                children: [
                    {
                        code: '221', name: '1. Tài sản cố định hữu hình', keys: ['Tài sản cố định hữu hình', '221. Tài sản cố định hữu hình'],
                        children: [
                            { code: '222', name: '- Nguyên giá', keys: ['Nguyên giá', '222. Nguyên giá TSCĐ', '222. Nguyên giá'] },
                            { code: '223', name: '- Giá trị hao mòn lũy kế (*)', keys: ['Giá trị hao mòn lũy kế', '223. Giá trị hao mòn lũy kế TSCĐ', '223. Giá trị hao mòn lũy kế'] }
                        ]
                    },
                    { code: '224', name: '2. Tài sản cố định thuê tài chính', keys: ['Tài sản cố định thuê tài chính', '224. Tài sản cố định thuê tài chính'] },
                    {
                        code: '227', name: '3. Tài sản cố định vô hình', keys: ['Tài sản cố định vô hình', '227. Tài sản cố định vô hình'],
                        children: [
                            { code: '228', name: '- Nguyên giá', keys: ['228. Nguyên giá (TSCĐVH)', 'Nguyên giá (Tài sản cố định vô hình)'] },
                            { code: '229', name: '- Giá trị hao mòn lũy kế (*)', keys: ['229. Giá trị hao mòn lũy kế (TSCĐVH)', 'Giá trị hao mòn lũy kế (Tài sản cố định vô hình)'] }
                        ]
                    }
                ]
            },
            {
                code: '230', name: 'III. Bất động sản đầu tư', isBold: true, keys: ['Investment properties', '230. Bất động sản đầu tư', 'Bất động sản đầu tư'],
                children: [
                    { code: '231', name: '- Nguyên giá', keys: ['231. Nguyên giá (BĐSĐT)', 'Nguyên giá (Bất động sản đầu tư)'] },
                    { code: '232', name: '- Giá trị hao mòn lũy kế (*)', keys: ['232. Giá trị hao mòn lũy kế (BĐSĐT)', 'Giá trị hao mòn lũy kế (Bất động sản đầu tư)'] }
                ]
            },
            {
                code: '240', name: 'IV. Tài sản dở dang dài hạn', isBold: true, keys: ['Long-term work in progress', '241. Tài sản dở dang dài hạn'],
                children: [
                    { code: '241', name: '1. Chi phí sản xuất, kinh doanh dở dang dài hạn', keys: ['Chi phí sản xuất, kinh doanh dở dang dài hạn', '241. Chi phí sản xuất, kinh doanh dở dang dài hạn'] },
                    { code: '242', name: '2. Chi phí xây dựng cơ bản dở dang', keys: ['Chi phí xây dựng cơ bản dở dang', '242. Chi phí xây dựng cơ bản dở dang'] }
                ]
            },
            {
                code: '250', name: 'V. Đầu tư tài chính dài hạn', isBold: true, keys: ['Long-term investments', '250. Đầu tư tài chính dài hạn', 'Đầu tư tài chính dài hạn'],
                children: [
                    { code: '251', name: '1. Đầu tư vào công ty con', keys: ['Đầu tư vào công ty con', '251. Đầu tư vào công ty con'] },
                    { code: '252', name: '2. Đầu tư vào công ty liên kết. liên doanh', keys: ['Đầu tư vào công ty liên kết, liên doanh', '252. Đầu tư vào công ty liên kết, liên doanh'] },
                    { code: '253', name: '3. Đầu tư góp vốn vào đơn vị khác', keys: ['Đầu tư góp vốn vào đơn vị khác', '253. Đầu tư góp vốn vào đơn vị khác'] },
                    { code: '254', name: '4. Dự phòng đầu tư tài chính dài hạn (*)', keys: ['Dự phòng đầu tư tài chính dài hạn', '254. Dự phòng đầu tư tài chính dài hạn'] },
                    { code: '255', name: '5. Đầu tư nắm giữ đến ngày đáo hạn', keys: ['Đầu tư nắm giữ đến ngày đáo hạn', '255. Đầu tư nắm giữ đến ngày đáo hạn'] },
                    { code: '258', name: '6. Đầu tư dài hạn khác', keys: ['Đầu tư dài hạn khác', '258. Đầu tư dài hạn khác'] }
                ]
            },
            {
                code: '260', name: 'VI. Tài sản dài hạn khác', isBold: true, keys: ['Other long-term assets', '260. Tài sản dài hạn khác'],
                children: [
                    { code: '261', name: '1. Chi phí trả trước dài hạn', keys: ['Chi phí trả trước dài hạn', '261. Chi phí trả trước dài hạn'] },
                    { code: '262', name: '2. Tài sản thuế thu nhập hoãn lại', keys: ['Tài sản thuế thu nhập hoãn lại', '262. Tài sản thuế thu nhập hoãn lại'] },
                    { code: '263', name: '3. Thiết bị, vật tư, phụ tùng thay thế dài hạn', keys: ['Thiết bị, vật tư, phụ tùng thay thế dài hạn', '263. Thiết bị, vật tư, phụ tùng thay thế dài hạn'] },
                    { code: '268', name: '4. Tài sản dài hạn khác', keys: ['Tài sản dài hạn khác', '268. Tài sản dài hạn khác'] },
                    { code: '269', name: '5. Lợi thế thương mại', keys: ['Lợi thế thương mại', '269. Lợi thế thương mại'] }
                ]
            }
        ]
    },
    { code: 'total_assets', name: 'TỔNG CỘNG TÀI SẢN', isBold: true, keys: ['Total Assets', '270. TỔNG CỘNG TÀI SẢN', 'TỔNG CỘNG TÀI SẢN', 'TỔNG TÀI SẢN'] },
    {
        code: '300', name: 'A. NỢ PHẢI TRẢ', isBold: true,
        keys: ['Liabilities', '300. NỢ PHẢI TRẢ', 'NỢ PHẢI TRẢ', 'C- NỢ PHẢI TRẢ'],
        children: [
            {
                code: '310', name: 'I. Nợ ngắn hạn', isBold: true, keys: ['Current liabilities', '310. Nợ ngắn hạn', 'Nợ ngắn hạn'],
                children: [
                    { code: '311', name: '1. Phải trả người bán ngắn hạn', keys: ['Phải trả người bán ngắn hạn', '311. Phải trả người bán ngắn hạn'] },
                    { code: '312', name: '2. Người mua trả tiền trước ngắn hạn', keys: ['Người mua trả tiền trước ngắn hạn', '312. Người mua trả tiền trước ngắn hạn'] },
                    { code: '313', name: '3. Thuế và các khoản phải nộp Nhà nước', keys: ['Thuế và các khoản phải nộp Nhà nước', '313. Thuế và các khoản phải nộp Nhà nước'] },
                    { code: '314', name: '4. Phải trả người lao động', keys: ['Phải trả người lao động', '314. Phải trả người lao động'] },
                    { code: '315', name: '5. Chi phí phải trả ngắn hạn', keys: ['Chi phí phải trả ngắn hạn', '315. Chi phí phải trả ngắn hạn'] },
                    { code: '316', name: '6. Phải trả nội bộ ngắn hạn', keys: ['Phải trả nội bộ ngắn hạn', '316. Phải trả nội bộ ngắn hạn'] },
                    { code: '317', name: '7. Phải trả theo tiến độ kế hoạch hợp đồng xây dựng', keys: ['Phải trả theo tiến độ kế hoạch hợp đồng xây dựng', '317. Phải trả theo tiến độ kế hoạch hợp đồng xây dựng'] },
                    { code: '318', name: '8. Doanh thu chưa thực hiện ngắn hạn', keys: ['Doanh thu chưa thực hiện ngắn hạn', '318. Doanh thu chưa thực hiện ngắn hạn'] },
                    { code: '319', name: '9. Phải trả ngắn hạn khác', keys: ['Phải trả ngắn hạn khác', '319. Phải trả ngắn hạn khác'] },
                    { code: '320', name: '10. Vay và nợ thuê tài chính ngắn hạn', keys: ['Vay và nợ thuê tài chính ngắn hạn', '320. Vay và nợ thuê tài chính ngắn hạn'] },
                    { code: '321', name: '11. Dự phòng phải trả ngắn hạn', keys: ['Dự phòng phải trả ngắn hạn', '321. Dự phòng phải trả ngắn hạn'] },
                    { code: '322', name: '12. Quỹ khen thưởng, phúc lợi', keys: ['Quỹ khen thưởng, phúc lợi', '322. Quỹ khen thưởng, phúc lợi'] },
                    { code: '323', name: '13. Quỹ bình ổn giá', keys: ['Quỹ bình ổn giá', '323. Quỹ bình ổn giá'] },
                    { code: '324', name: '14. Giao dịch mua bán lại trái phiếu Chính phủ', keys: ['Giao dịch mua bán lại trái phiếu Chính phủ', '324. Giao dịch mua bán lại trái phiếu Chính phủ'] }
                ]
            },
            {
                code: '330', name: 'II. Nợ dài hạn', isBold: true, keys: ['Long-term liabilities', 'Non-current liabilities', '330. Nợ dài hạn', 'Nợ dài hạn'],
                children: [
                    { code: '331', name: '1. Phải trả người bán dài hạn', keys: ['Phải trả người bán dài hạn', '331. Phải trả người bán dài hạn'] },
                    { code: '332', name: '2. Người mua trả tiền trước dài hạn', keys: ['Người mua trả tiền trước dài hạn', '332. Người mua trả tiền trước dài hạn'] },
                    { code: '333', name: '3. Chi phí phải trả dài hạn', keys: ['Chi phí phải trả dài hạn', '333. Chi phí phải trả dài hạn'] },
                    { code: '334', name: '4. Phải trả nội bộ về vốn kinh doanh', keys: ['Phải trả nội bộ về vốn kinh doanh', '334. Phải trả nội bộ về vốn kinh doanh'] },
                    { code: '335', name: '5. Phải trả nội bộ dài hạn', keys: ['Phải trả nội bộ dài hạn', '335. Phải trả nội bộ dài hạn'] },
                    { code: '336', name: '6. Doanh thu chưa thực hiện dài hạn', keys: ['Doanh thu chưa thực hiện dài hạn', '336. Doanh thu chưa thực hiện dài hạn'] },
                    { code: '337', name: '7. Phải trả dài hạn khác', keys: ['Phải trả dài hạn khác', '337. Phải trả dài hạn khác'] },
                    { code: '338', name: '8. Vay và nợ thuê tài chính dài hạn', keys: ['Vay và nợ thuê tài chính dài hạn', '338. Vay và nợ thuê tài chính dài hạn'] },
                    { code: '339', name: '9. Trái phiếu chuyển đổi', keys: ['Trái phiếu chuyển đổi', '339. Trái phiếu chuyển đổi'] },
                    { code: '340', name: '10. Cổ phiếu ưu đãi (Nợ)', keys: ['Cổ phiếu ưu đãi (Nợ)', '340. Cổ phiếu ưu đãi'] },
                    { code: '341', name: '11. Thuế thu nhập hoãn lại phải trả', keys: ['Thuế thu nhập hoãn lại phải trả', '341. Thuế thu nhập hoãn lại phải trả'] },
                    { code: '342', name: '12. Dự phòng phải trả dài hạn', keys: ['Dự phòng phải trả dài hạn', '342. Dự phòng phải trả dài hạn'] },
                    { code: '343', name: '13. Quỹ phát triển khoa học và công nghệ', keys: ['Quỹ phát triển khoa học và công nghệ', '343. Quỹ phát triển khoa học và công nghệ'] },
                    { code: '344', name: '14. Dự phòng trợ cấp mất việc làm', keys: ['Dự phòng trợ cấp mất việc làm', '344. Dự phòng trợ cấp mất việc làm'] }
                ]
            }
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
                    {
                        code: '411', name: '1. Vốn góp của chủ sở hữu', keys: ['Vốn đầu tư của chủ sở hữu', 'Vốn góp của chủ sở hữu', 'Vốn cổ phần'],
                        children: [
                            { code: '411a', name: '- Cổ phiếu phổ thông có quyền biểu quyết', keys: ['Cổ phiếu phổ thông có quyền biểu quyết', 'Cổ phiếu phổ thông'] },
                            { code: '411b', name: '- Cổ phiếu ưu đãi', keys: ['Cổ phiếu ưu đãi (Vốn)', 'Cổ phiếu ưu đãi'] }
                        ]
                    },
                    { code: '412', name: '2. Thặng dư vốn cổ phần', keys: ['Thặng dư vốn cổ phần', '412. Thặng dư vốn cổ phần'] },
                    { code: '413', name: '3. Quyền chọn chuyển đổi trái phiếu', keys: ['Quyền chọn chuyển đổi trái phiếu', '413. Quyền chọn chuyển đổi trái phiếu'] },
                    { code: '414', name: '4. Vốn khác của chủ sở hữu', keys: ['Vốn khác của chủ sở hữu', '414. Vốn khác của chủ sở hữu'] },
                    { code: '415', name: '5. Cổ phiếu quỹ (*)', keys: ['Cổ phiếu quỹ', '415. Cổ phiếu quỹ'] },
                    { code: '416', name: '6. Chênh lệch đánh giá lại tài sản', keys: ['Chênh lệch đánh giá lại tài sản', '416. Chênh lệch đánh giá lại tài sản'] },
                    { code: '417', name: '7. Chênh lệch tỷ giá hối đoái', keys: ['Chênh lệch tỷ giá hối đoái', '417. Chênh lệch tỷ giá hối đoái'] },
                    { code: '418', name: '8. Quỹ đầu tư phát triển', keys: ['Quỹ đầu tư phát triển', '418. Quỹ đầu tư phát triển'] },
                    { code: '419', name: '9. Quỹ hỗ trợ sắp xếp doanh nghiệp', keys: ['Quỹ hỗ trợ sắp xếp doanh nghiệp', '419. Quỹ hỗ trợ sắp xếp doanh nghiệp'] },
                    { code: '420', name: '10. Quỹ khác thuộc vốn chủ sở hữu', keys: ['Quỹ khác thuộc vốn chủ sở hữu', '420. Quỹ khác thuộc vốn chủ sở hữu'] },
                    {
                        code: '421', name: '11. Lợi nhuận sau thuế chưa phân phối', keys: ['Lợi nhuận sau thuế chưa phân phối', 'Lợi nhuận chưa phân phối'],
                        children: [
                            { code: '421a', name: '- LNST chưa phân phối lũy kế đến cuối kỳ trước', keys: ['LNST chưa phân phối lũy kế đến cuối kỳ trước', 'Lợi nhuận sau thuế chưa phân phối lũy kế đến cuối kỳ trước'] },
                            { code: '421b', name: '- LNST chưa phân phối kỳ này', keys: ['LNST chưa phân phối kỳ này', 'Lợi nhuận sau thuế chưa phân phối kỳ này'] }
                        ]
                    },
                    { code: '422', name: '12. Nguồn vốn đầu tư XDCB', keys: ['Nguồn vốn đầu tư XDCB', '422. Nguồn vốn đầu tư XDCB'] },
                    { code: '429', name: '13. Lợi ích cổ đông không kiểm soát', keys: ['Non-controlling interests', 'Lợi ích cổ đông không kiểm soát'] },
                    { code: '419_extra', name: '14. Quỹ dự phòng tài chính', keys: ['Quỹ dự phòng tài chính', '419. Quỹ dự phòng tài chính'] }
                ]
            },
            {
                code: '430', name: 'II. Nguồn kinh phí và quỹ khác', isBold: true,
                keys: ['Nguồn kinh phí và quỹ khác', '430. Nguồn kinh phí và quỹ khác'],
                children: [
                    { code: '431', name: '1. Nguồn kinh phí', keys: ['Nguồn kinh phí', '431. Nguồn kinh phí'] },
                    { code: '432', name: '2. Nguồn kinh phí đã hình thành TSCĐ', keys: ['Nguồn kinh phí đã hình thành TSCĐ', '432. Nguồn kinh phí đã hình thành TSCĐ'] }
                ]
            }
        ]
    },
    { code: '429_EXTRA', name: 'C. LỢI ÍCH CỔ ĐÔNG THIỂU SỐ', keys: ['Minority interest', 'Lợi ích của cổ đông thiểu số'] },
    { code: 'total_capital', name: 'TỔNG CỘNG NGUỒN VỐN', isBold: true, keys: ['440. TỔNG CỘNG NGUỒN VỐN', 'TỔNG CỘNG NGUỒN VỐN', 'Tổng cộng nguồn vốn'] },
    { code: 'gw_extra', name: 'VII. Lợi thế thương mại', keys: ['Goodwill', 'Lợi thế thương mại'] }
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
        code: '100', name: 'TÀI SẢN', isBold: true,
        keys: ['TÀI SẢN'],
        children: [
            {
                code: '110', name: 'A. TÀI SẢN NGẮN HẠN', isBold: true,
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
                            },
                            {
                                code: 'DT_TC_NH', name: 'Các khoản đầu tư tài chính ngắn hạn',
                                keys: ['Các khoản đầu tư tài chính ngắn hạn'],
                                children: [
                                    { code: 'DT_NH', name: '+Đầu tư ngắn hạn', keys: ['+Đầu tư ngắn hạn', 'Đầu tư ngắn hạn'] },
                                    { code: 'DT_NH_UT', name: '+Đầu tư ngắn hạn của người ủy thác Đầu tư', keys: ['+Đầu tư ngắn hạn của người ủy thác Đầu tư', 'Đầu tư ngắn hạn của người ủy thác Đầu tư'] },
                                    { code: 'DP_DT_NH', name: 'Dự phòng giảm giá đầu tư ngắn hạn', keys: ['Dự phòng giảm giá đầu tư ngắn hạn'] }
                                ]
                            },
                            { code: '2', name: '2. Các tài sản tài chính ghi nhận thông qua lãi lỗ (FVTPL)', keys: ['2. Các tài sản tài chính ghi nhận thông qua lãi lỗ (FVTPL)'] },
                            { code: '3', name: '3. Các khoản đầu tư nắm giữ đến ngày đáo hạn (HTM)', keys: ['3. Các khoản đầu tư nắm giữ đến ngày đáo hạn (HTM)'] },
                            { code: '4', name: '4. Các khoản cho vay', keys: ['4. Các khoản cho vay'] },
                            { code: '5', name: '5. Các tài sản tài chính sẵn sàn để bán (AFS)', keys: ['5. Các tài sản tài chính sẵn sàn để bán (AFS)'] },
                            { code: '6', name: '6. Dự phòng suy giảm giá trị tài sản tài chính và tài sản thế chấp', keys: ['6. Dự phòng suy giảm giá trị tài sản tài chính và tài sản thế chấp'] },
                            {
                                code: '7', name: '7. Các khoản phải thu ngắn hạn', isBold: true,
                                keys: ['7. Các khoản phải thu ngắn hạn'],
                                children: [
                                    { code: '7.1', name: '7.1. Phải thu bán các tài sản tài chính', keys: ['7.1. Phải thu bán các tài sản tài chính'] },
                                    {
                                        code: '7.2', name: '7.2. Phải thu và dự thu cổ tức, tiền lãi các tài sản tài chính',
                                        keys: ['7.2. Phải thu và dự thu cổ tức, tiền lãi các tài sản tài chính'],
                                        children: [
                                            { code: '7.2.1', name: '7.2.1. Phải thu cổ tức, tiền lãi đến ngày nhận', keys: ['7.2.1. Phải thu cổ tức, tiền lãi đến ngày nhận'] },
                                            { code: '7.2.1.sub', name: 'Trong đó: Phải thu khó đòi về cổ tức, tiền lãi đến ngày nhận nhưng chưa nhận được', keys: ['Trong đó: Phải thu khó đòi về cổ tức, tiền lãi đến ngày nhận nhưng chưa nhận được', 'Trong đó: Phải thu khó đòi về cổ tức, tiền lãi đến ngày nhận  nhưng chưa nhận được'] },
                                            { code: '7.2.2', name: '7.2.2. Dự thu cổ tức, tiền lãi chưa đến ngày nhận', keys: ['7.2.2. Dự thu cổ tức, tiền lãi chưa đến ngày nhận'] }
                                        ]
                                    },
                                    { code: 'TRA_TRUOC', name: 'Trả trước cho người bán', keys: ['Trả trước cho người bán'] },
                                    { code: '9', name: '9. Phải thu các dịch vụ CTCK cung cấp', keys: ['9. Phải thu các dịch vụ CTCK cung cấp'] },
                                    { code: 'PT_GDCK', name: 'Phải thu hoạt động giao dịch chứng khoán', keys: ['Phải thu hoạt động giao dịch chứng khoán'] },
                                    { code: '10', name: '10. Phải thu nội bộ ngắn hạn', keys: ['10. Phải thu nội bộ ngắn hạn'] },
                                    { code: '11', name: '11. Phải thu về lỗi giao dịch chứng khoán', keys: ['11. Phải thu về lỗi giao dịch chứng khoán'] },
                                    { code: '12', name: '12. Các khoản phải thu khác', keys: ['12. Các khoản phải thu khác'] },
                                    {
                                        code: '13', name: '13. Dự phòng suy giảm giá trị các khoản phải thu',
                                        keys: ['13. Dự phòng suy giảm giá trị các khoản phải thu'],
                                        children: [
                                            { code: 'DP_PT_KD', name: 'Dự phòng các khoản phải thu ngắn hạn khó đòi', keys: ['Dự phòng các khoản phải thu ngắn hạn khó đòi'] }
                                        ]
                                    },
                                    { code: 'PT_KH', name: 'Phải thu khách hàng', keys: ['Phải thu khách hàng'] }
                                ]
                            },
                        ]
                    },
                    {
                        code: 'HTK_GRP', name: 'Hàng tồn kho',
                        keys: ['Hàng tồn kho'],
                        children: [
                            { code: 'HTK_CT', name: 'Hàng tồn kho (chi tiết)', keys: ['Hàng tồn kho (chi tiết)'] },
                            { code: 'DP_HTK', name: 'Dự phòng giảm giá hàng tồn kho', keys: ['Dự phòng giảm giá hàng tồn kho'] }
                        ]
                    },
                    {
                        code: 'II', name: 'II. Tài sản ngắn hạn khác', isBold: true,
                        keys: ['II. Tài sản ngắn hạn khác'],
                        children: [
                            { code: '1_II', name: '1. Tạm ứng', keys: ['1. Tạm ứng'] },
                            { code: '2_II', name: '2. Vật tư văn phòng, công cụ, dụng cụ', keys: ['2. Vật tư văn phòng, công cụ, dụng cụ'] },
                            { code: '3_II', name: '3. Chi phí trả trước ngắn hạn', keys: ['3. Chi phí trả trước ngắn hạn'] },
                            { code: '4_II', name: '4. Cầm cố, thế chấp, ký quỹ, ký cược ngắn hạn', keys: ['4. Cầm cố, thế chấp, ký quỹ, ký cược ngắn hạn'] },
                            { code: '8_II', name: '8. Thuế GTGT còn được khấu trừ', keys: ['8. Thuế GTGT còn được khấu trừ'] },
                            { code: 'THUE_NN', name: 'Thuế và các khoản khác phải thu của nhà nước', keys: ['Thuế và các khoản khác phải thu của nhà nước'] },
                            { code: 'GD_TP', name: 'Giao dịch mua bán lại trái phiếu Chính phủ (TS)', keys: ['Giao dịch mua bán lại trái phiếu Chính phủ (TS)'] },
                            { code: '5_II', name: '5. Tài sản ngắn hạn khác', keys: ['5. Tài sản ngắn hạn khác'] },
                            { code: '6_II', name: '6. Dự phòng suy giảm giá trị tài sản ngắn hạn khác', keys: ['6. Dự phòng suy giảm giá trị tài sản ngắn hạn khác'] }
                        ]
                    }
                ]
            },
            {
                code: '200', name: 'B. TÀI SẢN DÀI HẠN', isBold: true,
                keys: ['B. TÀI SẢN DÀI HẠN', 'TÀI SẢN DÀI HẠN'],
                children: [
                    {
                        code: 'I_B', name: 'I. Tài sản tài chính dài hạn', isBold: true,
                        keys: ['I. Tài sản tài chính dài hạn'],
                        children: [
                            {
                                code: '1_I_B', name: '1. Các khoản phải thu dài hạn',
                                keys: ['1. Các khoản phải thu dài hạn'],
                                children: [
                                    { code: '1.1_I_B', name: '1.1. Phải thu dài hạn của khách hàng', keys: ['1.1. Phải thu dài hạn của khách hàng'] },
                                    { code: '1.2_I_B', name: '1.2. Vốn kinh doanh ở các đơn vị trực thuộc', keys: ['1.2. Vốn kinh doanh ở các đơn vị trực thuộc'] },
                                    { code: '1.3_I_B', name: '1.3.  Phải thu dài hạn nội bộ', keys: ['1.3.  Phải thu dài hạn nội bộ'] },
                                    { code: '1.4_I_B', name: '1.4. Phải thu dài hạn khác', keys: ['1.4. Phải thu dài hạn khác'] },
                                    { code: '1.5_I_B', name: '1.5. Dự phòng phải thu dài hạn khó đòi', keys: ['1.5. Dự phòng phải thu dài hạn khó đòi'] }
                                ]
                            },
                            {
                                code: '2_I_B', name: '2. Các khoản đầu tư', isBold: true,
                                keys: ['2. Các khoản đầu tư'],
                                children: [
                                    { code: '2.1_I_B', name: '2.1. Các khoản đầu tư nắm giữ đến ngày đáo hạn', keys: ['2.1. Các khoản đầu tư nắm giữ đến ngày đáo hạn'] },
                                    { code: '2.2_I_B', name: '2.2. Đầu tư vào công ty con', keys: ['2.2. Đầu tư vào công ty con'] },
                                    { code: '2.3_I_B', name: '2.3 Đầu tư vào công ty liên kết, liên doanh', keys: ['2.3 Đầu tư vào công ty liên kết, liên doanh'] },
                                    {
                                        code: '2.4_I_B', name: '2.4 Đầu tư chứng khoán dài hạn',
                                        keys: ['2.4 Đầu tư chứng khoán dài hạn'],
                                        children: [
                                            { code: 'sub1_2.4', name: '- Chứng khoán sẵn sàng để bán', keys: ['- Chứng khoán sẵn sàng để bán'] },
                                            { code: 'sub2_2.4', name: '- Chứng khoán nắm giữ đến ngày đáo hạn', keys: ['- Chứng khoán nắm giữ đến ngày đáo hạn'] }
                                        ]
                                    },
                                    { code: '2.5_I_B', name: '2.5 Đầu tư dài hạn khác', keys: ['2.5 Đầu tư dài hạn khác'] },
                                    { code: '2.6_I_B', name: '2.6 Dự phòng giảm giá đầu tư dài hạn', keys: ['2.6 Dự phòng giảm giá đầu tư dài hạn'] }
                                ]
                            }
                        ]
                    },
                    {
                        code: 'II_B', name: 'II. Tài sản cố định', isBold: true,
                        keys: ['II. Tài sản cố định'],
                        children: [
                            {
                                code: '1_II_B', name: '1. Tài sản cố định hữu hình',
                                keys: ['1. Tài sản cố định hữu hình'],
                                children: [
                                    { code: 'NG_HH', name: '- Nguyên giá', keys: ['- Nguyên giá', 'Nguyên giá'] },
                                    { code: 'HM_HH', name: '- Giá trị hao mòn lũy kế', keys: ['- Giá trị hao mòn lũy kế', 'Giá trị hao mòn lũy kế'] },
                                    { code: 'DG_HH', name: '- Đánh giá TSCĐHH theo giá trị hợp lý', keys: ['- Đánh giá TSCĐHH theo giá trị hợp lý'] }
                                ]
                            },
                            {
                                code: '2_II_B', name: '2. Tài sản cố định thuê tài chính',
                                keys: ['2. Tài sản cố định thuê tài chính'],
                                children: [
                                    { code: 'DG_TC', name: '- Đánh giá TSCĐTTC theo giá trị hợp lý', keys: ['- Đánh giá TSCĐTTC theo giá trị hợp lý'] }
                                ]
                            },
                            {
                                code: '3_II_B', name: '3. Tài sản cố định vô hình',
                                keys: ['3. Tài sản cố định vô hình'],
                                children: [
                                    { code: 'DG_VH', name: '- Đánh giá TSCĐVH theo giá trị hợp lý', keys: ['- Đánh giá TSCĐVH theo giá trị hợp lý'] }
                                ]
                            }
                        ]
                    },
                    {
                        code: 'III_B', name: 'III. Bất động sản đầu tư', isBold: true,
                        keys: ['III. Bất động sản đầu tư'],
                        children: [
                            { code: 'DG_BDS', name: '- Đánh giá BĐSĐT theo giá trị hợp lý', keys: ['- Đánh giá BĐSĐT theo giá trị hợp lý'] }
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
                            { code: '5_V_B', name: '5. Tài sản dài hạn khác', keys: ['5. Tài sản dài hạn khác'] },
                            { code: '6_V_B', name: '6. Lợi thế thương mại', keys: ['6. Lợi thế thương mại'] }
                        ]
                    },
                    { code: 'VI_B', name: 'VI. Dự phòng suy giảm giá trị tài sản dài hạn', keys: ['VI. Dự phòng suy giảm giá trị tài sản dài hạn'] }
                ]
            }
        ]
    },
    { code: '270', name: 'TỔNG CỘNG TÀI SẢN (270=100+200)', isBold: true, keys: ['TỔNG CỘNG TÀI SẢN (270=100+200)', 'TỔNG CỘNG TÀI SẢN'] },
    {
        code: 'NGUON_VON', name: 'NGUỒN VỐN', isBold: true, keys: ['NGUỒN VỐN'],
        children: [
            {
                code: '300', name: 'A. NỢ PHẢI TRẢ (300=310+340)', isBold: true,
                keys: ['A. NỢ PHẢI TRẢ (300=310+340)', 'NỢ PHẢI TRẢ'],
                children: [
                    {
                        code: 'I_N', name: 'I. Nợ ngắn hạn', isBold: true,
                        keys: ['I. Nợ ngắn hạn'],
                        children: [
                            {
                                code: '1_I_N', name: '1. Vay và nợ thuê tài chính ngắn hạn', isBold: true,
                                keys: ['1. Vay và nợ thuê tài chính ngắn hạn'],
                                children: [
                                    { code: '1.1_I_N', name: '1.1. Vay ngắn hạn', keys: ['1.1. Vay ngắn hạn'] },
                                    { code: '1.2_I_N', name: '1.2 Nợ thuê tài sản tài chính ngắn hạn', keys: ['1.2 Nợ thuê tài sản tài chính ngắn hạn'] }
                                ]
                            },
                            { code: '2_I_N', name: '2. Vay tài sản tài chính ngắn hạn', keys: ['2. Vay tài sản tài chính ngắn hạn'] },
                            { code: '3_I_N', name: '3. Trái phiếu chuyển đổi ngắn hạn', keys: ['3. Trái phiếu chuyển đổi ngắn hạn'] },
                            { code: '4_I_N', name: '4. Trái phiếu phát hành ngắn hạn', keys: ['4. Trái phiếu phát hành ngắn hạn'] },
                            { code: '5_I_N', name: '5. Vay quỹ hỗ trợ thanh toán', keys: ['5. Vay quỹ hỗ trợ thanh toán'] },
                            { code: '6_I_N', name: '6. Phải trả hoạt động giao dịch chứng khoán', keys: ['6. Phải trả hoạt động giao dịch chứng khoán'] },
                            { code: '7_I_N', name: '7. Phải trả về lỗi giao dịch các tài sản tài chính', keys: ['7. Phải trả về lỗi giao dịch các tài sản tài chính'] },
                            { code: '8_I_N', name: '8. Phải trả người bán ngắn hạn', keys: ['8. Phải trả người bán ngắn hạn'] },
                            { code: '9_I_N', name: '9. Người mua trả tiền trước ngắn hạn', keys: ['9. Người mua trả tiền trước ngắn hạn'] },
                            { code: '10_I_N', name: '10. Thuế và các khoản phải nộp Nhà nước', keys: ['10. Thuế và các khoản phải nộp Nhà nước'] },
                            { code: '11_I_N', name: '11. Phải trả người lao động', keys: ['11. Phải trả người lao động'] },
                            { code: '12_I_N', name: '12. Các khoản trích nộp phúc lợi nhân viên', keys: ['12. Các khoản trích nộp phúc lợi nhân viên'] },
                            { code: '13_I_N', name: '13. Chi phí phải trả ngắn hạn', keys: ['13. Chi phí phải trả ngắn hạn'] },
                            { code: '14_I_N', name: '14. Phải trả nội bộ ngắn hạn', keys: ['14. Phải trả nội bộ ngắn hạn'] },
                            { code: '15_I_N', name: '15. Doanh thu chưa thực hiện ngắn hạn', keys: ['15. Doanh thu chưa thực hiện ngắn hạn'] },
                            { code: '16_I_N', name: '16. Nhận ký quỹ, ký cược ngắn hạn', keys: ['16. Nhận ký quỹ, ký cược ngắn hạn'] },
                            { code: '17_I_N', name: '17. Các khoản phải trả, phải nộp khác ngắn hạn', keys: ['17. Các khoản phải trả, phải nộp khác ngắn hạn'] },
                            { code: 'PT_HO', name: 'Phải trả hộ cổ tức, gốc và lãi trái phiếu', keys: ['Phải trả hộ cổ tức, gốc và lãi trái phiếu'] },
                            { code: 'PT_TCPH', name: 'Phải trả tổ chức phát hành chứng khoán', keys: ['Phải trả tổ chức phát hành chứng khoán'] },
                            { code: '18_I_N', name: '18. Dự phòng phải trả ngắn hạn', keys: ['18. Dự phòng phải trả ngắn hạn'] },
                            { code: 'GD_TP_CP', name: 'Giao dịch mua bán lại trái phiếu chính phủ', keys: ['Giao dịch mua bán lại trái phiếu chính phủ'] },
                            { code: '19_I_N', name: '19. Quỹ khen thưởng phúc lợi', keys: ['19. Quỹ khen thưởng phúc lợi'] }
                        ]
                    },
                    {
                        code: 'II_N', name: 'II. Nợ dài hạn', isBold: true,
                        keys: ['II. Nợ dài hạn'],
                        children: [
                            {
                                code: '1_II_N', name: '1. Vay và nợ thuê tài chính dài hạn', isBold: true,
                                keys: ['1. Vay và nợ thuê tài chính dài hạn'],
                                children: [
                                    { code: '1.1_II_N', name: '1.1. Vay dài hạn', keys: ['1.1. Vay dài hạn'] },
                                    { code: '1.2_II_N', name: '1.2 Nợ thuê tài sản tài chính dài hạn', keys: ['1.2 Nợ thuê tài sản tài chính dài hạn'] }
                                ]
                            },
                            { code: '2_II_N', name: '2. Vay tài sản tài chính dài hạn', keys: ['2. Vay tài sản tài chính dài hạn'] },
                            { code: '3_II_N', name: '3. Trái phiếu chuyển đổi dài hạn', keys: ['3. Trái phiếu chuyển đổi dài hạn'] },
                            { code: '4_II_N', name: '4. Trái phiếu phát hành dài hạn', keys: ['4. Trái phiếu phát hành dài hạn'] },
                            { code: '5_II_N', name: '5. Phải trả người bán dài hạn', keys: ['5. Phải trả người bán dài hạn'] },
                            { code: '6_II_N', name: '6. Người mua trả tiền trước dài hạn', keys: ['6. Người mua trả tiền trước dài hạn'] },
                            { code: '7_II_N', name: '7. Chi phí phải trả dài hạn', keys: ['7. Chi phí phải trả dài hạn'] },
                            { code: '8_II_N', name: '8. Phải trả nội bộ dài hạn', keys: ['8. Phải trả nội bộ dài hạn'] },
                            { code: '9_II_N', name: '9. Doanh thu chưa thực hiện dài hạn', keys: ['9. Doanh thu chưa thực hiện dài hạn'] },
                            { code: '10_II_N', name: '10. Nhận ký quỹ, ký cược dài hạn', keys: ['10. Nhận ký quỹ, ký cược dài hạn'] },
                            { code: '11_II_N', name: '11. Phải trả, phải nộp khác dài hạn', keys: ['11. Phải trả, phải nộp khác dài hạn'] },
                            { code: 'VON_UT', name: 'Vốn nhận ủy thác đầu tư dài hạn', keys: ['Vốn nhận ủy thác đầu tư dài hạn'] },
                            { code: 'DP_TV', name: 'Dự phòng trợ cấp mất việc làm', keys: ['Dự phòng trợ cấp mất việc làm'] },
                            { code: '12_II_N', name: '12. Dự phòng phải trả dài hạn', keys: ['12. Dự phòng phải trả dài hạn'] },
                            { code: '13_II_N', name: '13. Dự phòng bồi thường thiệt hại cho nhà đầu tư', keys: ['13. Dự phòng bồi thường thiệt hại cho nhà đầu tư'] },
                            { code: '14_II_N', name: '14. Thuế thu nhập hoãn lại phải trả', keys: ['14. Thuế thu nhập hoãn lại phải trả'] },
                            { code: '15_II_N', name: '15. Quỹ phát triển khoa học và công nghệ', keys: ['15. Quỹ phát triển khoa học và công nghệ'] }
                        ]
                    }
                ]
            },
            {
                code: '400', name: 'B. VỐN CHỦ SỞ HỮU (400=410+420)', isBold: true,
                keys: ['B. VỐN CHỦ SỞ HỮU (400=410+420)', 'VỐN CHỦ SỞ HỮU'],
                children: [
                    {
                        code: 'I_CSH', name: 'I. Vốn chủ sở hữu', isBold: true,
                        keys: ['I. Vốn chủ sở hữu'],
                        children: [
                            {
                                code: '1_I_CSH', name: '1. Vốn đầu tư của chủ sở hữu', isBold: true,
                                keys: ['1. Vốn đầu tư của chủ sở hữu'],
                                children: [
                                    {
                                        code: '1.1_I_CSH', name: '1.1. Vốn góp của chủ sở hữu',
                                        keys: ['1.1. Vốn góp của chủ sở hữu'],
                                        children: [
                                            { code: 'a_CSH', name: 'a. Cổ phiếu phổ thông', keys: ['a. Cổ phiếu phổ thông'] },
                                            { code: 'b_CSH', name: 'b. Cổ phiếu ưu đãi', keys: ['b. Cổ phiếu ưu đãi'] }
                                        ]
                                    },
                                    { code: '1.2_I_CSH', name: '1.2. Thặng dư vốn cổ phần', keys: ['1.2. Thặng dư vốn cổ phần'] },
                                    { code: '1.3_I_CSH', name: '1.3. Quyền chọn chuyển đổi trái phiếu', keys: ['1.3. Quyền chọn chuyển đổi trái phiếu'] },
                                    { code: '1.4_I_CSH', name: '1.4. Vốn khác của chủ sở hữu', keys: ['1.4. Vốn khác của chủ sở hữu'] },
                                    { code: '1.5_I_CSH', name: '1.5. Cổ phiếu quỹ', keys: ['1.5. Cổ phiếu quỹ'] }
                                ]
                            },
                            { code: '2_I_CSH', name: '2. Chênh lệch đánh giá lại tài sản theo giá trị hợp lý', keys: ['2. Chênh lệch đánh giá lại tài sản theo giá trị hợp lý'] },
                            { code: '3_I_CSH', name: '3. Chênh lệch tỷ giá hối đoái', keys: ['3. Chênh lệch tỷ giá hối đoái'] },
                            { code: '4_I_CSH', name: '4. Quỹ dự trữ điều lệ', keys: ['4. Quỹ dự trữ điều lệ'] },
                            { code: 'QUY_DT', name: 'Quỹ đầu tư phát triển', keys: ['Quỹ đầu tư phát triển'] },
                            { code: '5_I_CSH', name: '5. Quỹ dự phòng tài chính và rủi ro nghề nghiệp', keys: ['5. Quỹ dự phòng tài chính và rủi ro nghề nghiệp'] },
                            { code: '6_I_CSH', name: '6. Quỹ khác thuộc vốn chủ sở hữu', keys: ['6. Quỹ khác thuộc vốn chủ sở hữu'] },
                            {
                                code: '7_I_CSH', name: '7. Lợi nhuận sau thuế chưa phân phối', isBold: true,
                                keys: ['7. Lợi nhuận sau thuế chưa phân phối'],
                                children: [
                                    { code: '7.1_I_CSH', name: '7.1. Lợi nhuận đã thực hiện', keys: ['7.1. Lợi nhuận đã thực hiện'] },
                                    { code: '7.2_I_CSH', name: '7.2. Lợi nhuận chưa thực hiện', keys: ['7.2. Lợi nhuận chưa thực hiện'] }
                                ]
                            },
                            { code: 'NV_XDCB', name: 'Nguồn vốn đầu tư XDCB', keys: ['Nguồn vốn đầu tư XDCB'] },
                            { code: 'QUY_HT', name: 'Quỹ hỗ trợ sắp xếp doanh nghiệp', keys: ['Quỹ hỗ trợ sắp xếp doanh nghiệp'] },
                            { code: '8_I_CSH', name: '8. Lợi ích cổ đông không nắm quyền kiểm soát', keys: ['8. Lợi ích cổ đông không nắm quyền kiểm soát'] }
                        ]
                    },
                    {
                        code: 'II_CSH', name: 'II. Nguồn kinh phí và quỹ khác', isBold: true,
                        keys: ['II. Nguồn kinh phí và quỹ khác'],
                        children: [
                            { code: '1_II_CSH', name: '1. Nguồn kinh phí', keys: ['1. Nguồn kinh phí'] },
                            { code: '2_II_CSH', name: '2. Nguồn kinh phí đã hình thành TSCĐ', keys: ['2. Nguồn kinh phí đã hình thành TSCĐ'] }
                        ]
                    }
                ]
            },
            { code: '440', name: 'TỔNG CỘNG NGUỒN VỐN  (440=300+400)', isBold: true, keys: ['TỔNG CỘNG NGUỒN VỐN  (440=300+400)', 'TỔNG CỘNG NGUỒN VỐN'] }
        ]
    },
    { code: 'LN_PP', name: 'LỢI NHUẬN ĐÃ PHÂN PHỐI CHO NHÀ ĐẦU TƯ', isBold: true, keys: ['LỢI NHUẬN ĐÃ PHÂN PHỐI CHO NHÀ ĐẦU TƯ'] },
    { code: '1_LN', name: '1. Lợi nhuận đã phân phối cho Nhà đầu tư trong năm', keys: ['1. Lợi nhuận đã phân phối cho Nhà đầu tư trong năm'] }
];

export const INSURANCE_BALANCE_STRUCTURE: any[] = [
    {
        code: '100', name: 'TÀI SẢN', isBold: true,
        keys: ['TÀI SẢN'],
        children: [
            {
                code: '110', name: 'A. TÀI SẢN NGẮN HẠN', isBold: true,
                keys: ['A. TÀI SẢN NGẮN HẠN', 'TÀI SẢN NGẮN HẠN'],
                children: [
                    {
                        code: '111', name: 'I. Tiền và các khoản tương đương tiền', isBold: true,
                        keys: ['I. Tiền và các khoản tương đương tiền', 'Tiền và các khoản tương đương tiền'],
                        children: [
                            { code: '111.1', name: '1. Tiền', keys: ['1. Tiền'] },
                            { code: '111.2', name: '2. Các khoản tương đương tiền', keys: ['2. Các khoản tương đương tiền'] }
                        ]
                    },
                    {
                        code: '112', name: 'II. Các khoản đầu tư tài chính ngắn hạn', isBold: true,
                        keys: ['II. Các khoản đầu tư tài chính ngắn hạn', 'Các khoản đầu tư tài chính ngắn hạn'],
                        children: [
                            { code: '112.1', name: '1. Chứng khoán kinh doanh', keys: ['1. Chứng khoán kinh doanh'] },
                            { code: '112.2', name: '2. Dự phòng giảm giá chứng khoán kinh doanh', keys: ['2. Dự phòng giảm giá chứng khoán kinh doanh'] },
                            { code: '112.3', name: '3. Đầu tư nắm giữ đến ngày đáo hạn', keys: ['3. Đầu tư nắm giữ đến ngày đáo hạn'] }
                        ]
                    },
                    {
                        code: '113', name: 'III. Các khoản phải thu ngắn hạn', isBold: true,
                        keys: ['III. Các khoản phải thu ngắn hạn', 'Các khoản phải thu ngắn hạn'],
                        children: [
                            { code: '113.1', name: '113.1. Phải thu khách hàng ngắn hạn', keys: ['1. Phải thu khách hàng ngắn hạn'] },
                            { code: '113.2', name: '113.2. Trả trước cho người bán ngắn hạn', keys: ['2. Trả trước cho người bán ngắn hạn'] },
                            { code: '113.3', name: '113.3. Phải thu về cho vay ngắn hạn', keys: ['3. Phải thu về cho vay ngắn hạn'] },
                            { code: '113.4', name: '113.4. Phải thu ngắn hạn khác', keys: ['4. Phải thu ngắn hạn khác'] },
                            { code: '113.5', name: '113.5. Dự phòng phải thu ngắn hạn khó đòi', keys: ['5. Dự phòng phải thu ngắn hạn khó đòi'] },
                            {
                                code: '113.6', name: '113.6. Phải thu hoạt động kinh doanh bảo hiểm', keys: ['Phải thu hoạt động kinh doanh bảo hiểm'],
                                children: [
                                    { code: '113.6.1', name: '- Phải thu của khách hàng là các tổ chức KDBH', keys: ['- Phải thu của khách hàng là các tổ chức KDBH', 'Phải thu của khách hàng là các tổ chức KDBH'] },
                                    { code: '113.6.2', name: '- Phải thu của các đối tượng khác', keys: ['- Phải thu của các đối tượng khác', 'Phải thu của các đối tượng khác'] },
                                    { code: '113.6.3', name: '- Dự phòng giảm giá phải thu khó đòi', keys: ['- Dự phòng giảm giá phải thu khó đòi', 'Dự phòng giảm giá phải thu khó đòi'] }
                                ]
                            }
                        ]
                    },
                    {
                        code: '114', name: 'IV. Hàng tồn kho', isBold: true,
                        keys: ['IV. Hàng tồn kho', 'Hàng tồn kho'],
                        children: [
                            { code: '114.1', name: '1. Hàng tồn kho', keys: ['1. Hàng tồn kho'] },
                            { code: '114.2', name: '2. Dự phòng giảm giá hàng tồn kho', keys: ['2. Dự phòng giảm giá hàng tồn kho'] }
                        ]
                    },
                    {
                        code: '115', name: 'V. Tài sản ngắn hạn khác', isBold: true,
                        keys: ['V. Tài sản ngắn hạn khác', 'Tài sản ngắn hạn khác'],
                        children: [
                            { code: '115.1', name: '1. Chi phí trả trước ngắn hạn', keys: ['1. Chi phí trả trước ngắn hạn'] },
                            { code: '115.2', name: '2. Thuế GTGT được khấu trừ', keys: ['2. Thuế GTGT được khấu trừ'] },
                            { code: '115.3', name: '3. Thuế và các khoản khác phải thu Nhà nước', keys: ['3. Thuế và các khoản khác phải thu Nhà nước'] },
                            { code: '115.4', name: '4. Tài sản ngắn hạn khác', keys: ['4. Tài sản ngắn hạn khác'] },
                            { code: '115.5', name: '5. Tài sản tái bảo hiểm', keys: ['5. Tài sản tái bảo hiểm', 'Tài sản tái bảo hiểm'] },
                            {
                                code: '115.5_sub', name: 'Tài sản tái bảo hiểm - Dự phòng bồi thường nhượng tái bảo hiểm',
                                keys: ['- Dự phòng bồi thường nhượng tái bảo hiểm', 'Dự phòng bồi thường nhượng tái bảo hiểm']
                            },
                            {
                                code: '115.5_sub2', name: 'Tài sản tái bảo hiểm - Dự phòng phí nhượng tái bảo hiểm',
                                keys: ['- Dự phòng phí nhượng tái bảo hiểm', 'Dự phòng phí nhượng tái bảo hiểm']
                            },
                            { code: '115.6', name: '6. Ký quỹ ký cược ngắn hạn', keys: ['6. Ký quỹ ký cược ngắn hạn'] }
                        ]
                    },
                ]
            },
            {
                code: '200', name: 'B. TÀI SẢN DÀI HẠN', isBold: true,
                keys: ['B. TÀI SẢN DÀI HẠN', 'TÀI SẢN DÀI HẠN'],
                children: [
                    {
                        code: '210', name: 'I. Các khoản phải thu dài hạn', isBold: true,
                        keys: ['I. Các khoản phải thu dài hạn', 'Các khoản phải thu dài hạn'],
                        children: [
                            { code: '210.1', name: '1. Phải thu khách hàng dài hạn', keys: ['1. Phải thu khách hàng dài hạn'] },
                            { code: '210.2', name: '2. Trả trước cho người bán dài hạn', keys: ['2. Trả trước cho người bán dài hạn'] },
                            { code: '210.3', name: '3. Vốn kinh doanh ở đơn vị trực thuộc', keys: ['3. Vốn kinh doanh ở đơn vị trực thuộc'] },
                            { code: '210.4', name: '4. Phải thu dài hạn khác', keys: ['4. Phải thu dài hạn khác'] },
                            { code: '210.5', name: '5. Dự phòng phải thu dài hạn khó đòi', keys: ['5. Dự phòng phải thu dài hạn khó đòi'] }
                        ]
                    },
                    {
                        code: '220', name: 'II. Tài sản cố định', isBold: true,
                        keys: ['II. Tài sản cố định', 'Tài sản cố định'],
                        children: [
                            {
                                code: '220.1', name: '1. Tài sản cố định hữu hình',
                                keys: ['1. Tài sản cố định hữu hình'],
                                children: [
                                    { code: '220.1.a', name: '- Nguyên giá', keys: ['- Nguyên giá', 'Nguyên giá'] },
                                    { code: '220.1.b', name: '- Giá trị hao mòn lũy kế', keys: ['- Giá trị hao mòn lũy kế', 'Giá trị hao mòn lũy kế'] }
                                ]
                            },
                            {
                                code: '220.2', name: '2. Tài sản cố định thuê tài chính',
                                keys: ['2. Tài sản cố định thuê tài chính'],
                                children: [
                                    { code: '220.2.a', name: '- Nguyên giá', keys: ['- Nguyên giá'] }, // Careful with duplicates, maybe context matters in lookup? The lookup logic matches exact key first, then fuzzy.
                                    { code: '220.2.b', name: '- Giá trị hao mòn lũy kế', keys: ['- Giá trị hao mòn lũy kế'] }
                                ]
                            },
                            {
                                code: '220.3', name: '3. Tài sản cố định vô hình',
                                keys: ['3. Tài sản cố định vô hình'],
                                children: [
                                    { code: '220.3.a', name: '- Nguyên giá', keys: ['- Nguyên giá'] },
                                    { code: '220.3.b', name: '- Giá trị hao mòn lũy kế', keys: ['- Giá trị hao mòn lũy kế'] }
                                ]
                            }
                        ]
                    },
                    {
                        code: '230', name: 'III. Bất động sản đầu tư', isBold: true,
                        keys: ['III. Bất động sản đầu tư', 'Bất động sản đầu tư'],
                        children: [
                            { code: '230.1', name: '- Nguyên giá', keys: ['- Nguyên giá'] },
                            { code: '230.2', name: '- Giá trị hao mòn lũy kế', keys: ['- Giá trị hao mòn lũy kế'] }
                        ]
                    },
                    {
                        code: '240', name: 'IV. Tài sản dở dang dài hạn', isBold: true,
                        keys: ['IV. Tài sản dở dang dài hạn', 'Tài sản dở dang dài hạn'],
                        children: [
                            { code: '240.1', name: '1. Chi phí sản xuất, kinh doanh dở dang dài hạn', keys: ['1. Chi phí sản xuất, kinh doanh dở dang dài hạn'] },
                            { code: '240.2', name: '2. Chi phí xây dựng cơ bản dở dang', keys: ['2. Chi phí xây dựng cơ bản dở dang'] }
                        ]
                    },
                    {
                        code: '250', name: 'V. Các khoản đầu tư tài chính dài hạn', isBold: true,
                        keys: ['V. Các khoản đầu tư tài chính dài hạn', 'Các khoản đầu tư tài chính dài hạn'],
                        children: [
                            { code: '250.1', name: '1. Đầu tư vào công ty con', keys: ['1. Đầu tư vào công ty con'] },
                            { code: '250.2', name: '2. Đầu tư vào công ty liên doanh, liên kết', keys: ['2. Đầu tư vào công ty liên doanh, liên kết'] },
                            { code: '250.3', name: '3. Đầu tư góp vốn vào đơn vị khác', keys: ['3. Đầu tư góp vốn vào đơn vị khác'] },
                            { code: '250.4', name: '4. Dự phòng đầu tư tài chính dài hạn', keys: ['4. Dự phòng đầu tư tài chính dài hạn'] },
                            { code: '250.5', name: '5. Đầu tư nắm giữ đến ngày đáo hạn', keys: ['5. Đầu tư nắm giữ đến ngày đáo hạn', 'Đầu tư nắm giữ đến ngày đáo hạn'] }
                        ]
                    },
                    {
                        code: '260', name: 'VI. Tài sản dài hạn khác', isBold: true,
                        keys: ['VI. Tài sản dài hạn khác', 'Tài sản dài hạn khác'],
                        children: [
                            { code: '260.1', name: '1. Chi phí trả trước dài hạn', keys: ['1. Chi phí trả trước dài hạn'] },
                            { code: '260.2', name: '2. Tài sản thuế thu nhập hoãn lại', keys: ['2. Tài sản thuế thu nhập hoãn lại'] },
                            { code: '260.3', name: '3. Thiết bị, vật tư, phụ tùng thay thế dài hạn', keys: ['3. Thiết bị, vật tư, phụ tùng thay thế dài hạn'] },
                            { code: '260.4', name: '4. Tài sản dài hạn khác', keys: ['4. Tài sản dài hạn khác'] },
                            { code: '260.5', name: '5. Ký quỹ ký cược dài hạn', keys: ['5. Ký quỹ ký cược dài hạn'] }
                        ]
                    }
                ]
            },
            { code: 'TOTAL_ASSETS', name: 'TỔNG CỘNG TÀI SẢN', isBold: true, keys: ['TỔNG CỘNG TÀI SẢN'] }
        ]
    },
    {
        code: '300', name: 'NGUỒN VỐN', isBold: true,
        keys: ['NGUỒN VỐN'],
        children: [
            {
                code: '310', name: 'A. NỢ PHẢI TRẢ', isBold: true,
                keys: ['A. NỢ PHẢI TRẢ', 'NỢ PHẢI TRẢ'],
                children: [
                    {
                        code: '311', name: 'I. Nợ ngắn hạn', isBold: true,
                        keys: ['I. Nợ ngắn hạn', 'Nợ ngắn hạn'],
                        children: [
                            { code: '311.1', name: '1. Phải trả người bán ngắn hạn', keys: ['1. Phải trả người bán ngắn hạn'] },
                            { code: '311.2', name: '2. Người mua trả tiền trước ngắn hạn', keys: ['2. Người mua trả tiền trước ngắn hạn'] },
                            { code: '311.3', name: '3. Thuế và các khoản phải nộp Nhà nước', keys: ['3. Thuế và các khoản phải nộp Nhà nước'] },
                            { code: '311.4', name: '4. Phải trả người lao động', keys: ['4. Phải trả người lao động'] },
                            { code: '311.5', name: '5. Chi phí phải trả ngắn hạn', keys: ['5. Chi phí phải trả ngắn hạn'] },
                            { code: '311.6', name: '6. Phải trả nội bộ ngắn hạn', keys: ['6. Phải trả nội bộ ngắn hạn'] },
                            { code: '311.7', name: '7. Phải trả theo tiến độ kế hoạch hợp đồng xây dựng', keys: ['7. Phải trả theo tiến độ kế hoạch hợp đồng xây dựng'] },
                            { code: '311.8', name: '8. Doanh thu chưa thực hiện ngắn hạn', keys: ['8. Doanh thu chưa thực hiện ngắn hạn'] },
                            { code: '311.9', name: '9. Phải trả ngắn hạn khác', keys: ['9. Phải trả ngắn hạn khác'] },
                            { code: '311.10', name: '10. Vay và nợ thuê tài chính ngắn hạn', keys: ['10. Vay và nợ thuê tài chính ngắn hạn'] },
                            { code: '311.11', name: '11. Dự phòng phải trả ngắn hạn', keys: ['11. Dự phòng phải trả ngắn hạn'] },
                            { code: '311.12', name: '12. Quỹ khen thưởng, phúc lợi', keys: ['12. Quỹ khen thưởng, phúc lợi'] },
                            { code: '311.13', name: '13. Quỹ bình ổn giá', keys: ['13. Quỹ bình ổn giá'] },
                            {
                                code: '311.14', name: '14. Dự phòng nghiệp vụ', keys: ['14. Dự phòng nghiệp vụ', 'Dự phòng nghiệp vụ'],
                                children: [
                                    { code: '311.14.1', name: '- Dự phòng phí bảo hiểm gốc và nhận tái bảo hiểm', keys: ['- Dự phòng phí bảo hiểm gốc và nhận tái bảo hiểm', 'Dự phòng phí bảo hiểm gốc và nhận tái bảo hiểm'] },
                                    { code: '311.14.2', name: '- Dự phòng bồi thường bảo hiểm gốc và nhận tái bảo hiểm', keys: ['- Dự phòng bồi thường bảo hiểm gốc và nhận tái bảo hiểm', 'Dự phòng bồi thường bảo hiểm gốc và nhận tái bảo hiểm'] },
                                    { code: '311.14.3', name: '- Dự phòng dao động lớn', keys: ['- Dự phòng dao động lớn', 'Dự phòng dao động lớn'] }
                                ]
                            },
                            {
                                code: '311.15', name: '15. Phải trả hoạt động giao dịch bảo hiểm', keys: ['15. Phải trả hoạt động giao dịch bảo hiểm', 'Phải trả hoạt động giao dịch bảo hiểm'],
                                children: [
                                    { code: '311.15.1', name: '- Phải trả về hoạt động bảo hiểm', keys: ['- Phải trả về hoạt động bảo hiểm'] },
                                    { code: '311.15.2', name: '- Phải trả về hoạt động tái bảo hiểm', keys: ['- Phải trả về hoạt động tái bảo hiểm'] },
                                    { code: '311.15.3', name: '- Phải trả hoa hồng môi giới bảo hiểm', keys: ['- Phải trả hoa hồng môi giới bảo hiểm'] }
                                ]
                            }
                        ]
                    },
                    {
                        code: '312', name: 'II. Nợ dài hạn', isBold: true,
                        keys: ['II. Nợ dài hạn', 'Nợ dài hạn'],
                        children: [
                            { code: '312.1', name: '1. Phải trả người bán dài hạn', keys: ['1. Phải trả người bán dài hạn'] },
                            { code: '312.2', name: '2. Người mua trả tiền trước dài hạn', keys: ['2. Người mua trả tiền trước dài hạn'] },
                            { code: '312.3', name: '3. Chi phí phải trả dài hạn', keys: ['3. Chi phí phải trả dài hạn'] },
                            { code: '312.4', name: '4. Phải trả nội bộ về vốn kinh doanh', keys: ['4. Phải trả nội bộ về vốn kinh doanh'] },
                            { code: '312.5', name: '5. Phải trả nội bộ dài hạn khác', keys: ['5. Phải trả nội bộ dài hạn khác'] },
                            { code: '312.6', name: '6. Doanh thu chưa thực hiện dài hạn', keys: ['6. Doanh thu chưa thực hiện dài hạn'] },
                            { code: '312.7', name: '7. Phải trả dài hạn khác', keys: ['7. Phải trả dài hạn khác'] },
                            { code: '312.8', name: '8. Vay và nợ thuê tài chính dài hạn', keys: ['8. Vay và nợ thuê tài chính dài hạn'] },
                            { code: '312.9', name: '9. Trái phiếu chuyển đổi', keys: ['9. Trái phiếu chuyển đổi'] },
                            { code: '312.10', name: '10. Cổ phiếu ưu đãi', keys: ['10. Cổ phiếu ưu đãi'] },
                            { code: '312.11', name: '11. Thuế thu nhập hoãn lại phải trả', keys: ['11. Thuế thu nhập hoãn lại phải trả', 'Thuế thu nhập hoãn lại phải trả'] },
                            { code: '312.12', name: '12. Dự phòng phải trả dài hạn', keys: ['12. Dự phòng phải trả dài hạn', 'Dự phòng phải trả dài hạn'] },
                            { code: '312.13', name: '13. Quỹ phát triển khoa học và công nghệ', keys: ['13. Quỹ phát triển khoa học và công nghệ'] },
                            { code: '312.14', name: '14. Dự phòng nghiệp vụ dài hạn', keys: ['14. Dự phòng nghiệp vụ dài hạn', 'Dự phòng nghiệp vụ dài hạn'] },
                            { code: '312.15', name: '15. Dự phòng toán học', keys: ['15. Dự phòng toán học', 'Dự phòng toán học'] }
                        ]
                    }
                ]
            },
            {
                code: '400', name: 'B. VỐN CHỦ SỞ HỮU', isBold: true,
                keys: ['B. VỐN CHỦ SỞ HỮU', 'VỐN CHỦ SỞ HỮU'],
                children: [
                    {
                        code: '410', name: 'I. Vốn chủ sở hữu', isBold: true,
                        keys: ['I. Vốn chủ sở hữu', 'Vốn chủ sở hữu'],
                        children: [
                            { code: '410.1', name: '1. Vốn đầu tư của chủ sở hữu', keys: ['1. Vốn đầu tư của chủ sở hữu'] },
                            { code: '410.2', name: '2. Thặng dư vốn cổ phần', keys: ['2. Thặng dư vốn cổ phần'] },
                            { code: '410.3', name: '3. Quyền chọn chuyển đổi trái phiếu', keys: ['3. Quyền chọn chuyển đổi trái phiếu'] },
                            { code: '410.4', name: '4. Vốn khác của chủ sở hữu', keys: ['4. Vốn khác của chủ sở hữu'] },
                            { code: '410.5', name: '5. Cổ phiếu quỹ', keys: ['5. Cổ phiếu quỹ'] },
                            { code: '410.6', name: '6. Chênh lệch đánh giá lại tài sản', keys: ['6. Chênh lệch đánh giá lại tài sản'] },
                            { code: '410.7', name: '7. Chênh lệch tỷ giá hối đoái', keys: ['7. Chênh lệch tỷ giá hối đoái'] },
                            { code: '410.8', name: '8. Quỹ đầu tư phát triển', keys: ['8. Quỹ đầu tư phát triển'] },
                            { code: '410.9', name: '9. Quỹ hỗ trợ sắp xếp doanh nghiệp', keys: ['9. Quỹ hỗ trợ sắp xếp doanh nghiệp'] },
                            { code: '410.10', name: '10. Quỹ khác thuộc vốn chủ sở hữu', keys: ['10. Quỹ khác thuộc vốn chủ sở hữu'] },
                            { code: '410.11', name: '11. Lợi nhuận sau thuế chưa phân phối', keys: ['11. Lợi nhuận sau thuế chưa phân phối'] },
                            { code: '410.12', name: '12. Nguồn vốn đầu tư xây dựng cơ bản', keys: ['12. Nguồn vốn đầu tư xây dựng cơ bản'] },
                            { code: '410.13', name: '13. Quỹ dự trữ bắt buộc', keys: ['13. Quỹ dự trữ bắt buộc', 'Quỹ dự trữ bắt buộc'] }
                        ]
                    },
                    {
                        code: '420', name: 'II. Nguồn kinh phí và quỹ khác', isBold: true,
                        keys: ['II. Nguồn kinh phí và quỹ khác', 'Nguồn kinh phí và quỹ khác'],
                        children: [
                            { code: '420.1', name: '1. Nguồn kinh phí', keys: ['1. Nguồn kinh phí'] },
                            { code: '420.2', name: '2. Nguồn kinh phí đã hình thành TSCĐ', keys: ['2. Nguồn kinh phí đã hình thành TSCĐ'] }
                        ]
                    }
                ]
            },
            { code: '440', name: 'TỔNG CỘNG NGUỒN VỐN', isBold: true, keys: ['TỔNG CỘNG NGUỒN VỐN'] }
        ]
    }
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
    const [columnWidth, setColumnWidth] = useState(450);

    const currentStructure = useMemo(() => {
        const ind = industry.toLowerCase();
        if (ind.includes('ngân hàng')) return BANK_BALANCE_STRUCTURE;
        if (ind.includes('dịch vụ tài chính')) return SECURITIES_BALANCE_STRUCTURE;
        if (ind.includes('bảo hiểm')) return INSURANCE_BALANCE_STRUCTURE;
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
                const cleanName = item.name.toLowerCase()
                    .replace(/^[ivx]+\.\s*/, '')
                    .replace(/^\d+[a-z]*\.\s*/, '')
                    .replace(/^[a-d]\.\s*/, '')
                    .replace(/^- \s*/, '')
                    .trim();
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
                result['TỔNG CỘNG NGUỒN VỐN'] = (result['A. NỢ PHẢI TRẢ'] || 0) + (result['B. VỐN CHỦ SỞ HỮU'] || 0);
            }

            const y = result['Năm'] || result['year'] || '';
            const q = result['Quý'] || result['quarter'] || '';
            result.periodLabel = period === 'year' ? `${y}` : `Q${q}/${y.toString().slice(-2)}`;
            return result;
        });
    }, [rawRecords, period]);

    const fullStructure = useMemo(() => {
        const structure = [...currentStructure];

        const usedKeys = new Set<string>();
        const extractUsedKeys = (items: any[]) => {
            items.forEach(item => {
                if (item.keys) item.keys.forEach((k: string) => usedKeys.add(k.toLowerCase()));
                if (item.children) extractUsedKeys(item.children);
            });
        };
        extractUsedKeys(structure);

        if (rawRecords.length > 0) {
            // Unmapped raw keys logic removed as per user request to keep table clean
        }
        return structure;
    }, [currentStructure, rawRecords]);

    const allMetrics = useMemo(() => {
        const list: any[] = [];
        const extract = (items: any[]) => {
            items.forEach(i => {
                list.push(i);
                if (i.children) extract(i.children);
            });
        };
        extract(fullStructure);
        return list;
    }, [fullStructure]);

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
            title: (
                <div className="flex items-center justify-between group">
                    <span className="text-[10px] text-gray-500">CHỈ TIÊU (TỶ VNĐ)</span>
                    <Popover
                        content={
                            <div className="w-48">
                                <p className="text-xs mb-2">Độ rộng cột: {columnWidth}px</p>
                                <Slider
                                    min={200}
                                    max={800}
                                    value={columnWidth}
                                    onChange={(v: number) => setColumnWidth(v)}
                                />
                            </div>
                        }
                        title="Cấu hình hiển thị"
                        trigger="click"
                    >
                        <Settings size={12} className="text-gray-400 cursor-pointer hover:text-neon-blue transition-colors" />
                    </Popover>
                </div>
            ),
            dataIndex: 'name',
            key: 'name',
            fixed: 'left',
            width: columnWidth,
            render: (text: string, record: any) => (
                <Tooltip title={text} placement="topLeft" mouseEnterDelay={0.5}>
                    <span className={`inline-block align-middle w-full ${record.isBold ? 'font-bold' : ''} text-[10px] truncate`}>
                        {text}
                    </span>
                </Tooltip>
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
                    dataSource={fullStructure}
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
                    dataSource={fullStructure}
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
