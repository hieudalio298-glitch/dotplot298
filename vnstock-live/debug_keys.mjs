import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
    'https://utqmpdmbkubhzuccqeyf.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0cW1wZG1ia3ViaHp1Y2NxZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyOTI1ODYsImV4cCI6MjA4NTg2ODU4Nn0.VR41wyzivzdJnUaFxMmRXjij-pU_9rm8e7TesbimwG4'
);

async function debugKeys() {
    const { data, error } = await supabase
        .from('financial_statements')
        .select('*')
        .eq('symbol', 'FPT')
        .eq('statement_type', 'income_statement')
        .eq('period_type', 'quarter')
        .limit(1);

    if (error) { console.error(error); return; }
    if (!data || data.length === 0) { console.log('No data'); return; }

    const record = data[0];
    const innerData = Array.isArray(record.data) ? record.data[0] : record.data;
    
    let output = '=== RAW KEYS FROM SUPABASE (FPT Income Statement) ===\n';
    output += `Period: ${innerData['Năm']} Q: ${innerData['Quý']}\n\n`;
    
    const keys = Object.keys(innerData);
    keys.forEach((k, i) => {
        const val = innerData[k];
        if (k !== 'Năm' && k !== 'Quý' && k !== 'year' && k !== 'quarter') {
            output += `[${String(i).padStart(2)}] "${k}" => ${val}\n`;
        }
    });

    // Now test the getVal matching logic
    const VAS_INCOME_STRUCTURE = [
        { code: '01', name: '1. Doanh thu bán hàng và cung cấp dịch vụ', keys: ['Sales', '01. Doanh thu bán hàng và cung cấp dịch vụ', 'Doanh thu bán hàng và cung cấp dịch vụ', 'Tổng doanh thu hoạt động kinh doanh'] },
        { code: '02', name: '2. Các khoản giảm trừ doanh thu', keys: ['Sales deductions', '02. Các khoản giảm trừ doanh thu', 'Các khoản giảm trừ doanh thu'] },
        { code: '10', name: '3. Doanh thu thuần về bán hàng và cung cấp dịch vụ', keys: ['Net sales', '10. Doanh thu thuần về bán hàng và cung cấp dịch vụ', 'Doanh thu thuần', 'Doanh thu thuần về bán hàng và cung cấp dịch vụ'] },
        { code: '11', name: '4. Giá vốn hàng bán', keys: ['Cost of sales', '11. Giá vốn hàng bán', 'Giá vốn hàng bán'] },
        { code: '20', name: '5. Lợi nhuận gộp về bán hàng và cung cấp dịch vụ', keys: ['Gross Profit', '20. Lợi nhuận gộp về bán hàng và cung cấp dịch vụ', 'Lợi nhuận gộp'] },
        { code: '21', name: '6. Doanh thu hoạt động tài chính', keys: ['Financial income', '21. Doanh thu hoạt động tài chính', 'Doanh thu hoạt động tài chính'] },
        { code: '22', name: '7. Chi phí tài chính', keys: ['Financial expenses', '22. Chi phí tài chính', 'Chi phí tài chính'] },
        { code: '23', name: 'Trong đó :Chi phí lãi vay', keys: ['Interest expenses', 'Trong đó: Chi phí lãi vay', '23. Trong đó: Chi phí lãi vay'] },
        { code: '24', name: '8. Phần lãi/lỗ trong công ty liên doanh, liên kết', keys: ['Gain/(loss) from joint ventures', '24. Phần lãi lỗ trong công ty liên doanh, liên kết', 'Phần lãi lỗ trong công ty liên doanh, liên kết'] },
        { code: '25', name: '9. Chi phí bán hàng', keys: ['Selling expenses', '25. Chi phí bán hàng', 'Chi phí bán hàng'] },
        { code: '26', name: '10. Chi phí quản lý doanh nghiệp', keys: ['General and admin expenses', '26. Chi phí quản lý doanh nghiệp', 'Chi phí quản lý doanh nghiệp'] },
        { code: '30', name: '11. Lợi nhuận thuần từ hoạt động kinh doanh', keys: ['Operating profit/(loss)', '30. Lợi nhuận thuần từ hoạt động kinh doanh', 'Lợi nhuận thuần từ hoạt động kinh doanh'] },
    ];

    output += '\n=== MATCH ANALYSIS ===\n';
    
    VAS_INCOME_STRUCTURE.forEach(item => {
        // Step 1: Exact match
        let matched = false;
        let matchType = '';
        let matchedKey = '';
        let matchedVal = null;

        for (const k of item.keys) {
            if (innerData[k] !== undefined && innerData[k] !== null) {
                matched = true;
                matchType = 'EXACT';
                matchedKey = k;
                matchedVal = innerData[k];
                break;
            }
        }

        // Step 3: Code match
        if (!matched && item.code && !isNaN(parseInt(item.code))) {
            const allKeys = Object.keys(innerData);
            const codeMatch = allKeys.find(k => k.includes(`(${item.code})`) || k.startsWith(`${item.code}.`));
            if (codeMatch) {
                matched = true;
                matchType = 'CODE';
                matchedKey = codeMatch;
                matchedVal = innerData[codeMatch];
            }
        }

        // Step 4: Fuzzy match
        if (!matched) {
            const allKeys = Object.keys(innerData);
            const cleanName = item.name.toLowerCase()
                .replace(/^[ivx]+\.\s*/, '')
                .replace(/^\d+[a-z]*\.\s*/, '')
                .replace(/^[a-d]\.\s*/, '')
                .replace(/^- \s*/, '')
                .replace('- ', '')
                .trim();
            const fuzzyKey = allKeys.find(k => k.toLowerCase().includes(cleanName));
            if (fuzzyKey) {
                matched = true;
                matchType = 'FUZZY';
                matchedKey = fuzzyKey;
                matchedVal = innerData[fuzzyKey];
            }
            output += `\n  [${item.code}] "${item.name}"\n`;
            output += `    cleanName: "${cleanName}"\n`;
            output += `    Match: ${matchType} => key="${matchedKey}" val=${matchedVal}\n`;
        } else {
            output += `\n  [${item.code}] "${item.name}"\n`;
            output += `    Match: ${matchType} => key="${matchedKey}" val=${matchedVal}\n`;
        }
    });

    fs.writeFileSync('/tmp/debug_output.txt', output);
    console.log('Output saved to /tmp/debug_output.txt');
}

debugKeys();
