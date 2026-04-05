import subprocess
import sys

def install_and_run():
    print("Installing Playwright...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "playwright"])
    subprocess.check_call([sys.executable, "-m", "playwright", "install", "chromium"])
    print("Playwright installed successfully.")

if __name__ == "__main__":
    install_and_run()
