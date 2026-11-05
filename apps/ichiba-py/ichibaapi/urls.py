"""Route table — same /api/* prefixes as apps/ichiba's route handlers."""

from django.urls import path

from ichibaapi import views

urlpatterns = [
    path("health", views.HealthView.as_view()),
    path("products", views.ProductsView.as_view()),
    path("shops", views.ShopsView.as_view()),
    path("checkout", views.CheckoutView.as_view()),
    path("orders", views.OrdersView.as_view()),
]
