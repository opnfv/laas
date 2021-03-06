# Generated by Django 2.2 on 2020-02-18 15:36

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import resource_inventory.models


def clear_resource_bundles(apps, schema_editor):
    ResourceBundle = apps.get_model('resource_inventory', 'ResourceBundle')
    for rb in ResourceBundle.objects.all():
        rb.template = None
        rb.save()


def create_default_template(apps, schema_editor):
    ResourceTemplate = apps.get_model('resource_inventory', 'ResourceTemplate')
    ResourceTemplate.objects.create(name="Default Template", hidden=True)


def populate_servers(apps, schema_editor):
    """Convert old Host models to Server Resources."""
    Host = apps.get_model('resource_inventory', 'Host')
    Server = apps.get_model('resource_inventory', 'Server')
    ResourceProfile = apps.get_model('resource_inventory', 'ResourceProfile')
    for h in Host.objects.all():
        rp = ResourceProfile.objects.get(id=h.profile.id)
        server = Server.objects.create(
            working=h.working,
            vendor=h.vendor,
            labid=h.labid,
            booked=h.booked,
            name=h.labid,
            lab=h.lab,
            profile=rp
        )

        for iface in h.interfaces.all():
            server.interfaces.add(iface)


def populate_resource_templates(apps, schema_editor):
    """
    Convert old GenericResourceBundles to ResourceTemplate.

    This will be kept blank for now. If, during testing, we realize
    we want to implement this, we will. For now, it seems
    fine to let the old models just die and create
    new ones as needed.
    """
    pass


