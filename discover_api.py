import vnstock_data
print("Modules in vnstock_data:")
print(dir(vnstock_data))

from vnstock_data import Market, Trading, Derivative, Listing
print("\nMarket methods:")
print([m for m in dir(Market) if not m.startswith('_')])

print("\nTrading methods:")
print([m for m in dir(Trading) if not m.startswith('_')])

print("\nListing methods:")
print([m for m in dir(Listing) if not m.startswith('_')])
