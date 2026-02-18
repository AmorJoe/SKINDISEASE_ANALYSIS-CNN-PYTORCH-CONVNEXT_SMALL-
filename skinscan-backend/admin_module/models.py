from django.db import models

class DiseaseInfo(models.Model):
    name = models.CharField(max_length=100, unique=True)
    category = models.CharField(max_length=100)
    description = models.TextField()
    symptoms = models.TextField(blank=True, null=True)
    prevention = models.TextField(blank=True, null=True)
    icon_class = models.CharField(max_length=50, default='fas fa-disease')
    learn_more_url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class AppSetting(models.Model):
    key = models.CharField(max_length=100, unique=True)
    value = models.TextField()
    description = models.TextField(blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.key
