from vnstock_data import config
# List all config parameters
print("Config attributes:")
print([a for a in dir(config) if not a.startswith('_')])

# If there's an api_key in config
try:
    print(f"API Key present: {bool(config.api_key)}")
except:
    pass
