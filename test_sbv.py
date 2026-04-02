# -*- coding: utf-8 -*-
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from datetime import date, timedelta
import sys
sys.path.insert(0, 'scripts')

from providers.sbv_interbank import SBVInterbankProvider

# Test with yesterday's date
yesterday = date.today() - timedelta(days=1)
print(f"Testing with date: {yesterday}")

provider = SBVInterbankProvider()
records = provider.fetch(yesterday)

print(f"\n[RESULT] Found {len(records)} records")
for i, record in enumerate(records):
    print(f"  [{i}] {record}")
