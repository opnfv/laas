# Generated by Django 2.2 on 2021-05-26 17:56

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('resource_inventory', '0017_auto_20201218_1516'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='image',
            name='lab_id',
        ),
        migrations.AddField(
            model_name='image',
            name='available',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='image',
            name='cobbler_id',
            field=models.CharField(default='', max_length=100),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='opsys',
            name='available',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='opsys',
            name='cobbler_id',
            field=models.CharField(default='', max_length=100),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='opsys',
            name='obsolete',
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name='image',
            name='name',
            field=models.CharField(max_length=100),
        ),
    ]
