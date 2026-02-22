from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.db.models import Q
from authentication.models import User, DoctorProfile, DoctorDocument
from authentication.serializers import UserSerializer
from .models import Appointment, SharedReport, PredictionResult
from .serializers import PredictionResultSerializer
import datetime
import uuid



class DoctorDocumentListView(APIView):
    """
    List files shared by doctors with the current patient.
    Also supports DELETE to remove a document.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        documents = DoctorDocument.objects.filter(patient=request.user).select_related('doctor')
        data = []
        for doc in documents:
            data.append({
                'id': doc.id,
                'doctor_name': f"Dr. {doc.doctor.first_name or ''} {doc.doctor.last_name or ''}".strip() or "Dr. Unknown",
                'name': doc.name,
                'note': doc.note,
                'file_url': doc.document.url if doc.document else None,
                'created_at': doc.created_at.strftime('%d %b %Y'),
                'doctor_specialty': getattr(getattr(doc.doctor, 'doctor_profile', None), 'specialization', 'General'),
            })
        
        return Response({'status': 'success', 'data': data})

    def delete(self, request):
        doc_id = request.query_params.get('id')
        if not doc_id:
            return Response({'status': 'error', 'message': 'Document ID is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            document = DoctorDocument.objects.get(id=doc_id, patient=request.user)
            # Delete the physical file from storage
            if document.document:
                document.document.delete(save=False)
            document.delete()
            return Response({'status': 'success', 'message': 'Document deleted successfully'})
        except DoctorDocument.DoesNotExist:
            return Response({'status': 'error', 'message': 'Document not found'}, status=status.HTTP_404_NOT_FOUND)


class DoctorStatusView(APIView):
    """
    Returns the current user's doctor verification status.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # Check if a profile exists (Pending or Verified)
        try:
            profile = DoctorProfile.objects.get(user=user)
            return Response({
                'status': 'success',
                'data': {
                    'is_doctor': True, # Conceptually true for the UI to show status
                    'is_verified': profile.is_verified,
                    'specialization': profile.specialization,
                    'mrn': profile.medical_license_number,
                    'name': f"Dr. {user.first_name} {user.last_name}".strip(),
                    'email': user.email,
                    'phone': user.phone or '',
                    'gender': user.gender or '',
                    'years_of_experience': profile.years_of_experience,
                    'hospital_affiliation': profile.hospital_affiliation or '',
                    'consultation_fee': str(profile.consultation_fee),
                    'bio': profile.bio or '',
                    'available_days': profile.available_days or [],
                    'applied_on': profile.created_at.strftime('%d %b %Y'),
                    'verified_on': profile.verification_date.strftime('%d %b %Y') if profile.verification_date else None,
                }
            })
        except DoctorProfile.DoesNotExist:
            # Really not a doctor
            return Response({
                'status': 'success',
                'data': {'is_doctor': False}
            })

    def post(self, request):
        """Update doctor profile details"""
        user = request.user
        if not user.is_doctor:
            return Response({'status': 'error', 'message': 'Unauthorized'}, status=403)

        data = request.data
        try:
            profile = user.doctor_profile
            
            # Update User fields
            if 'phone' in data: user.phone = data['phone']
            if 'gender' in data: user.gender = data['gender']
            user.save()

            # Update DoctorProfile fields
            if 'hospital_affiliation' in data: profile.hospital_affiliation = data['hospital_affiliation']
            if 'years_of_experience' in data: profile.years_of_experience = data['years_of_experience']
            if 'consultation_fee' in data: profile.consultation_fee = data['consultation_fee']
            if 'bio' in data: profile.bio = data['bio']
            if 'available_days' in data: profile.available_days = data['available_days'] # Expecting list
            
            profile.save()

            return Response({'status': 'success', 'message': 'Profile updated successfully'})
        except Exception as e:
            return Response({'status': 'error', 'message': str(e)}, status=500)
        except DoctorProfile.DoesNotExist:
            return Response({
                'status': 'success',
                'data': {'is_doctor': True, 'is_verified': False, 'error': 'Profile not found'}
            })

