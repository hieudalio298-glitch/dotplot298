import sys
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from vnstock import Trading

print("Trading methods:", [m for m in dir(Trading) if not m.startswith('_')])
