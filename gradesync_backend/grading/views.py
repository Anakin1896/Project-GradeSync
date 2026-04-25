from core.models import Program, Subject, AcademicTerm, Period
import re
from datetime import date, datetime
from students.models import Student
from students.models import Student, Section
from .models import Event
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import Notification, Event, Assessment
from django.db.models import Avg, Max, Min
from urllib.parse import unquote
from .models import (
    ClassSchedule, TeacherSchedule, Enrollment, Attendance, 
    GradingComponent, Assessment, StudentScore,
    GradingTemplate, PeriodGrade 
)
from .serializers import (
    ClassScheduleSerializer, TeacherScheduleSerializer, EnrollmentSerializer, 
    AttendanceSerializer, GradingComponentSerializer, AssessmentSerializer, 
    StudentScoreSerializer, GradingTemplateSerializer, PeriodGradeSerializer
)

class GradingTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = GradingTemplateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return GradingTemplate.objects.filter(teacher=self.request.user)

    def perform_create(self, serializer):
        serializer.save(teacher=self.request.user)

class PeriodGradeViewSet(viewsets.ModelViewSet):
    queryset = PeriodGrade.objects.all()
    serializer_class = PeriodGradeSerializer

class ClassScheduleViewSet(viewsets.ModelViewSet):
    queryset = ClassSchedule.objects.all()
    serializer_class = ClassScheduleSerializer

class TeacherScheduleViewSet(viewsets.ModelViewSet):
    queryset = TeacherSchedule.objects.all()
    serializer_class = TeacherScheduleSerializer

class EnrollmentViewSet(viewsets.ModelViewSet):
    queryset = Enrollment.objects.all()
    serializer_class = EnrollmentSerializer

class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer

class GradingComponentViewSet(viewsets.ModelViewSet):
    queryset = GradingComponent.objects.all()
    serializer_class = GradingComponentSerializer

class AssessmentViewSet(viewsets.ModelViewSet):
    queryset = Assessment.objects.all()
    serializer_class = AssessmentSerializer

class StudentScoreViewSet(viewsets.ModelViewSet):
    queryset = StudentScore.objects.all()
    serializer_class = StudentScoreSerializer

