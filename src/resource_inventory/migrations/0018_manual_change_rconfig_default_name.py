from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):
    dependencies = [
        ('resource_inventory', '0016_auto_20201109_1947'),
    ]
    operations = [
        migrations.AlterField(
                model_name='resourceconfiguration',
                name='name',
                field=models.CharField(default='opnfv_host')
        ),
    ]
