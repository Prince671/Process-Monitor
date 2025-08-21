from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Process
from .serializers import ProcessSerializer
import psutil, socket, time
from django.utils import timezone
from django.db import transaction, OperationalError

class LiveProcessView(APIView):
    """Unified view for index page and live process API"""

    def get(self, request):
        if not request.path.startswith('/api/'):
            return render(request, "monitoring/index.html")
        processes = Process.objects.all()
        serializer = ProcessSerializer(processes, many=True)
        return Response(serializer.data)

    def post(self, request):
        if request.path.endswith('collect/'):
            # Collect live server processes safely
            hostname = socket.gethostname()
            snapshot = []

            for proc in psutil.process_iter(["pid", "ppid", "name", "cpu_percent", "memory_percent"]):
                try:
                    info = proc.info
                    snapshot.append(Process(
                        pid=info["pid"],
                        parent_pid=info["ppid"],
                        name=info.get("name") or "unknown",
                        cpu_usage=info.get("cpu_percent") or 0.0,
                        memory_usage=info.get("memory_percent") or 0.0,
                        hostname=hostname,
                        timestamp=timezone.now(),
                    ))
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    continue

            # Retry mechanism for SQLite
            for attempt in range(5):
                try:
                    with transaction.atomic():
                        # Optional: delete old rows for this host
                        Process.objects.filter(hostname=hostname).delete()
                        # Bulk insert new snapshot
                        Process.objects.bulk_create(snapshot)
                    break  # success
                except OperationalError:
                    if attempt < 4:
                        time.sleep(0.1)  # wait 100ms before retry
                    else:
                        return Response(
                            {"message": "Database is locked, try again"},
                            status=status.HTTP_503_SERVICE_UNAVAILABLE
                        )

            return Response(
                {"message": "Snapshot collected", "count": len(snapshot), "hostname": hostname},
                status=status.HTTP_201_CREATED
            )

        elif request.path.endswith('upload/'):
            # API for agent to upload data
            serializer = ProcessSerializer(data=request.data, many=True)
            if serializer.is_valid():
                serializer.save()
                return Response({"message": "Processes saved"}, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        Process.objects.all().delete()
        return Response({"message": "All processes deleted"}, status=status.HTTP_200_OK)