class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        schedules = ClassSchedule.objects.filter(teacher=user).select_related('subject', 'section', 'grading_template')

        total_classes = schedules.count()
        total_students = Enrollment.objects.filter(class_field__in=schedules).values('student').distinct().count()

        class_list = []
        for s in schedules:
            start = getattr(s, 'start_time', None)
            end = getattr(s, 'end_time', None)
            
            time_str = "TBA"
            if start:
                start_str = start.strftime('%I:%M %p').lstrip('0') if hasattr(start, 'strftime') else str(start)[:5]
                time_str = start_str
                if end:
                    end_str = end.strftime('%I:%M %p').lstrip('0') if hasattr(end, 'strftime') else str(end)[:5]
                    time_str = f"{start_str} - {end_str}"

                template_data = None
                if s.grading_template:
                    template_data = {
                        "id": s.grading_template.id,
                        "name": s.grading_template.name,
                        "transmutation_base": s.grading_template.transmutation_base,
                        "items": [
                            {
                                "id": item.id,
                                "name": item.name,
                                "weight_percentage": item.weight_percentage,
                                "period": item.period.period_id if item.period else None
                            }
                            for item in s.grading_template.items.all()
                        ]
                    }

            class_list.append({
                "id": s.class_id,
                "subject": s.subject.code if s.subject else "TBA",
                "title": s.subject.title if s.subject else "TBA",
                "section": s.section.name if s.section else "TBA",
                "days": getattr(s, 'days', 'TBA'), 
                "time": time_str,
                "room": getattr(s, 'room', 'TBA'),
                "grading_template_id": s.grading_template.id if s.grading_template else "",
                "grading_template": template_data
            })

        teacher_name = f"{user.first_name} {user.last_name}".strip()
        if not teacher_name: teacher_name = user.username 
            
        today_date = date.today().strftime("%A, %B %d, %Y")

        return Response({
            "teacher_name": teacher_name,
            "today_date": today_date,
            "stats": {"total_classes": total_classes, "total_students": total_students},
            "classes": class_list
        })

    def post(self, request):
        data = request.data
        user = request.user
        
        subject_instance, _ = Subject.objects.get_or_create(
            code=data.get('subject', 'NEW 101'),
            defaults={'title': data.get('title', 'New Subject')}
        )

        program_instance, _ = Program.objects.get_or_create(
            code="GEN", defaults={"name": "General Program"}
        )
        
        section_instance, _ = Section.objects.get_or_create(
            name=data.get('section', 'Block A'),
            defaults={'program': program_instance}
        )

        term_instance = AcademicTerm.objects.filter(is_active=True).first()
        if not term_instance:
            term_instance, _ = AcademicTerm.objects.get_or_create(
                school_year="2025-2026",
                defaults={"start_date": date.today(), "end_date": date.today(), "is_active": True}
            )

        template_id = data.get('grading_template_id')
        template_instance = None
        if template_id:
            template_instance = GradingTemplate.objects.filter(id=template_id, teacher=user).first()
        
        schedule = ClassSchedule(
            teacher=user, 
            subject=subject_instance, 
            section=section_instance, 
            term=term_instance,
            grading_template=template_instance
        )
        
        if hasattr(schedule, 'room'):
            schedule.room = data.get('room', 'TBA')
        if hasattr(schedule, 'days'):
            days_list = data.get('days', [])
            schedule.days = ', '.join(days_list) if days_list else 'TBA'

        time_input = data.get('time', '')
        if time_input:
            times = re.findall(r'\d{1,2}:\d{2}(?:\s?[aApP][mM])?', time_input)
            
            def parse_to_24hr(t_str):
                t_str = t_str.strip().upper().replace('AM', ' AM').replace('PM', ' PM').replace('  ', ' ')
                try:
                    if 'AM' in t_str or 'PM' in t_str:
                        return datetime.strptime(t_str, '%I:%M %p').time()
                    return datetime.strptime(t_str, '%H:%M').time()
                except ValueError:
                    return None

            if len(times) >= 1 and hasattr(schedule, 'start_time'):
                parsed = parse_to_24hr(times[0])
                if parsed: schedule.start_time = parsed
            if len(times) >= 2 and hasattr(schedule, 'end_time'):
                parsed = parse_to_24hr(times[1])
                if parsed: schedule.end_time = parsed

        schedule.save()
        return Response({'message': 'Class added successfully'}, status=status.HTTP_201_CREATED)
    
class QuickEnrollView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data
        user = request.user

        program_code = data.get('program')
        program_instance = Program.objects.filter(code=program_code).first()

        subject_code = data.get('subject', 'CC 102')
        subject_instance, _ = Subject.objects.get_or_create(
            code=subject_code,
            defaults={'title': subject_code, 'units': 3}
        )

        student, _ = Student.objects.get_or_create(
            student_number=data.get('student_number'),
            defaults={
                'first_name': data.get('first_name'),
                'last_name': data.get('last_name'),
                'sex': data.get('sex', 'M'),
                'email': data.get('email', ''),
                'current_year_level': data.get('current_year_level', 1),
                'program': program_instance
            }
        )

        section_name = data.get('section', 'Block A')
        section_instance, _ = Section.objects.get_or_create(
            name=section_name, 
            defaults={'program': program_instance, 'year_level': data.get('current_year_level', 1)}
        )

        term = AcademicTerm.objects.filter(is_active=True).first()
        if not term:
            term = AcademicTerm.objects.first()

        schedule, _ = ClassSchedule.objects.get_or_create(
            teacher=user,
            subject=subject_instance,
            section=section_instance,
            defaults={
                'term': term,
                'is_active': True,
                'room': 'TBA'
            }
        )

        Enrollment.objects.get_or_create(class_field=schedule, student=student)

        return Response({'message': 'Student enrolled successfully!'}, status=status.HTTP_201_CREATED)

class AvailableStudentsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):

        students = Student.objects.all().select_related('program').order_by('last_name', 'first_name')
        
        data = []
        for s in students:
            data.append({
                "student_number": s.student_number,
                "first_name": s.first_name,
                "last_name": s.last_name,
                "program": s.program.code if s.program else "N/A",
                "current_year_level": str(s.current_year_level)
            })
            
        return Response(data)
    
class AvailableSubjectsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        
        subjects = Subject.objects.all().order_by('code')
        
        data = []
        for s in subjects:
            data.append({
                "code": s.code,
                "title": s.title
            })
            
        return Response(data)

class ClassActivitiesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, class_id):
        user = request.user
        try:
            schedule = ClassSchedule.objects.get(class_id=class_id, teacher=user)
        except ClassSchedule.DoesNotExist:
            return Response({'error': 'Class not found'}, status=404)

        assessments = Assessment.objects.filter(component__class_field=schedule).select_related('period')

        data = []
        for a in assessments:

            stats = StudentScore.objects.filter(assessment=a).aggregate(
                avg_score=Avg('score'),
                max_score=Max('score'),
                min_score=Min('score')
            )
            
            data.append({
                "id": a.assessment_id,
                "title": a.title,
                "type": a.assessment_type,
                "date": a.date_given.strftime('%b %d, %Y') if a.date_given else 'TBA',
                "perfect_score": float(a.total_points),
                "period": a.period.name if a.period else 'Unassigned',
                "period_order": a.period.sequence_order if a.period else 99,
                "class_avg": round(stats['avg_score'] or 0, 1),
                "highest": round(stats['max_score'] or 0, 1),
                "lowest": round(stats['min_score'] or 0, 1)
            })

        data.sort(key=lambda x: (x['period_order'], x['id']))
        return Response(data)

    def post(self, request, class_id):
        user = request.user
        data = request.data

        schedule = ClassSchedule.objects.filter(class_id=class_id, teacher=user).first()
        
        if not schedule:
             return Response({'error': 'Class not found'}, status=404)

        period_name = data.get('period')
        if not period_name:
            return Response(
                {'error': 'Grading Period is required. Please assign a Template in the Dashboard.'}, 
                status=400
            )

        period, _ = Period.objects.get_or_create(name=period_name, defaults={'sequence_order': 99})

        a_type = data.get('type', 'Activity')
        search_term = 'Activ' if a_type == 'Activity' else a_type
        component = GradingComponent.objects.filter(
            class_field=schedule,
            name__icontains=search_term
        ).first()

        if not component:
            return Response(
                {'error': f'No weight category found for "{a_type}". Please set up your Component Weights in the Gradebook first!'}, 
                status=400
            )

        Assessment.objects.create( 
            component=component,
            period=period,
            title=data.get('title'),
            assessment_type=a_type,
            total_points=data.get('perfect_score', 100),
            date_given=data.get('date') or None
        )
        
        return Response({'message': 'Activity created successfully!'}, status=201)
    
