from django.contrib import admin

# Register your models here.
from caverunners.api.models import UserProfile, Item, Achievement, Upgrade


class ItemAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "quality",
        "drop_group",
        "drop_max",
        "min_level",
        "rarity",
        "weight",
        "item_type",
        "price",
    ]
    list_filter = ["drop_group", "item_type", "quality"]
    search_fields = ["name", "description"]


admin.site.register(UserProfile)
admin.site.register(Item, ItemAdmin)
admin.site.register(Achievement)
admin.site.register(Upgrade)
