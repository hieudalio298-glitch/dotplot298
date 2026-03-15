try:
    import vnstock_data
    print("VNSTOCK_DATA_FOUND: OK")
    print(f"Location: {vnstock_data.__file__}")
except ImportError:
    print("VNSTOCK_DATA_FOUND: NO")
except Exception as e:
    print(f"VNSTOCK_DATA_FOUND: ERROR {e}")
