"""URL config: everything lives under /api — same prefixes as the TS routes."""

from django.urls import include, path

urlpatterns = [
    path("api/", include("ichibaapi.urls")),
]