class ActivityScoringView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, assessment_id):
        assessment = Assessment.objects.filter(assessment_id=assessment_id).first()
        if not assessment:
            return Response({'error': 'Activity not found'}, status=404)
        
        class_field = assessment.component.class_field
        enrollments = Enrollment.objects.filter(class_field=class_field).select_related('student')
        
        scores = StudentScore.objects.filter(assessment=assessment).select_related('enrollment__student')

        score_map = {s.enrollment.student.student_number: s.score for s in scores}
        
        data = []
        for e in enrollments:
            data.append({
                "student_number": e.student.student_number,
                "first_name": e.student.first_name,
                "last_name": e.student.last_name,
                "raw_score": score_map.get(e.student.student_number, '') 
            })
        
        data.sort(key=lambda x: x['last_name'])
        return Response(data)

    def post(self, request, assessment_id):
        assessment = Assessment.objects.filter(assessment_id=assessment_id).first()
        student_number = request.data.get('student_number')
        raw_score = request.data.get('raw_score')

        enrollment = Enrollment.objects.filter(
            class_field=assessment.component.class_field, 
            student__student_number=student_number
        ).first()

        if not enrollment or not assessment:
            return Response({'error': 'Invalid data'}, status=400)

        if raw_score == '' or raw_score is None:
            StudentScore.objects.filter(assessment=assessment, enrollment=enrollment).delete()
        else:
            StudentScore.objects.update_or_create(
                assessment=assessment,
                enrollment=enrollment, 
                defaults={'score': raw_score}
            )

        class_field = assessment.component.class_field
        period = assessment.period
        template = class_field.grading_template
        transmutation_base = template.transmutation_base if template else 60

        components = GradingComponent.objects.filter(class_field=class_field)
        
        total_period_grade = 0
        total_active_weight = 0

        for comp in components:
            assessments = Assessment.objects.filter(component=comp, period=period)
            if not assessments.exists():
                continue

            student_scores = StudentScore.objects.filter(assessment__in=assessments, enrollment=enrollment)
            if not student_scores.exists():
                continue 

            graded_assessment_ids = student_scores.values_list('assessment_id', flat=True)
            graded_assessments = assessments.filter(assessment_id__in=graded_assessment_ids)
            
            perfect_total = sum(a.total_points for a in graded_assessments)
            raw_total = sum(s.score for s in student_scores)

            if perfect_total > 0:
                percentage = (float(raw_total) / float(perfect_total)) * (100 - transmutation_base) + transmutation_base
                comp_weight = float(comp.weight_percentage or 0)
                
                weighted_score = percentage * (comp_weight / 100.0)
                
                total_period_grade += weighted_score
                total_active_weight += comp_weight

        if total_active_weight > 0:
            total_period_grade = (total_period_grade / total_active_weight) * 100
            total_period_grade = min(100.0, max(float(transmutation_base), total_period_grade))

            PeriodGrade.objects.update_or_create(
                enrollment=enrollment,
                period=period,
                defaults={'computed_grade': round(total_period_grade, 2)}
            )
        else:
            PeriodGrade.objects.filter(enrollment=enrollment, period=period).delete()

        return Response({'message': 'Score saved & Gradebook updated!'})

class ClassAttendanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, class_id):
        date_str = request.GET.get('date')
        if not date_str:
            return Response({'error': 'Date is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        schedule = ClassSchedule.objects.filter(class_id=class_id, teacher=request.user).first()
        if not schedule:
            return Response({'error': 'Class not found'}, status=status.HTTP_404_NOT_FOUND)

        enrollments = Enrollment.objects.filter(class_field=schedule).select_related('student')

        records = Attendance.objects.filter(enrollment__class_field=schedule, date_logged=date_str)
        status_map = {r.enrollment.enrollment_id: r.status for r in records}
        
        data = []
        for e in enrollments:
            data.append({
                "enrollment_id": e.enrollment_id,
                "student_number": e.student.student_number,
                "first_name": e.student.first_name,
                "last_name": e.student.last_name,
                "status": status_map.get(e.enrollment_id, None) 
            })
        
        data.sort(key=lambda x: x['last_name'])
        return Response(data)

    def post(self, request, class_id):
        enrollment_id = request.data.get('enrollment_id')
        date_str = request.data.get('date')
        status_val = request.data.get('status')
        
        enrollment = Enrollment.objects.filter(enrollment_id=enrollment_id).first()
        if not enrollment:
            return Response({'error': 'Invalid enrollment'}, status=status.HTTP_400_BAD_REQUEST)

        Attendance.objects.update_or_create(
            enrollment=enrollment,
            date_logged=date_str, 
            defaults={'status': status_val}
        )
        return Response({'message': 'Attendance saved'})

class ClassAttendanceSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, class_id):
        schedule = ClassSchedule.objects.filter(class_id=class_id, teacher=request.user).first()
        if not schedule:
            return Response({'error': 'Class not found'}, status=status.HTTP_404_NOT_FOUND)

        enrollments = Enrollment.objects.filter(class_field=schedule).select_related('student')
        records = Attendance.objects.filter(enrollment__class_field=schedule).order_by('date_logged')

        unique_dates = sorted(list(set(r.date_logged.strftime('%Y-%m-%d') for r in records)))

        attendance_map = {}
        for r in records:
            if r.enrollment_id not in attendance_map:
                attendance_map[r.enrollment_id] = {}
            attendance_map[r.enrollment_id][r.date_logged.strftime('%Y-%m-%d')] = r.status

        data = {
            "dates": unique_dates,
            "students": []
        }

        for e in enrollments:
            data["students"].append({
                "enrollment_id": e.enrollment_id,
                "student_number": e.student.student_number,
                "first_name": e.student.first_name,
                "last_name": e.student.last_name,
                "attendance": attendance_map.get(e.enrollment_id, {})
            })

        data["students"].sort(key=lambda x: x['last_name'])
        return Response(data)
    
class ScheduleManageView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, schedule_id):
        try:
            schedule = ClassSchedule.objects.get(class_id=schedule_id, teacher=request.user)
        except ClassSchedule.DoesNotExist:
            return Response({'error': 'Schedule not found'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        
        if 'subject' in data:
            subject_instance, _ = Subject.objects.get_or_create(
                code=data['subject'],
                defaults={'title': data.get('title', data['subject'])}
            )
            schedule.subject = subject_instance
            
        if 'section' in data:
            program_instance, _ = Program.objects.get_or_create(code="GEN", defaults={"name": "General Program"})
            section_instance, _ = Section.objects.get_or_create(name=data['section'], defaults={'program': program_instance})
            schedule.section = section_instance

        if hasattr(schedule, 'room') and 'room' in data:
            schedule.room = data['room']
        if hasattr(schedule, 'days') and 'days' in data:
            days_list = data['days']
            schedule.days = ', '.join(days_list) if isinstance(days_list, list) else days_list

        if 'grading_template_id' in data:
            template_id = data['grading_template_id']
            if template_id:
                schedule.grading_template = GradingTemplate.objects.filter(id=template_id, teacher=request.user).first()
            else:
                schedule.grading_template = None

        if 'time' in data:
            time_input = data['time']
            times = re.findall(r'\d{1,2}:\d{2}(?:\s?[aApP][mM])?', time_input)
            
            def parse_to_24hr(t_str):
                t_str = t_str.strip().upper().replace('AM', ' AM').replace('PM', ' PM').replace('  ', ' ')
                try:
                    if 'AM' in t_str or 'PM' in t_str:
                        return datetime.strptime(t_str, '%I:%M %p').time()
                    return datetime.strptime(t_str, '%H:%M').time()
                except ValueError:
                    return None

            if len(times) >= 1 and hasattr(schedule, 'start_time'):
                parsed = parse_to_24hr(times[0])
                if parsed: schedule.start_time = parsed
            if len(times) >= 2 and hasattr(schedule, 'end_time'):
                parsed = parse_to_24hr(times[1])
                if parsed: schedule.end_time = parsed

        schedule.save()
        return Response({'message': 'Schedule updated successfully'})

    def delete(self, request, schedule_id):
        try:
            schedule = ClassSchedule.objects.get(class_id=schedule_id, teacher=request.user)
            schedule.delete()
            return Response({'message': 'Schedule deleted'}, status=status.HTTP_204_NO_CONTENT)
        except ClassSchedule.DoesNotExist:
            return Response({'error': 'Schedule not found'}, status=status.HTTP_404_NOT_FOUND)
        
class EventListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        
        events = Event.objects.filter(teacher=request.user, date__gte=date.today())
        
        data = [{"id": e.id, "text": e.title, "date": e.date.strftime('%Y-%m-%d')} for e in events]
        return Response(data)

    def post(self, request):
        title = request.data.get('text')
        date_str = request.data.get('date')
        
        if not title or not date_str:
            return Response({'error': 'Title and Date are required'}, status=status.HTTP_400_BAD_REQUEST)
            
        event = Event.objects.create(teacher=request.user, title=title, date=date_str)
        
        return Response({
            "id": event.id, "text": event.title, "date": date_str
        }, status=status.HTTP_201_CREATED)

class EventDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, event_id):
        try:
            event = Event.objects.get(id=event_id, teacher=request.user)
            event.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Event.DoesNotExist:
            return Response({'error': 'Event not found'}, status=status.HTTP_404_NOT_FOUND)
        
class ClassComponentsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, class_id):
        schedule = ClassSchedule.objects.filter(class_id=class_id, teacher=request.user).first()
        if not schedule:
            return Response({'error': 'Class not found'}, status=404)
        
        components = GradingComponent.objects.filter(class_field=schedule)
        
        data = []
        for c in components:
            safe_weight = c.weight_percentage if c.weight_percentage is not None else 0.0
            data.append({
                "id": c.pk, 
                "name": c.name, 
                "weight_percentage": float(safe_weight)
            })
            
        return Response(data)

    def put(self, request, class_id):
        schedule = ClassSchedule.objects.filter(class_id=class_id, teacher=request.user).first()
        if not schedule:
            return Response({'error': 'Class not found'}, status=404)

        components_data = request.data.get('components', [])
        for comp in components_data:
            comp_id = comp.get('id')
            comp_name = comp.get('name', '').strip()
            comp_weight = comp.get('weight_percentage', 0.0)

            if not comp_name:
                continue

            if comp_id:

                GradingComponent.objects.filter(pk=comp_id, class_field=schedule).update(
                    name=comp_name,
                    weight_percentage=comp_weight
                )
            else:

                GradingComponent.objects.update_or_create(
                    class_field=schedule,
                    name=comp_name,
                    defaults={'weight_percentage': comp_weight}
                )
            
        return Response({'message': 'Component weights updated successfully'})

