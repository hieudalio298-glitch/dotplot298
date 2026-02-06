export interface StockSymbol {
    symbol: string;
    company_name: string;
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
    "Tổng tài sản": "Tổng cộng tài sản",
    "Vốn chủ sở hữu": "Vốn chủ sở hữu",
    "Nợ phải trả": "Nợ phải trả",
    "Tiền mặt": "Tiền và các khoản tương đương tiền",
    "Khoản phải thu": "Các khoản phải thu ngắn hạn",
    "Tồn kho": "Hàng tồn kho"
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
    'Tiền và các khoản tương đương tiền',
    'Đầu tư tài chính ngắn hạn',
    'Chứng khoán kinh doanh',
    'Các khoản phải thu ngắn hạn',
    'Phải thu ngắn hạn của khách hàng',
    'Hàng tồn kho',
    'Tài sản ngắn hạn khác',
    'TÀI SẢN DÀI HẠN',
    'Phải thu dài hạn của khách hàng',
    'Tài sản cố định',
    'Tài sản cố định hữu hình',
    'Tài sản cố định vô hình',
    'Bất động sản đầu tư',
    'Đầu tư tài chính dài hạn',
    'Tài sản dài hạn khác',
    'TỔNG CỘNG TÀI SẢN',
    'NỢ PHẢI TRẢ',
    'Nợ ngắn hạn',
    'Vay và nợ thuê tài chính ngắn hạn',
    'Phải trả người bán ngắn hạn',
    'Nợ dài hạn',
    'Vay và nợ thuê tài chính dài hạn',
    'VỐN CHỦ SỞ HỮU',
    'Vốn góp của chủ sở hữu',
    'Lợi nhuận sau thuế chưa phân phối',
    'TỔNG CỘNG NGUỒN VỐN',

    // --- CASH FLOW ---
    'Lưu chuyển tiền thuần từ hoạt động kinh doanh',
    'Khấu hao tài sản cố định',
    'Lưu chuyển tiền thuần từ hoạt động đầu tư',
    'Tiền chi để mua sắm, xây dựng TSCĐ',
    'Lưu chuyển tiền thuần từ hoạt động tài chính',
    'Tiền thu từ đi vay',
    'Tiền trả nợ gốc vay',
    'Cổ tức, lợi nhuận đã trả cho chủ sở hữu',
    'Lưu chuyển tiền thuần trong kỳ',
    'Tiền và tương đương tiền đầu kỳ',
    'Tiền và tương đương tiền cuối kỳ'
];
