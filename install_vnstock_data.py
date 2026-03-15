import sys
import os
import json
import logging

try:
    from vnstock_installer.api import VnstockAPIClient
    from vnstock_installer.installer import VnstockInstaller
    from vnstock_installer import config
except ImportError:
    print("Failed to import vnstock_installer. Make sure 'vnstock-installer' is installed.", file=sys.stderr)
    sys.exit(1)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

API_KEY = "vnstock_e45db2c59a9e33e9f9237e432de75a1d"

def install():
    print(f"Installing vnstock_data using key: {API_KEY[:10]}...")
    
    # Initialize API Client
    client = VnstockAPIClient(api_key=API_KEY)
    
    # Register device first (required for download)
    success, msg, _ = client.register_device()
    if not success:
        print(f"Device registration failed: {msg}")
        return False

    # Ensure uv is installed
    import subprocess
    print("Ensuring uv is installed...")
    subprocess.run([sys.executable, "-m", "pip", "install", "uv"], check=True)

    # Initialize Installer
    installer = VnstockInstaller(
        api_client=client,
        python_executable=sys.executable,
        use_venv=False # Using current env since we run inside it
    )
    
    # Force uv resolution
    installer._ensure_uv_installed()
    
    # Install package
    success, msg = installer.install_package('vnstock_data')
    if success:
        print("Installation successful!")
        return True
    else:
        print(f"Installation failed: {msg}")
        return False

if __name__ == "__main__":
    if install():
        sys.exit(0)
    else:
        sys.exit(1)
