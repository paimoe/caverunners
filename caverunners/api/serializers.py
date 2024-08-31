from django.contrib.auth.models import Group, User
from rest_framework import serializers
from caverunners.api.models import Item


class UserSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = User
        fields = ["username"]


class GroupSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Group
        fields = ["url", "name"]


class ItemSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Item
        fields = [
            "id",
            "name",
            "description",
            "quality",
            "drop_group",
            "drop_max",
            "min_level",
            "rarity",
            "weight",
            "item_type",  # type
            "price",  # value
            "use_value",
        ]
