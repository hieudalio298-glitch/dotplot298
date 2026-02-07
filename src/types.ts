export interface StockSymbol {
    symbol: string;
    company_name: string;
    icb_name2?: string;
    last_updated_at?: string;
}

export interface FinancialRecord {
    [key: string]: any;
}

export interface FinancialStatement {
    id: number;
    symbol: string;
    statement_type: string;
    period_type: 'year' | 'quarter';
    data: FinancialRecord[];
    updated_at: string;
}

export interface FinancialRatio {
    id: number;
    symbol: string;
    period_type: 'year' | 'quarter';
    data: FinancialRecord[];
    updated_at: string;
}

export const METRIC_MAP: Record<string, string> = {
    "Doanh thu thuần": "Doanh thu thuần về bán hàng và cung cấp dịch vụ",
    "Lợi nhuận gộp": "Lợi nhuận gộp về bán hàng và cung cấp dịch vụ",
    "Lợi nhuận sau thuế": "Lợi nhuận sau thuế thu nhập doanh nghiệp",
    "Tổng tài sản": "TỔNG CỘNG TÀI SẢN",
    "Vốn chủ sở hữu": "B. VỐN CHỦ SỞ HỮU",
    "Nợ phải trả": "A. NỢ PHẢI TRẢ",
    "Tiền mặt": "I. Tiền và các khoản tương đương tiền",
    "Khoản phải thu": "III. Các khoản phải thu ngắn hạn",
    "Tồn kho": "IV. Hàng tồn kho"
};

