# Generated by Django 2.2 on 2021-08-26 13:40

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('account', '0009_auto_20210324_2107'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='userprofile',
            name='jira_url',
        ),
    ]
