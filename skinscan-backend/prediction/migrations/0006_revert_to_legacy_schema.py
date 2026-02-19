# Generated manually to revert schema to match models.py

from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    dependencies = [
        ('prediction', '0005_bodylocation_and_more'),
    ]

    operations = [
        # Revert PredictionResult changes
        migrations.AddField(
            model_name='predictionresult',
            name='disease_name',
            field=models.CharField(default='Unknown', max_length=100, blank=True, null=True),
        ),
        migrations.RemoveField(
            model_name='predictionresult',
            name='disease',
        ),

        # Revert ScanHistory BodyLocation changes
        migrations.RemoveField(
            model_name='scanhistory',
            name='body_location',
        ),
        migrations.AddField(
            model_name='scanhistory',
            name='body_location',
            field=models.CharField(blank=True, max_length=50, default=''),
        ),

        # Delete BodyLocation model
        migrations.DeleteModel(
            name='BodyLocation',
        ),
    ]
