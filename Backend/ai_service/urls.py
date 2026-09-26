from django.urls import path

from .views import ai_query

urlpatterns = [
    path("query/", ai_query, name="ai-query"),
]
