from django.urls import path
from .views import LiveProcessView

urlpatterns = [
    path('', LiveProcessView.as_view(), name='index'),  # for the web page
    path('api/processes/', LiveProcessView.as_view(), name='process_list'),  # GET
    path('api/processes/collect/', LiveProcessView.as_view(), name='process_collect'),  # POST
    path('api/processes/clear/', LiveProcessView.as_view(), name='process_clear'),
]
