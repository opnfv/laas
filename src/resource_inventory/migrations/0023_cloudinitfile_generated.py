# Generated by Django 2.2 on 2022-01-04 20:17

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('resource_inventory', '0022_auto_20210925_2028'),
    ]

    operations = [
        migrations.AddField(
            model_name='cloudinitfile',
            name='generated',
            field=models.BooleanField(default=False),
        ),
    ]
