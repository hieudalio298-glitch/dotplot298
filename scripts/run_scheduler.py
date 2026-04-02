import time
import schedule
import subprocess
import logging
import sys
import os
import win32serviceutil
import win32service
import win32event
import servicemanager
import socket

# Setup logging
log_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scheduler.log")
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        # logging.StreamHandler(sys.stdout) # Cannot stream to stdout in service
    ]
)
logger = logging.getLogger("DotplotService")

class DotplotService(win32serviceutil.ServiceFramework):
    _svc_name_ = "DotplotDataIngest"
    _svc_display_name_ = "Dotplot Data Ingestion Service"
    _svc_description_ = "Automated daily data ingestion for Dotplot (Bond Yields & Interbank Rates)"

    def __init__(self, args):
        win32serviceutil.ServiceFramework.__init__(self, args)
        self.hWaitStop = win32event.CreateEvent(None, 0, 0, None)
        socket.setdefaulttimeout(60)
        self.is_running = True

    def SvcStop(self):
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        win32event.SetEvent(self.hWaitStop)
        self.is_running = False
        logger.info("Service stopping...")

    def SvcDoRun(self):
        servicemanager.LogMsg(servicemanager.EVENTLOG_INFORMATION_TYPE,
                              servicemanager.PYS_SERVICE_STARTED,
                              (self._svc_name_, ''))
        self.main()

    def main(self):
        logger.info("Service started successfully.")
        
        # Schedule to run every day at 18:00
        schedule.every().day.at("18:00").do(self.run_ingest)
        
        # Also run on startup after 1 min to verify
        # schedule.every(1).minutes.do(self.run_ingest) 

        while self.is_running:
            # Check for stop signal
            rc = win32event.WaitForSingleObject(self.hWaitStop, 5000) # Wait 5s
            if rc == win32event.WAIT_OBJECT_0:
                break
            
            # Run scheduled jobs
            schedule.run_pending()

    def run_ingest(self):
        logger.info("Starting scheduled ingestion job...")
        try:
            script_dir = os.path.dirname(os.path.abspath(__file__))
            project_dir = os.path.dirname(script_dir)
            ingest_script = os.path.join(script_dir, "ingest.py")
            
            # Check popular venv paths
            possible_venvs = [
                os.path.join(project_dir, ".venv", "Scripts", "python.exe"),
                os.path.join(project_dir, "venv", "Scripts", "python.exe"),
            ]
            
            venv_python = sys.executable
            for v_path in possible_venvs:
                if os.path.exists(v_path):
                    venv_python = v_path
                    break

            cmd = [venv_python, ingest_script, "--days", "0"]
            logger.info(f"Executing: {' '.join(cmd)}")
            
            # Run without shell window
            startupinfo = subprocess.STARTUPINFO()
            startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                cwd=project_dir,
                startupinfo=startupinfo
            )
            
            if result.returncode == 0:
                logger.info("Ingestion SUCCESS.")
                for line in result.stdout.splitlines():
                    logger.info(f"[Ingest] {line}")
            else:
                logger.error("Ingestion FAILED.")
                logger.error(result.stderr)

        except Exception as e:
            logger.error(f"Job failed with exception: {e}")

if __name__ == '__main__':
    if len(sys.argv) == 1:
        servicemanager.Initialize()
        servicemanager.PrepareToHostSingle(DotplotService)
        servicemanager.StartServiceCtrlDispatcher()
    else:
        win32serviceutil.HandleCommandLine(DotplotService)
