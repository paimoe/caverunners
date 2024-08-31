from django.db import models


# Create your models here.
class CreatedUpdated(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class UserProfile(models.Model):
    user = models.OneToOneField("auth.User", on_delete=models.CASCADE)
    bio = models.TextField(blank=True)

    def __str__(self):
        return self.user.username


class Item(models.Model):
    """
    {
        "description":"A boring, small axe.",
        "dropgroup":"common",
        "dropmax":1,
        "id":1,
        "location":null,
        "minlevel":1,
        "name":"Small Axe",
        "pvalue":5,
        "rarity":10,
        "size":5,
        "type":"weapon",
        "value":10
    }
    """

    name = models.CharField(max_length=255)
    description = models.TextField()
    quality = models.CharField(max_length=255)
    drop_group = models.CharField(max_length=255)
    drop_max = models.IntegerField(default=1)
    min_level = models.IntegerField(
        default=1, help_text="The minimum level required to find this item."
    )
    rarity = models.IntegerField(
        default=1,
        help_text="The rarity of the item. Higher is more rare. Think of it like 1/rarity runs will drop one.",
    )
    weight = models.IntegerField(
        default=1, help_text="The weight of the item. Takes up inventory space."
    )
    item_type = models.CharField(max_length=255)
    price = models.IntegerField()
    use_value = models.IntegerField(
        default=0,
        help_text=(
            "The value of the item when used. So a potion would add this much health, "
            "a weapon do this much damage. A shield would block this much attack"
        ),
    )

    def __str__(self):
        return self.name


class Achievement(models.Model):
    """
    {
    }
    """

    name = models.CharField(max_length=255)
    description = models.TextField()
    config = models.JSONField(default=dict)

    def __str__(self):
        return self.name


class Upgrade(models.Model):
    """
    {
        "cost":500,
        "description":"Group items in your inventory",
        "hvalue":null,
        "id":1,
        "name":"inv_group",
        "nice_name":"Inventory Grouping","requires":"","type":"invpage"
    """

    name = models.CharField(max_length=255)
    description = models.TextField()
    cost = models.IntegerField()
    requires = models.CharField(max_length=255)
    upgrade_type = models.CharField(max_length=255)
    value = models.IntegerField(
        default=0,
        help_text="The value of the upgrade. So 10% faster run would be 10, +2 items sold is a 2",
    )

    def __str__(self):
        return self.nice_name
