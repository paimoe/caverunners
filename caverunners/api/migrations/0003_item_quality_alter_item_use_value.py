# Generated by Django 5.1 on 2024-08-31 06:20

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_item_use_value_alter_item_min_level_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='item',
            name='quality',
            field=models.CharField(default=1, max_length=255),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='item',
            name='use_value',
            field=models.IntegerField(default=0, help_text='The value of the item when used. So a potion would add this much health, a weapon do this much damage. A shield would block this much attack'),
        ),
    ]
