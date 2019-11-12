# Generated by Django 2.2 on 2020-01-03 18:50

from django.db import migrations, models
import django.db.models.deletion


def genTempVlanNetwork(apps, editor):
    Vlan = apps.get_model("resource_inventory", "Vlan")
    Network = apps.get_model("resource_inventory", "Network")
    tempVlanNetwork = apps.get_model("resource_inventory", "tempVlanNetwork")
    for vlan in Vlan.objects.filter(network__isnull=False):
        tempVlanNetwork.objects.create(network=vlan.network, vlan=vlan)

def pairVlanPhysicalNetworks(apps, editor):
    PhysicalNetwork = apps.get_model("resource_inventory", "PhysicalNetwork")
    tempVlanPair = apps.get_model("resource_inventory", "tempVlanNetwork")
    for pair in tempVlanPair.objects.all():
        physicalNetwork = PhysicalNetwork.objects.create(vlan_id=vlan.vlan_id,
                generic_network=pair.network)
        pair.vlan.network = physicalNetwork


class Migration(migrations.Migration):

    dependencies = [
        ('resource_inventory', '0011_auto_20191106_2024'),
    ]

    operations = [
        migrations.CreateModel(
            name='PhysicalNetwork',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('vlan_id', models.IntegerField()),
                ('generic_network', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='resource_inventory.Network')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.AlterField(
            model_name='host',
            name='id',
            field=models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID'),
        ),
        migrations.AlterField(
            model_name='resourcebundle',
            name='id',
            field=models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID'),
        ),
        migrations.CreateModel(
            name='tempVlanNetwork',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('vlan', models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, to='resource_inventory.vlan')),
                ('network', models.ForeignKey(null=True, to='resource_inventory.network', on_delete=django.db.models.deletion.CASCADE)),
            ]
        ),
        migrations.RunPython(genTempVlanNetwork),
        migrations.AlterField(
            model_name='vlan',
            name='network',
            field=models.ForeignKey(on_delete=django.db.models.deletion.DO_NOTHING,
                to='resource_inventory.PhysicalNetwork', null=True),
        ),
        migrations.RunPython(pairVlanPhysicalNetworks),
        migrations.DeleteModel("tempVlanNetwork")
    ]
