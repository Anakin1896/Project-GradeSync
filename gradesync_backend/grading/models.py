from django.db import models
from django.db.models import Sum
from django.conf import settings

class ClassSchedule(models.Model):
    class_id = models.AutoField(primary_key=True)
    term = models.ForeignKey('core.AcademicTerm', on_delete=models.CASCADE)
    subject = models.ForeignKey('core.Subject', on_delete=models.CASCADE)
    section = models.ForeignKey('students.Section', on_delete=models.CASCADE)
    teacher = models.ForeignKey('accounts.User', on_delete=models.CASCADE)
    grading_template = models.ForeignKey('GradingTemplate', on_delete=models.SET_NULL, null=True, blank=True)
    room = models.CharField(max_length=50)
    days = models.CharField(max_length=100, blank=True, null=True, default='TBA')
    days_of_week = models.CharField(max_length=50, null=True, blank=True, help_text="e.g., M-W-F or T-Th")
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    schedule_text = models.CharField(max_length=100, null=True, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.subject.code} - {self.section.name} ({self.teacher.last_name})"

class TeacherSchedule(models.Model):
    schedule_id = models.AutoField(primary_key=True)
    teacher = models.ForeignKey('accounts.User', on_delete=models.CASCADE)
    day = models.CharField(max_length=20)
    subject = models.CharField(max_length=100)
    description = models.CharField(max_length=255)
    time = models.CharField(max_length=100)
    room = models.CharField(max_length=100)
    type = models.CharField(max_length=50)

class Enrollment(models.Model):
    enrollment_id = models.AutoField(primary_key=True)
    class_field = models.ForeignKey(ClassSchedule, on_delete=models.CASCADE)
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE)
    final_grade = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    remarks = models.CharField(max_length=20, null=True, blank=True)
    enrolled_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    def calculate_final_grade(self):
        period_grades = self.period_grades.all()
        if not period_grades.exists():
            return None

        template = self.class_field.grading_template
        final_computed_grade = 0
        total_weight_applied = 0

        if template and template.items.filter(period__isnull=False).exists():
            for pg in period_grades:
                if pg.computed_grade is not None:
                    template_item = template.items.filter(period=pg.period).first()
                    weight = template_item.weight_percentage if template_item else 0
                    
                    final_computed_grade += float(pg.computed_grade) * (float(weight) / 100)
                    total_weight_applied += float(weight)

            if total_weight_applied > 0:
                self.final_grade = round((final_computed_grade / total_weight_applied) * 100, 2)
            else:
                self.final_grade = 0

        else:
            total = sum([pg.computed_grade for pg in period_grades if pg.computed_grade is not None])
            count = period_grades.filter(computed_grade__isnull=False).count()
            if count > 0:
                self.final_grade = round(total / count, 2)

            if self.final_grade is not None:
                if self.final_grade >= 75:
                    self.remarks = "Passed"
                elif self.final_grade >= 70:
                    self.remarks = "Conditional"
                else:
                    self.remarks = "Failed"
                
                self.save()
                return self.final_grade
            
            return None

    def __str__(self):
        return f"{self.student.last_name} enrolled in {self.class_field.subject.code}"

class Attendance(models.Model):
    attendance_id = models.AutoField(primary_key=True)
    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE)
    date_logged = models.DateField()
    status = models.CharField(max_length=20)
    reason = models.TextField(null=True, blank=True)

class GradingComponent(models.Model):
    component_id = models.AutoField(primary_key=True)
    class_field = models.ForeignKey(ClassSchedule, on_delete=models.CASCADE)
    name = models.CharField(max_length=50)
    weight_percentage = models.DecimalField(max_digits=5, decimal_places=2)

class Assessment(models.Model):
    assessment_id = models.AutoField(primary_key=True)
    component = models.ForeignKey(GradingComponent, on_delete=models.CASCADE)
    period = models.ForeignKey('core.Period', on_delete=models.SET_NULL, null=True, blank=True)
    title = models.CharField(max_length=100)

    ASSESSMENT_TYPES = [
        ('Quiz', 'Quiz'),
        ('Activity', 'Activity'),
        ('Exam', 'Exam'),
        ('Project', 'Project')
    ]
    assessment_type = models.CharField(max_length=20, choices=ASSESSMENT_TYPES, default='Activity')

    total_points = models.DecimalField(max_digits=5, decimal_places=2, default=100.00)
    date_given = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"{self.title} ({self.component.name})"

class StudentScore(models.Model):
    score_id = models.AutoField(primary_key=True)
    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE)
    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE)
    score = models.DecimalField(max_digits=5, decimal_places=2)

class PeriodGrade(models.Model):
    grade_id = models.AutoField(primary_key=True)
    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name='period_grades')
    period = models.ForeignKey('core.Period', on_delete=models.CASCADE)
    computed_grade = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    class Meta:
        unique_together = ('enrollment', 'period')

    def calculate_grade(self):
        total_period_grade = 0
        class_schedule = self.enrollment.class_field
        template = class_schedule.grading_template
        base = template.transmutation_base if template else 0
        multiplier = 100 - base

        components = GradingComponent.objects.filter(class_field=class_schedule)
        
        for component in components:
            assessments = Assessment.objects.filter(component=component, period=self.period)
            
            if not assessments.exists():
                continue 

            total_perfect_score = assessments.aggregate(Sum('total_points'))['total_points__sum'] or 0

            student_scores = StudentScore.objects.filter(
                enrollment=self.enrollment, 
                assessment__in=assessments
            ).aggregate(Sum('score'))['score__sum'] or 0

            if total_perfect_score > 0:
              
                transmuted_grade = (float(student_scores) / float(total_perfect_score)) * multiplier + base
                weighted_score = transmuted_grade * (float(component.weight_percentage) / 100)
                total_period_grade += weighted_score


        self.computed_grade = round(total_period_grade, 2)
        self.save()
        
        return self.computed_grade

    def __str__(self):
        return f"{self.enrollment.student.last_name} - {self.period.name}: {self.computed_grade}"

class Event(models.Model):
    teacher = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['date']

    def __str__(self):
        return f"{self.title} ({self.date})"

class GradingTemplate(models.Model):
    BASE_CHOICES = [
        (0, 'Base 0 (Straight Percentage)'),
        (50, 'Base 50 (Standard K-12)'),
        (60, 'Base 60 (College Standard)'),
    ]

    teacher = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='grading_templates')
    name = models.CharField(max_length=100)
    is_default = models.BooleanField(default=False)
    transmutation_base = models.IntegerField(choices=BASE_CHOICES, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.teacher.last_name})"

class TemplateItem(models.Model):
    template = models.ForeignKey(GradingTemplate, on_delete=models.CASCADE, related_name='items')
    name = models.CharField(max_length=50) 
    weight_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    period = models.ForeignKey('core.Period', on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.name} - {self.weight_percentage}%"
    
class Notification(models.Model):
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='notifications')
    message = models.CharField(max_length=255)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notif for {self.user.username}: {self.message}"