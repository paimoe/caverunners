# Generated by Django 5.1 on 2024-08-31 06:04

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='item',
            name='use_value',
            field=models.IntegerField(default=0, help_text='The value of the item when used. So a potion would add this much health, a weapon do this much damage.'),
        ),
        migrations.AlterField(
            model_name='item',
            name='min_level',
            field=models.IntegerField(default=1, help_text='The minimum level required to find this item.'),
        ),
        migrations.AlterField(
            model_name='item',
            name='rarity',
            field=models.IntegerField(default=1, help_text='The rarity of the item. Higher is more rare. Think of it like 1/rarity runs will drop one.'),
        ),
        migrations.AlterField(
            model_name='item',
            name='weight',
            field=models.IntegerField(default=1, help_text='The weight of the item. Takes up inventory space.'),
        ),
    ]