class StudentPeriodBreakdownView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, class_id, student_number, period_name):
        clean_period_name = unquote(period_name)
        schedule = ClassSchedule.objects.filter(class_id=class_id, teacher=request.user).first()
        if not schedule:
            return Response({'error': 'Class not found'}, status=404)
        
        try:
            
            assessments = Assessment.objects.filter(
                component__class_field=schedule, 
                period__name__iexact=clean_period_name
            ).select_related('component')
            
            scores = StudentScore.objects.filter(
                assessment__in=assessments, 
                enrollment__student__student_number=student_number,
                enrollment__class_field=schedule
            )

            score_map = {s.assessment.pk: float(s.score) for s in scores}
            
            data = []
            for a in assessments:
                data.append({
                    "assessment_id": a.pk,
                    "title": a.title,
                    "type": a.component.name if a.component else "Uncategorized",
                    "component_weight": float(a.component.weight_percentage) if a.component and a.component.weight_percentage else 0.0,
                    "perfect_score": float(a.total_points or 100),
                    "raw_score": score_map.get(a.pk, None)
                })
                
            return Response(data)
            
        except Exception as e:
            print(f"Drill-down breakdown error: {e}")
            return Response({'error': 'Failed to load breakdown'}, status=500)

class NotificationView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.now().date()

        events_today = Event.objects.filter(teacher=request.user, date=today)
        for event in events_today:
            msg = f"Reminder: You have an event today — {event.title}"
            
            if not Notification.objects.filter(user=request.user, message=msg, created_at__date=today).exists():
                Notification.objects.create(user=request.user, message=msg)

        assessments_today = Assessment.objects.filter(
            component__class_field__teacher=request.user,
            date_given=today
        )

        for assessment in assessments_today:
            subject_code = assessment.component.class_field.subject.code
            msg = f"{assessment.assessment_type} Today: '{assessment.title}' for {subject_code}"
            
            if not Notification.objects.filter(user=request.user, message=msg, created_at__date=today).exists():
                Notification.objects.create(user=request.user, message=msg)

        notifs = Notification.objects.filter(user=request.user)[:10]
        data = [{
            "id": n.id, 
            "message": n.message, 
            "is_read": n.is_read, 
            "date": n.created_at.strftime("%b %d")
        } for n in notifs]
        
        return Response(data)

    def post(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"message": "Notifications marked as read"})