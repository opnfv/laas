# Generated by Django 2.1 on 2018-10-17 15:32

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='job',
            name='delta',
        ),
    ]
