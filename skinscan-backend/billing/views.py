from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count
from django.db.models.functions import TruncMonth
from django.utils import timezone
from datetime import timedelta
from .models import Invoice, Transaction
from prediction.models import SharedReport


class BillingStatsView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):
        doctor = request.user

        # Current month stats
        now = timezone.now()
        current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        invoices = Invoice.objects.filter(doctor=doctor)

        paid_amount = invoices.filter(status='PAID').aggregate(
            total=Sum('amount'))['total'] or 0

        pending_amount = invoices.filter(status='PENDING').aggregate(
            total=Sum('amount'))['total'] or 0

        overdue_amount = invoices.filter(status='OVERDUE').aggregate(
            total=Sum('amount'))['total'] or 0

        # Monthly revenue for chart (last 6 months) — use paid_at
        six_months_ago = now - timedelta(days=180)
        monthly_data = (
            invoices
            .filter(status='PAID', paid_at__isnull=False, paid_at__gte=six_months_ago)
            .annotate(month=TruncMonth('paid_at'))
            .values('month')
            .annotate(total=Sum('amount'), count=Count('id'))
            .order_by('month')
        )

        # Build chart data for last 6 months
        chart_labels = []
        chart_values = []
        for i in range(5, -1, -1):
            month_date = (now - timedelta(days=30 * i)).replace(day=1)
            label = month_date.strftime('%b %Y')
            chart_labels.append(label)

            month_total = 0
            for entry in monthly_data:
                if entry['month'].month == month_date.month and entry['month'].year == month_date.year:
                    month_total = float(entry['total'])
                    break
            chart_values.append(month_total)

        return Response({
            'status': 'success',
            'data': {
                'paid_amount': float(paid_amount),
                'pending_amount': float(pending_amount),
                'overdue_amount': float(overdue_amount),
                'chart': {
                    'labels': chart_labels,
                    'values': chart_values
                }
            }
        })


class InvoiceListView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):
        doctor = request.user
        invoices = Invoice.objects.filter(doctor=doctor).order_by('created_at')

        # Build sequential invoice numbers (1, 2, 3, ...) based on creation order
        data = []
        for idx, inv in enumerate(invoices, start=1):
            data.append({
                'id': inv.id,
                'invoice_number': idx,
                'patient_name': inv.patient_name,
                'patient_email': inv.patient_email or '',
                'service': inv.service,
                'amount': float(inv.amount),
                'status': inv.status,
                'due_date': inv.due_date.strftime('%Y-%m-%d'),
                'notes': inv.notes or '',
                'created_at': inv.created_at.isoformat(),
            })

        # Reverse so newest shows first (matching original ordering)
        data.reverse()

        return Response({
            'status': 'success',
            'data': data
        })


class InvoiceCreateView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):
        doctor = request.user
        patient_name = request.data.get('patient_name')
        patient_email = request.data.get('patient_email', '')
        service = request.data.get('service', 'AI Skin Analysis')
        amount = request.data.get('amount')
        due_date = request.data.get('due_date')
        notes = request.data.get('notes', '')

        if not patient_name or not amount or not due_date:
            return Response({
                'status': 'error',
                'message': 'patient_name, amount, and due_date are required'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            invoice = Invoice.objects.create(
                doctor=doctor,
                patient_name=patient_name,
                patient_email=patient_email,
                service=service,
                amount=amount,
                due_date=due_date,
                notes=notes
            )

            return Response({
                'status': 'success',
                'message': 'Invoice created successfully',
                'data': {
                    'id': invoice.id,
                    'patient_name': invoice.patient_name,
                    'amount': float(invoice.amount),
                    'status': invoice.status,
                    'due_date': invoice.due_date if isinstance(invoice.due_date, str) else invoice.due_date.strftime('%Y-%m-%d'),
                }
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class InvoiceUpdateView(APIView):

    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            invoice = Invoice.objects.get(pk=pk, doctor=request.user)
        except Invoice.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'Invoice not found'
            }, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status')
        if new_status and new_status in ['PAID', 'PENDING', 'OVERDUE']:
            invoice.status = new_status

            # Track when invoice was paid
            if new_status == 'PAID':
                invoice.paid_at = timezone.now()
                Transaction.objects.create(
                    invoice=invoice,
                    amount=invoice.amount,
                    payment_method=request.data.get('payment_method', 'Cash')
                )
            else:
                # If status changed away from PAID, clear paid_at
                invoice.paid_at = None

            invoice.save()

        return Response({
            'status': 'success',
            'message': 'Invoice updated successfully'
        })

    def delete(self, request, pk):
        try:
            invoice = Invoice.objects.get(pk=pk, doctor=request.user)
            invoice.delete()
            return Response({
                'status': 'success',
                'message': 'Invoice deleted successfully'
            })
        except Invoice.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'Invoice not found'
            }, status=status.HTTP_404_NOT_FOUND)
