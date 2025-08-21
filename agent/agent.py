import psutil
import socket
import requests
from datetime import datetime

API_URL = "http://127.0.0.1:8000/api/processes/upload/"  # Django must be running

def collect_and_send():
    hostname = socket.gethostname()
    snapshot = []

    for proc in psutil.process_iter(["pid", "ppid", "name", "cpu_percent", "memory_percent"]):
        try:
            info = proc.info
            snapshot.append({
                "hostname": hostname,
                "pid": info["pid"],
                "parent_pid": info.get("ppid"),
                "name": info.get("name") or "unknown",
                "cpu_usage": info.get("cpu_percent", 0.0),
                "memory_usage": info.get("memory_percent", 0.0),
                "timestamp": datetime.now().isoformat(),
            })
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue

    if snapshot:
        res = requests.post(API_URL, json=snapshot)
        print(f"Uploaded {len(snapshot)} processes, status: {res.status_code}")

if __name__ == "__main__":
    collect_and_send()
