from django.db import models

class Section(models.Model):
    section_id = models.AutoField(primary_key=True)
    program = models.ForeignKey('core.Program', on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    year_level = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return self.name

class Student(models.Model):
    student_id = models.AutoField(primary_key=True)
    student_number = models.CharField(unique=True, max_length=20)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, null=True, blank=True)
    sex = models.CharField(max_length=1, choices=[('M', 'Male'), ('F', 'Female')], null=True, blank=True)
    email = models.CharField(max_length=100, null=True, blank=True)
    program = models.ForeignKey('core.Program', on_delete=models.SET_NULL, null=True, blank=True)
    current_year_level = models.IntegerField(default=1)
    is_regular = models.BooleanField(default=True)

    STANDING_CHOICES = [
        ('Regular', 'Regular'),
        ('Conditional', 'Conditional'),
        ('At Risk', 'At Risk'),
    ]
    standing = models.CharField(max_length=20, choices=STANDING_CHOICES, default='Regular')

    def __str__(self):
        return f"{self.last_name}, {self.first_name} ({self.student_number})"