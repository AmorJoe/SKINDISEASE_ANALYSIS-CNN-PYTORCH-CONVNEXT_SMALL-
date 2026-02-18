from django.urls import path
from .views import UserListView, UserDetailView, ModelModeratorView, ModelUploadView, AdminReportView, DiseaseInfoView

urlpatterns = [
    path('users/', UserListView.as_view(), name='admin-user-list'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='admin-user-detail'),
    path('users/<int:pk>/<str:action>/', UserDetailView.as_view(), name='admin-user-action'),
    path('models/', ModelModeratorView.as_view(), name='admin-model-moderation'),
    path('models/upload/', ModelUploadView.as_view(), name='admin-model-upload'),
    path('reports/', AdminReportView.as_view(), name='admin-reports-all'),
    path('reports/<int:pk>/', AdminReportView.as_view(), name='admin-report-detail'),
    path('content/', DiseaseInfoView.as_view(), name='admin-content-list'),
    path('content/<int:pk>/', DiseaseInfoView.as_view(), name='admin-content-detail'),
]
