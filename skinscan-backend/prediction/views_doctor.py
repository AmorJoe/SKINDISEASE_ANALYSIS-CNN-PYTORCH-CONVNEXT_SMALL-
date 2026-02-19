from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.db.models import Q
from authentication.models import User
from authentication.serializers import UserSerializer
from .models import Appointment, SharedReport, PredictionResult
from .serializers import PredictionResultSerializer
import datetime

class DoctorListView(APIView):
    """
    List all available doctors.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        doctors = User.objects.filter(is_doctor=True, account_status='ACTIVE')
        serializer = UserSerializer(doctors, many=True)
        return Response({
            'status': 'success',
            'data': serializer.data
        })

class BookAppointmentView(APIView):
    """
    Book an appointment with a doctor.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        doctor_id = request.data.get('doctor_id')
        date_str = request.data.get('date')
        time_slot = request.data.get('time_slot')

        if not all([doctor_id, date_str, time_slot]):
            return Response({'status': 'error', 'message': 'All fields are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            doctor = User.objects.get(id=doctor_id, is_doctor=True)
            # Basic validation: check if slot is already taken (for simplicity, we'll just check exact match)
            # In a real app, we'd need more complex logic.
            existing = Appointment.objects.filter(doctor=doctor, date=date_str, time_slot=time_slot, status='CONFIRMED').exists()
            if existing:
                return Response({'status': 'error', 'message': 'Slot already booked'}, status=status.HTTP_400_BAD_REQUEST)

            appointment = Appointment.objects.create(
                patient=request.user,
                doctor=doctor,
                date=date_str,
                time_slot=time_slot,
                status='PENDING'
            )
            
            return Response({
                'status': 'success',
                'message': 'Appointment request sent successfully',
                'data': {
                    'id': appointment.id,
                    'doctor': doctor.email,
                    'date': appointment.date,
                    'time_slot': appointment.time_slot,
                    'status': appointment.status
                }
            }, status=status.HTTP_201_CREATED)

        except User.DoesNotExist:
            return Response({'status': 'error', 'message': 'Doctor not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'status': 'error', 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserAppointmentsView(APIView):
    """
    Get appointments for the current user (either as patient or doctor).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        role = request.query_params.get('role', 'patient')
        
        if role == 'doctor' and request.user.is_doctor:
            appointments = Appointment.objects.filter(doctor=request.user).order_by('date', 'time_slot')
        else:
            appointments = Appointment.objects.filter(patient=request.user).order_by('date', 'time_slot')
            
        data = []
        for appt in appointments:
            data.append({
                'id': appt.id,
                'patient_name': appt.patient.full_name,
                'patient_avatar': appt.patient.avatar.url if appt.patient.avatar else None,
                'doctor_name': appt.doctor.full_name,
                'doctor_specialty': getattr(appt.doctor, 'specialty', 'General'),
                'doctor_avatar': appt.doctor.avatar.url if appt.doctor.avatar else None,
                'date': appt.date,
                'time_slot': appt.time_slot,
                'status': appt.status,
                'video_link': appt.video_link
            })
            
        return Response({'status': 'success', 'data': data})

class DoctorAppointmentManageView(APIView):
    """
    Doctor can Confirm/Reject appointments.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, appointment_id):
        if not request.user.is_doctor:
             return Response({'status': 'error', 'message': 'Only doctors can manage appointments'}, status=status.HTTP_403_FORBIDDEN)
             
        action = request.data.get('action') # 'confirm' or 'reject'
        
        try:
            appt = Appointment.objects.get(id=appointment_id, doctor=request.user)
            
            if action == 'confirm':
                appt.status = 'CONFIRMED'
            elif action == 'reject':
                appt.status = 'REJECTED'
            elif action == 'complete':
                appt.status = 'COMPLETED'
            else:
                return Response({'status': 'error', 'message': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)
                
            appt.save()
            return Response({'status': 'success', 'message': f'Appointment {action}ed', 'state': appt.status})
            
        except Appointment.DoesNotExist:
            return Response({'status': 'error', 'message': 'Appointment not found'}, status=status.HTTP_404_NOT_FOUND)

class ShareReportView(APIView):
    """
    Share a report with a doctor.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        report_id = request.data.get('report_id')
        doctor_id = request.data.get('doctor_id')
        
        try:
            report = PredictionResult.objects.get(id=report_id, user=request.user)
            doctor = User.objects.get(id=doctor_id, is_doctor=True)
            
            # Check if already shared
            if SharedReport.objects.filter(report=report, doctor=doctor).exists():
                 return Response({'status': 'error', 'message': 'Already shared with this doctor'}, status=status.HTTP_400_BAD_REQUEST)
            
            SharedReport.objects.create(report=report, doctor=doctor)
            
            return Response({'status': 'success', 'message': 'Report shared successfully'})
            
        except (PredictionResult.DoesNotExist, User.DoesNotExist):
            return Response({'status': 'error', 'message': 'Invalid report or doctor'}, status=status.HTTP_400_BAD_REQUEST)

class DoctorSharedReportsView(APIView):
    """
    Get reports shared with this doctor.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_doctor:
             return Response({'status': 'error', 'message': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
             
        shared = SharedReport.objects.filter(doctor=request.user).select_related('report', 'report__user')
        data = []
        for item in shared:
            data.append({
                'id': item.id,
                'patient_name': item.report.user.full_name,
                'patient_email': item.report.user.email,
                'disease': item.report.disease_name,
                'confidence': item.report.confidence_score,
                'shared_at': item.shared_at,
                'status': item.status,
                'report_id': item.report.id,
                'image_url': item.report.image.image_url if item.report.image else None
            })
            
        return Response({'status': 'success', 'data': data})
