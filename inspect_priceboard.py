import vnstock_data
import inspect

def print_members(obj):
    print(f"Contents of {obj.__name__ if hasattr(obj, '__name__') else str(obj)}:")
    for name in dir(obj):
        if name.startswith('_'):
            continue
        try:
            member = getattr(obj, name)
            member_type = "module" if inspect.ismodule(member) else \
                          "class" if inspect.isclass(member) else \
                          "function" if inspect.isfunction(member) or inspect.ismethod(member) else \
                          "attribute"
            print(f"- {name} ({member_type})")
        except:
            print(f"- {name} (unknown type)")

if __name__ == "__main__":
    print_members(vnstock_data)
