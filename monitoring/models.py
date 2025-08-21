from django.db import models
from django.utils import timezone

class Process(models.Model):
    hostname = models.CharField(max_length=255)
    pid = models.IntegerField()
    parent_pid = models.IntegerField(null=True, blank=True)
    name = models.CharField(max_length=255)
    cpu_usage = models.FloatField(default=0.0)
    memory_usage = models.FloatField(default=0.0)
    timestamp = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.hostname} - {self.name} ({self.pid})"
