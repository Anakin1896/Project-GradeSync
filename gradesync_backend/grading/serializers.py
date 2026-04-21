from rest_framework import serializers
from .models import (
    ClassSchedule, TeacherSchedule, Enrollment, 
    Attendance, GradingComponent, Assessment, StudentScore, 
    GradingTemplate, TemplateItem, PeriodGrade
)

class TemplateItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = TemplateItem
        fields = ['name', 'weight_percentage']

class GradingTemplateSerializer(serializers.ModelSerializer):
    items = TemplateItemSerializer(many=True)
    teacher = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = GradingTemplate
        fields = ['id', 'teacher', 'name', 'transmutation_base', 'is_default', 'created_at', 'items']

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        template = GradingTemplate.objects.create(**validated_data)
        
        for item_data in items_data:
            from core.models import Period 
            period_instance, _ = Period.objects.get_or_create(
                name=item_data.get('name'), 
                defaults={'sequence_order': 99}
            )
            from .models import TemplateItem
            TemplateItem.objects.create(
                template=template,
                period=period_instance,
                name=item_data.get('name'),
                weight_percentage=item_data.get('weight_percentage')
            )
        return template

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', [])

        instance.name = validated_data.get('name', instance.name)
        instance.transmutation_base = validated_data.get('transmutation_base', instance.transmutation_base)
        instance.save()
        instance.items.all().delete()
        
        for item_data in items_data:
            from core.models import Period
            period_instance, _ = Period.objects.get_or_create(
                name=item_data.get('name'), 
                defaults={'sequence_order': 99}
            )
            from .models import TemplateItem
            TemplateItem.objects.create(
                template=instance,
                period=period_instance,
                name=item_data.get('name'),
                weight_percentage=item_data.get('weight_percentage')
            )
        return instance

class ClassScheduleSerializer(serializers.ModelSerializer):
    grading_template = GradingTemplateSerializer(read_only=True)
    grading_template_id = serializers.PrimaryKeyRelatedField(
        queryset=GradingTemplate.objects.all(),
        source='grading_template',
        write_only=True,
        required=False,
        allow_null=True
    )
    
    class Meta:
        model = ClassSchedule
        fields = '__all__'

class TeacherScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeacherSchedule
        fields = '__all__'

class PeriodGradeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PeriodGrade
        fields = '__all__'

class EnrollmentSerializer(serializers.ModelSerializer):
    period_grades = PeriodGradeSerializer(many=True, read_only=True)
    
    class Meta:
        model = Enrollment
        fields = '__all__'
        depth = 2

class AttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = '__all__'

class GradingComponentSerializer(serializers.ModelSerializer):
    class Meta:
        model = GradingComponent
        fields = '__all__'

class AssessmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Assessment
        fields = '__all__'

class StudentScoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentScore
        fields = '__all__'