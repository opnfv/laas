# Generated by Django 2.2 on 2021-07-01 20:45

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('resource_inventory', '0019_auto_20210701_1947'),
        ('booking', '0008_auto_20201109_1947'),
        ('api', '0017_auto_20210630_1629'),
    ]

    operations = [
        migrations.CreateModel(
            name='CloudInitFile',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('resource_id', models.CharField(max_length=200)),
                ('booking', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='booking.Booking')),
                ('rconfig', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='resource_inventory.ResourceConfiguration')),
            ],
        ),
    ]