class DoctorListView(APIView):
    """
    List all verified, active doctors for patient-facing dropdowns.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Only return doctors who are verified by admin and have active accounts
        doctors = User.objects.filter(
            is_doctor=True,
            account_status='ACTIVE',
            doctor_profile__is_verified=True
        ).select_related('doctor_profile')

        data = []
        for doc in doctors:
            profile = getattr(doc, 'doctor_profile', None)
            data.append({
                'id': doc.id,
                'first_name': doc.first_name or '',
                'last_name': doc.last_name or '',
                'email': doc.email,
                'specialization': profile.specialization if profile else 'Dermatology',
                'mrn': profile.medical_license_number if profile else '',
                'available_days': profile.available_days if profile and profile.available_days else ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            })

        return Response({
            'status': 'success',
            'data': data
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
                'patient_name': f"{appt.patient.first_name or ''} {appt.patient.last_name or ''}".strip() or appt.patient.email,
                'patient_avatar': appt.patient.avatar.url if appt.patient.avatar else None,
                'doctor_name': f"Dr. {appt.doctor.first_name or ''} {appt.doctor.last_name or ''}".strip(),
                'doctor_specialty': getattr(getattr(appt.doctor, 'doctor_profile', None), 'specialization', 'Dermatology'),
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
                # Auto-generate a unique Jitsi Meet video link
                room_id = str(uuid.uuid4())[:12].replace('-', '')
                appt.video_link = f"https://meet.jit.si/SkinScan-{room_id}"
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


class DoctorDashboardStatsView(APIView):
    """
    Returns aggregated dashboard stats for the logged-in doctor.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_doctor:
            return Response({'status': 'error', 'message': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

        today = datetime.date.today()
        
        all_appointments = Appointment.objects.filter(doctor=request.user)
        today_count = all_appointments.filter(date=today).exclude(status__in=['REJECTED', 'CANCELLED']).count()
        pending_count = all_appointments.filter(status='PENDING').count()
        
        # Unique patients who have ever booked with this doctor
        total_patients = all_appointments.values('patient').distinct().count()
        
        # Weekly appointment data for chart (last 7 days)
        week_data = []
        day_labels = []
        for i in range(6, -1, -1):
            d = today - datetime.timedelta(days=i)
            count = all_appointments.filter(date=d).exclude(status__in=['REJECTED', 'CANCELLED']).count()
            week_data.append(count)
            day_labels.append(d.strftime('%a'))
        
        return Response({
            'status': 'success',
            'data': {
                'today_appointments': today_count,
                'pending_requests': pending_count,
                'total_patients': total_patients,
                'revenue': 0,  # Billing not implemented yet
                'chart_labels': day_labels,
                'chart_data': week_data,
            }
        })


class DoctorPatientsView(APIView):
    """
    List all unique patients who have appointments with this doctor.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_doctor:
            return Response({'status': 'error', 'message': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

        # Get unique patient IDs from appointments
        patient_ids = Appointment.objects.filter(
            doctor=request.user
        ).values_list('patient', flat=True).distinct()

        patients = User.objects.filter(id__in=patient_ids)
        
        data = []
        for patient in patients:
            # Get last appointment with this doctor
            last_appt = Appointment.objects.filter(
                doctor=request.user, patient=patient
            ).order_by('-date').first()
            
            # Get latest shared report diagnosis
            latest_shared = SharedReport.objects.filter(
                doctor=request.user, report__user=patient
            ).select_related('report').order_by('-shared_at').first()
            
            # Get profile data (gender is stored on UserProfile, not User)
            profile = getattr(patient, 'profile', None)
            first_name = getattr(profile, 'first_name', '') or patient.first_name or ''
            last_name = getattr(profile, 'last_name', '') or patient.last_name or ''
            gender = getattr(profile, 'gender', None) or 'N/A'
            
            data.append({
                'id': patient.id,
                'name': f"{first_name} {last_name}".strip() or patient.email,
                'email': patient.email,
                'gender': gender,
                'last_visit': last_appt.date.strftime('%b %d, %Y') if last_appt else 'N/A',
                'condition': latest_shared.report.disease_name if latest_shared else 'N/A',
            })

        return Response({'status': 'success', 'data': data})


class DoctorSharedReportDetailView(APIView):
    """
    Get full details for a specific shared report.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, shared_report_id):
        if not request.user.is_doctor:
            return Response({'status': 'error', 'message': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
            
        try:
            shared_report = SharedReport.objects.select_related('report', 'report__user', 'report__image').get(
                id=shared_report_id, doctor=request.user
            )
        except SharedReport.DoesNotExist:
            return Response({'status': 'error', 'message': 'Shared report not found or access denied'}, status=status.HTTP_404_NOT_FOUND)
            
        report = shared_report.report
        patient = report.user
        
        # Determine URL prefix (if it's not absolute already)
        image_url = report.image.image_url if report.image else None
        
        # Get severity and body_location from ScanHistory if it exists
        severity = "Moderate" # Default
        body_location = "Skin"
        from .models import ScanHistory
        scan_history = ScanHistory.objects.filter(result=report).first()
        if scan_history:
            if scan_history.severity_tag:
                severity = scan_history.severity_tag
            if scan_history.body_location:
                body_location = scan_history.body_location
        
        data = {
            'id': shared_report.id,
            'report_id': report.id,
            'patient': {
                'id': patient.id,
                'name': getattr(patient.profile, 'first_name', '') + ' ' + getattr(patient.profile, 'last_name', '') if hasattr(patient, 'profile') and (getattr(patient.profile, 'first_name', '') or getattr(patient.profile, 'last_name', '')) else patient.full_name,
                'email': patient.email,
                'phone': getattr(patient.profile, 'phone', None) or patient.phone or 'N/A',
                'dob': getattr(patient.profile, 'date_of_birth', None).strftime('%Y-%m-%d') if hasattr(patient, 'profile') and getattr(patient.profile, 'date_of_birth', None) else (patient.date_of_birth.strftime('%Y-%m-%d') if patient.date_of_birth else 'N/A'),
                'gender': getattr(patient.profile, 'gender', None) or patient.gender or 'N/A',
                'blood_group': 'Available in full profile', # Add blood group field later if needed
                'skin_type': getattr(patient.profile, 'skin_type', None) or patient.skin_type or 'N/A',
                'skin_tone': getattr(patient.profile, 'skin_tone', None) or patient.skin_tone or 'N/A',
                'country': getattr(patient.profile, 'country', None) or 'N/A',
                'address': getattr(patient.profile, 'address', None) or 'N/A'
            },
            'disease': report.disease_name,
            'confidence': report.confidence_score,
            'recommendation': report.recommendation, # AI Notes
            'image_url': image_url,
            'shared_at': shared_report.shared_at,
            'status': shared_report.status,
            'doctor_notes': shared_report.doctor_notes or '',
            'severity': severity,
            'body_location': body_location,
            'abcd': { 'a': 'Low', 'b': 'Irregular', 'c': 'Uniform', 'd': '<6mm' }
        }
        
        return Response({'status': 'success', 'data': data})


class DoctorResendReportView(APIView):
    """
    Doctor saves their notes and a signed PDF, creating a DoctorDocument for the patient.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, shared_report_id):
        if not request.user.is_doctor:
            return Response({'status': 'error', 'message': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
            
        try:
            shared_report = SharedReport.objects.select_related('report', 'report__user').get(
                id=shared_report_id, doctor=request.user
            )
        except SharedReport.DoesNotExist:
            return Response({'status': 'error', 'message': 'Shared report not found'}, status=status.HTTP_404_NOT_FOUND)

        notes = request.data.get('notes', '')
        pdf_file = request.FILES.get('file')

        if not notes and not pdf_file:
            return Response({'status': 'error', 'message': 'Notes or PDF file are required'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Update the SharedReport status
        shared_report.doctor_notes = notes
        shared_report.status = 'REVIEWED'
        shared_report.save()
        
        # 2. Add to Patient's generic `DoctorDocument` list if PDF was provided
        if pdf_file:
            disease_name = shared_report.report.disease_name or 'Diagnosis'
            DoctorDocument.objects.create(
                doctor=request.user,
                patient=shared_report.report.user,
                document=pdf_file,
                name=f"Reviewed Report: {disease_name}",
                note=notes
            )
        
        return Response({'status': 'success', 'message': 'Report successfully sent back to patient.'})