export const AVAILABLE_METRICS = [
    // --- FINANCIAL RATIOS (CFA Standards) ---
    'ROIC (%)', 'ROE (%)', 'ROA (%)', 'Biên EBIT (%)',
    'Tăng trưởng doanh thu (%)', 'Tăng trưởng LNST (%)', 'Tăng trưởng LNST Cty mẹ (%)', 'Tăng trưởng LN từ HĐKD (%)',
    'Biên lợi nhuận gộp (%)', 'Biên lợi nhuận ròng (%)',
    'Thanh toán hiện hành (Current Ratio)', 'Thanh toán nhanh (Quick Ratio)', 'Thanh toán tức thời (Cash Ratio)',
    'Nợ/Tổng tài sản (%)', 'VCSH/Tổng tài sản (%)', 'Nợ/VCSH (D/E)',
    'Vòng quay hàng tồn kho (lần)', 'Số ngày tồn kho (DSI)', 'Vòng quay khoản phải thu (lần)',
    'Số ngày phải thu (DSO)', 'Chu kỳ tiền mặt (CCC)', 'Vòng quay tài sản cố định (FAT)',

    // --- INCOME STATEMENT ---
    'Doanh thu bán hàng và cung cấp dịch vụ',
    'Các khoản giảm trừ doanh thu',
    'Doanh thu thuần về bán hàng và cung cấp dịch vụ',
    'Giá vốn hàng bán',
    'Lợi nhuận gộp về bán hàng và cung cấp dịch vụ',
    'Doanh thu hoạt động tài chính',
    'Chi phí tài chính',
    'Chi phí lãi vay',
    'Chi phí bán hàng',
    'Chi phí quản lý doanh nghiệp',
    'Lợi nhuận thuần từ hoạt động kinh doanh',
    'Thu nhập khác',
    'Chi phí khác',
    'Lợi nhuận khác',
    'Tổng lợi nhuận kế toán trước thuế',
    'Chi phí thuế TNDN hiện hành',
    'Chi phí thuế TNDN hoãn lại',
    'Lợi nhuận sau thuế thu nhập doanh nghiệp',
    'LNST của cổ đông công ty mẹ',
    'Lãi cơ bản trên cổ phiếu (EPS)',

    // --- BALANCE SHEET ---
    'TÀI SẢN NGẮN HẠN',
    'I. Tiền và các khoản tương đương tiền',
    '1. Tiền',
    '2. Các khoản tương đương tiền',
    'II. Đầu tư tài chính ngắn hạn',
    '1. Chứng khoán kinh doanh',
    '2. Dự phòng giảm giá chứng khoán kinh doanh',
    '3. Đầu tư nắm giữ đến ngày đáo hạn',
    'III. Các khoản phải thu ngắn hạn',
    '1. Phải thu ngắn hạn của khách hàng',
    '2. Trả trước cho người bán ngắn hạn',
    '3. Phải thu nội bộ ngắn hạn',
    '4. Phải thu theo tiến độ kế hoạch hợp đồng xây dựng',
    '5. Phải thu ngắn hạn khác',
    '6. Dự phòng phải thu ngắn hạn khó đòi',
    'IV. Hàng tồn kho',
    '1. Hàng tồn kho',
    '2. Dự phòng giảm giá hàng tồn kho',
    'V. Tài sản ngắn hạn khác',
    'TÀI SẢN DÀI HẠN',
    'I. Các khoản phải thu dài hạn',
    '1. Phải thu dài hạn của khách hàng',
    '2. Trả trước cho người bán dài hạn',
    '4. Phải thu dài hạn khác',
    '5. Dự phòng phải thu dài hạn khó đòi',
    'II. Tài sản cố định',
    '1. Tài sản cố định hữu hình',
    '- Nguyên giá',
    '- Giá trị hao mòn lũy kế',
    '2. Tài sản cố định thuê tài chính',
    '3. Tài sản cố định vô hình',
    'III. Bất động sản đầu tư',
    'IV. Tài sản dở dang dài hạn',
    '1. Chi phí sản xuất, kinh doanh dở dang dài hạn',
    '2. Chi phí xây dựng cơ bản dở dang',
    'V. Đầu tư tài chính dài hạn',
    '1. Đầu tư vào công ty con',
    '2. Đầu tư vào công ty liên doanh, liên kết',
    '3. Đầu tư góp vốn vào đơn vị khác',
    '4. Dự phòng đầu tư tài chính dài hạn',
    '5. Đầu tư nắm giữ đến ngày đáo hạn',
    'VI. Tài sản dài hạn khác',
    'TỔNG CỘNG TÀI SẢN',
    'NỢ PHẢI TRẢ',
    'I. Nợ ngắn hạn',
    '1. Phải trả người bán ngắn hạn',
    '2. Người mua trả tiền trước ngắn hạn',
    '3. Thuế và các khoản phải nộp Nhà nước',
    '4. Phải trả người lao động',
    '5. Chi phí phải trả ngắn hạn',
    '9. Phải trả ngắn hạn khác',
    '10. Vay và nợ thuê tài chính ngắn hạn',
    '11. Dự phòng phải trả ngắn hạn',
    'II. Nợ dài hạn',
    '1. Phải trả người bán dài hạn',
    '8. Vay và nợ thuê tài chính dài hạn',
    'VỐN CHỦ SỞ HỮU',
    'I. Vốn chủ sở hữu',
    '1. Vốn góp của chủ sở hữu',
    '- Cổ phiếu phổ thông có quyền biểu quyết',
    '- Cổ phiếu ưu đãi',
    '2. Thặng dư vốn cổ phần',
    '3. Quyền chọn chuyển đổi trái phiếu',
    '4. Vốn khác của chủ sở hữu',
    '5. Cổ phiếu quỹ (*)',
    '6. Chênh lệch đánh giá lại tài sản',
    '7. Chênh lệch tỷ giá hối đoái',
    '8. Quỹ đầu tư phát triển',
    '9. Quỹ hỗ trợ sắp xếp doanh nghiệp',
    '10. Quỹ khác thuộc vốn chủ sở hữu',
    '11. Lợi nhuận sau thuế chưa phân phối',
    '- LNST chưa phân phối lũy kế đến cuối kỳ trước',
    '- LNST chưa phân phối kỳ này',
    '12. Nguồn vốn đầu tư XDCB',
    '13. Lợi ích cổ đông không kiểm soát',
    'II. Nguồn kinh phí và quỹ khác',
    'TỔNG CỘNG NGUỒN VỐN',

    // --- CASH FLOW (Indirect) ---
    'I. Lưu chuyển tiền từ hoạt động kinh doanh',
    '1. Lợi nhuận trước thuế',
    '2. Điều chỉnh cho các khoản',
    '- Khấu hao tài sản cố định và BĐSĐT',
    '- Các khoản dự phòng',
    '- Lãi, lỗ từ hoạt động đầu tư',
    '- Chi phí lãi vay',
    '3. Lợi nhuận từ HĐKD trước thay đổi vốn lưu động',
    '- Tăng, giảm các khoản phải thu',
    '- Tăng, giảm hàng tồn kho',
    '- Tăng, giảm các khoản phải trả',
    '- Tăng, giảm chi phí trả trước',
    '- Tiền lãi vay đã trả',
    '- Thuế thu nhập doanh nghiệp đã nộp',
    'Lưu chuyển tiền thuần từ hoạt động kinh doanh',
    'II. Lưu chuyển tiền từ hoạt động đầu tư',
    '1. Tiền chi để mua sắm, xây dựng TSCĐ',
    '2. Tiền thu từ thanh lý, nhượng bán TSCĐ',
    '3. Tiền chi cho vay, mua các công cụ nợ',
    '4. Tiền thu hồi cho vay, bán lại các công cụ nợ',
    '5. Tiền chi đầu tư góp vốn vào đơn vị khác',
    '6. Tiền thu hồi đầu tư góp vốn vào đơn vị khác',
    '7. Tiền thu lãi cho vay, cổ tức và lợi nhuận được chia',
    'Lưu chuyển tiền thuần từ hoạt động đầu tư',
    'III. Lưu chuyển tiền từ hoạt động tài chính',
    '1. Tiền thu từ phát hành cổ phiếu, nhận vốn góp',
    '3. Tiền thu từ đi vay',
    '4. Tiền trả nợ gốc vay',
    '6. Cổ tức, lợi nhuận đã trả cho chủ sở hữu',
    'Lưu chuyển tiền thuần từ hoạt động tài chính',
    'Lưu chuyển tiền thuần trong kỳ',
    'Tiền và tương đương tiền đầu kỳ',
    'Ảnh hưởng của thay đổi tỷ giá hối đoái',
    'Tiền và tương đương tiền cuối kỳ'
];
