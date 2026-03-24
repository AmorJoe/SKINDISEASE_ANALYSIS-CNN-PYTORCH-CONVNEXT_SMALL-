from django.urls import path
from .views import BillingStatsView, InvoiceListView, InvoiceCreateView, InvoiceUpdateView

urlpatterns = [
    path('stats/', BillingStatsView.as_view(), name='billing-stats'),
    path('invoices/', InvoiceListView.as_view(), name='invoice-list'),
    path('invoices/create/', InvoiceCreateView.as_view(), name='invoice-create'),
    path('invoices/<int:pk>/', InvoiceUpdateView.as_view(), name='invoice-update'),
]
