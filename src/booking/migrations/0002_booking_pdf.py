# Generated by Django 2.1 on 2018-11-09 16:09

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('booking', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='pdf',
            field=models.TextField(blank=True, default=''),
        ),
    ]