def populate_resource_profiles(apps, schema_editor):
    """
    Convert old HostProfile models to ResourceProfiles.

    Also updates all the foreign keys pointed to the old
    host profile. This change was basically only a name change.
    """
    HostProfile = apps.get_model('resource_inventory', 'HostProfile')
    ResourceProfile = apps.get_model('resource_inventory', 'ResourceProfile')
    for hp in HostProfile.objects.all():
        rp = ResourceProfile.objects.create(id=hp.id, name=hp.name, description=hp.description)
        rp.labs.add(*list(hp.labs.all()))
        """
        TODO: link these models together
        rp.interfaceprofile = hp.interfaceprofile
        rp.storageprofile = hp.storageprofile
        rp.cpuprofile = hp.cpuprofile
        rp.ramprofile = hp.ramprofile
        rp.save()
        hp.interfaceprofile.host = rp
        rp.storageprofile.host = rp
        rp.cpuprofile.host = rp
        rp.ramprofile.host = rp
        rp.interfaceprofile.save()
        rp.storageprofile.save()
        rp.cpuprofile.save()
        rp.ramprofile.save()
        """


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('booking', '0007_remove_booking_config_bundle'),
        ('account', '0004_downtime'),
        ('api', '0013_manual_20200218_1536'),
        ('resource_inventory', '0012_manual_20200218_1536'),
    ]

    operations = [
        migrations.CreateModel(
            name='InterfaceConfiguration',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('connections', models.ManyToManyField(to='resource_inventory.NetworkConnection')),
            ],
        ),
        migrations.CreateModel(
            name='ResourceConfiguration',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('is_head_node', models.BooleanField(default=False)),
            ],
        ),
        migrations.CreateModel(
            name='ResourceOPNFVConfig',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
            ],
        ),
        migrations.CreateModel(
            name='ResourceProfile',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=200, unique=True)),
                ('description', models.TextField()),
                ('labs', models.ManyToManyField(related_name='resourceprofiles', to='account.Lab')),
            ],
        ),
        migrations.RunPython(populate_resource_profiles),
        migrations.CreateModel(
            name='ResourceTemplate',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=300, unique=True)),
                ('xml', models.TextField()),
                ('description', models.CharField(default='', max_length=1000)),
                ('public', models.BooleanField(default=False)),
                ('hidden', models.BooleanField(default=False)),
                ('lab', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='resourcetemplates', to='account.Lab')),
                ('owner', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.RunPython(populate_resource_templates),
        migrations.CreateModel(
            name='Server',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('working', models.BooleanField(default=True)),
                ('vendor', models.CharField(default='unknown', max_length=100)),
                ('model', models.CharField(default='unknown', max_length=150)),
                ('labid', models.CharField(default='default_id', max_length=200, unique=True)),
                ('booked', models.BooleanField(default=False)),
                ('name', models.CharField(max_length=200, unique=True)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.AddField(
            model_name='server',
            name='bundle',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='resource_inventory.ResourceBundle'),
        ),
        migrations.AddField(
            model_name='server',
            name='config',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='resource_inventory.ResourceConfiguration'),
        ),
        migrations.AddField(
            model_name='server',
            name='interfaces',
            field=models.ManyToManyField(to='resource_inventory.Interface'),
        ),
        migrations.AddField(
            model_name='server',
            name='lab',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='account.Lab'),
        ),
        migrations.AddField(
            model_name='server',
            name='profile',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='resource_inventory.ResourceProfile'),
        ),
        migrations.AddField(
            model_name='server',
            name='remote_management',
            field=models.ForeignKey(default=resource_inventory.models.get_default_remote_info, on_delete=models.SET(resource_inventory.models.get_default_remote_info), to='resource_inventory.RemoteInfo'),
        ),
        migrations.RunPython(populate_servers),
        migrations.RemoveField(
            model_name='generichost',
            name='profile',
        ),
        migrations.RemoveField(
            model_name='generichost',
            name='resource',
        ),
        migrations.RemoveField(
            model_name='genericinterface',
            name='connections',
        ),
        migrations.RemoveField(
            model_name='genericinterface',
            name='host',
        ),
        migrations.RemoveField(
            model_name='genericinterface',
            name='profile',
        ),
        migrations.RemoveField(
            model_name='genericresource',
            name='bundle',
        ),
        migrations.RemoveField(
            model_name='genericresourcebundle',
            name='lab',
        ),
        migrations.RemoveField(
            model_name='genericresourcebundle',
            name='owner',
        ),
        migrations.RemoveField(
            model_name='host',
            name='bundle',
        ),
        migrations.RemoveField(
            model_name='host',
            name='config',
        ),
        migrations.RemoveField(
            model_name='host',
            name='lab',
        ),
        migrations.RemoveField(
            model_name='host',
            name='profile',
        ),
        migrations.RemoveField(
            model_name='host',
            name='remote_management',
        ),
        migrations.RemoveField(
            model_name='host',
            name='template',
        ),
        migrations.RemoveField(
            model_name='hostconfiguration',
            name='bundle',
        ),
        migrations.RemoveField(
            model_name='hostconfiguration',
            name='host',
        ),
        migrations.RemoveField(
            model_name='hostconfiguration',
            name='image',
        ),
        migrations.RemoveField(
            model_name='hostopnfvconfig',
            name='host_config',
        ),
        migrations.RemoveField(
            model_name='hostopnfvconfig',
            name='opnfv_config',
        ),
        migrations.RemoveField(
            model_name='hostopnfvconfig',
            name='role',
        ),
        migrations.RemoveField(
            model_name='hostprofile',
            name='labs',
        ),
        migrations.RemoveField(
            model_name='interface',
            name='host',
        ),
        migrations.RemoveField(
            model_name='interface',
            name='name',
        ),
        migrations.RemoveField(
            model_name='opnfvconfig',
            name='bundle',
        ),
        migrations.AddField(
            model_name='interface',
            name='profile',
            field=models.ForeignKey(default=1, on_delete=django.db.models.deletion.CASCADE, to='resource_inventory.InterfaceProfile'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='interfaceprofile',
            name='order',
            field=models.IntegerField(default=-1),
        ),
        migrations.AlterField(
            model_name='cpuprofile',
            name='host',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='cpuprofile', to='resource_inventory.ResourceProfile'),
        ),
        migrations.AlterField(
            model_name='diskprofile',
            name='host',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='storageprofile', to='resource_inventory.ResourceProfile'),
        ),
        migrations.AlterField(
            model_name='image',
            name='host_type',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='resource_inventory.ResourceProfile'),
        ),
        migrations.AlterField(
            model_name='interfaceprofile',
            name='host',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='interfaceprofile', to='resource_inventory.ResourceProfile'),
        ),
        migrations.AlterField(
            model_name='network',
            name='bundle',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='networks', to='resource_inventory.ResourceTemplate'),
        ),
        migrations.AlterField(
            model_name='ramprofile',
            name='host',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='ramprofile', to='resource_inventory.ResourceProfile'),
        ),
        migrations.RunPython(clear_resource_bundles),
        migrations.AlterField(
            model_name='resourcebundle',
            name='template',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='resource_inventory.ResourceTemplate'),
        ),
        migrations.DeleteModel(
            name='ConfigBundle',
        ),
        migrations.DeleteModel(
            name='GenericHost',
        ),
        migrations.DeleteModel(
            name='GenericInterface',
        ),
        migrations.DeleteModel(
            name='GenericResource',
        ),
        migrations.DeleteModel(
            name='GenericResourceBundle',
        ),
        migrations.DeleteModel(
            name='HostConfiguration',
        ),
        migrations.DeleteModel(
            name='HostOPNFVConfig',
        ),
        migrations.DeleteModel(
            name='HostProfile',
        ),
        migrations.DeleteModel(
            name='Host',
        ),
        migrations.AddField(
            model_name='resourceopnfvconfig',
            name='opnfv_config',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='resource_opnfv_config', to='resource_inventory.OPNFVConfig'),
        ),
        migrations.AddField(
            model_name='resourceopnfvconfig',
            name='resource_config',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='resource_opnfv_config', to='resource_inventory.ResourceConfiguration'),
        ),
        migrations.AddField(
            model_name='resourceopnfvconfig',
            name='role',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='resource_opnfv_configs', to='resource_inventory.OPNFVRole'),
        ),
        migrations.AddField(
            model_name='resourceconfiguration',
            name='image',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='resource_inventory.Image'),
        ),
        migrations.AddField(
            model_name='resourceconfiguration',
            name='profile',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='resource_inventory.ResourceProfile'),
        ),
        migrations.AddField(
            model_name='resourceconfiguration',
            name='template',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='resourceConfigurations', to='resource_inventory.ResourceTemplate'),
        ),
        migrations.AddField(
            model_name='interfaceconfiguration',
            name='profile',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='resource_inventory.InterfaceProfile'),
        ),
        migrations.AddField(
            model_name='interfaceconfiguration',
            name='resource_config',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='interface_configs', to='resource_inventory.ResourceConfiguration'),
        ),
        migrations.AddField(
            model_name='interface',
            name='acts_as',
            field=models.OneToOneField(null=True, on_delete=django.db.models.deletion.SET_NULL, to='resource_inventory.InterfaceConfiguration'),
        ),
        migrations.RunPython(create_default_template),
        migrations.AddField(
            model_name='opnfvconfig',
            name='template',
            field=models.ForeignKey(default=1, on_delete=django.db.models.deletion.CASCADE, related_name='opnfv_config', to='resource_inventory.ResourceTemplate'),
            preserve_default=False,
        ),
    ]
