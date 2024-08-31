import json
from caverunners.api.models import Item, Achievement, Upgrade
from django.shortcuts import render
from django.contrib.auth.models import Group, User
from rest_framework import permissions, viewsets


from caverunners.api.serializers import GroupSerializer, UserSerializer, ItemSerializer


class UserViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows users to be viewed or edited.
    """

    http_method_names = ["get"]
    queryset = User.objects.all().order_by("-date_joined")
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]


class GroupViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows groups to be viewed or edited.
    """

    queryset = Group.objects.all().order_by("name")
    serializer_class = GroupSerializer
    permission_classes = [permissions.IsAuthenticated]


class ItemViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows items to be viewed or edited.
    """

    http_method_names = ["get"]
    queryset = Item.objects.all().order_by("name")
    serializer_class = ItemSerializer
    # permission_classes = [permissions.IsAuthenticated]


def index(request):
    return render(request, "index.html")


def importer(request):
    # Load JSON and import
    with open("data/items.json", "r") as f:
        items = json.load(f)
        for item in items:
            print(item)
            try:
                rarity = int(item["rarity"])
            except ValueError:
                rarity = 0
            # Item.objects.get_or_create(
            #     name=item["name"],
            #     description=item["description"] or "",
            #     drop_group=item["dropgroup"],
            #     drop_max=item["dropmax"],
            #     min_level=item["minlevel"],
            #     rarity=rarity,
            #     weight=item["size"],
            #     item_type=item["type"],
            #     price=item["value"],
            # )

    with open("data/achievements.json", "r") as f:
        achievements = json.load(f)
        for achievement in achievements:
            Achievement.objects.get_or_create(
                name=achievement["nice_name"],
                description=achievement["description"] or "",
                config=achievement["exec"] or {},
            )
    return render(request, "importer.html")


def generate(request):
    # Equippable stuff
    GRID = {
        "armour": ["Helmet", "Chestplate", "Gloves", "Boots"],
        "weapon": [
            "Sword",
            "Axe",
            "Bow",
            "Hammer",
            "Shield",
        ],
        "tool": [
            "Pickaxe",
            "Axe",
            "Shovel",
            "Hoe",
        ],
        "jewellery": [
            "Ring",  # dont even have amulets at the moment
        ],
    }
    QUALITY = ["Broken", "Common", "Uncommon", "Rare", "Brilliant"]
    METALS = [
        "Wood",
        "Bone",
        "Stone",
        "Bronze",
        "Copper",
        "Iron",
        "Steel",
        "Silver",
    ]

    def get_price(quality: str, metal: str, item: str) -> int:
        base = 1
        bases = {
            "broken": 0,
            "common": 1,
            "uncommon": 5,
            "rare": 10,
            "brilliant": 25,
        }
        metals = {
            "wood": 1,
            "bone": 2,
            "stone": 3,
            "bronze": 5,
            "copper": 10,
            "iron": 20,
            "steel": 30,
            "silver": 50,
        }
        items = {
            "armour": 10,
            "weapon": 10,
            "tool": 5,
            "jewellery": 15,
        }
        return base + items[item] + bases[quality] * metals[metal]

    # Generate
    i = 0
    for item_type, items in GRID.items():
        for item in items:
            for quality in QUALITY:
                for metal in METALS:
                    price = get_price(quality.lower(), metal.lower(), item_type.lower())
                    name = f"{metal} {item}"
                    print(i, name)
                    i += 1
                    Item.objects.get_or_create(
                        name=name,
                        description="",
                        quality=quality.lower(),
                        drop_group="common",
                        drop_max=1,
                        min_level=1,
                        rarity=10,
                        weight=5,
                        item_type=item_type,
                        price=price,
                    )
    POTIONS = {
        "types": ["Health", "Stamina"],
        "qualities": ["Small", "Medium", "Large", "Super"],
    }
    for potion_type in POTIONS["types"]:
        for quality, j in zip(POTIONS["qualities"], (5, 10, 20, 50)):
            name = f"{quality} {potion_type} Potion"
            print(i, name)
            i += 1
            Item.objects.get_or_create(
                name=name,
                description="",
                drop_group="potion",
                drop_max=1,
                min_level=1,
                rarity=15,
                weight=1,
                item_type="potion",
                price=10,
                use_value=j,
            )

    # GEnerate junk/random items maybe 200 or so
    junk_items = [
        "Old Rag",
        "Rusty Nail",
        "Broken Pot",
        "Wooden Spoon",
        "Chipped Mug",
        "Torn Tapestry",
        "Cracked Plate",
        "Dull Knife",
        "Worn-out Boot",
        "Moldy Cheese",
        "Bent Fork",
        "Stained Cloth",
        "Rusty Key",
        "Broken Mirror",
        "Dusty Book",
        "Empty Bottle",
        "Frayed Rope",
        "Charred Log",
        "Pitted Coin",
        "Burnt Stick",
        "Smashed Barrel",
        "Moth-eaten Cloak",
        "Old Candle",
        "Cracked Bell",
        "Worn Broom",
        "Tarnished Brooch",
        "Rusted Chain",
        "Wilted Flower",
        "Broken Comb",
        "Faded Letter",
        "Dirty Bandage",
        "Chipped Arrowhead",
        "Rusty Horseshoe",
        "Crumpled Hat",
        "Scorched Scroll",
        "Worn-out Glove",
        "Broken Lock",
        "Splintered Shield Fragment",
        "Broken Wagon Wheel",
        "Ripped Curtain",
        "Leaking Bucket",
        "Rusty Spoon",
        "Empty Jar",
        "Cracked Chamber Pot",
        "Tattered Banner",
        "Snapped Bowstring",
        "Frayed Belt",
        "Worn-out Sandal",
        "Broken Lantern",
        "Rusted Helm Fragment",
    ]
    for junk in junk_items:
        print(i, junk)
        i += 1
        Item.objects.get_or_create(
            name=junk,
            description="",
            drop_group="junk",
            drop_max=5,
            min_level=1,
            rarity=1,
            weight=1,
            item_type="junk",
            price=1,
        )

    DECK_OF_CARDS = [
        f"{i} of {suit}"
        for i in list(range(2, 11)) + ["Jack", "Queen", "King", "Ace"]
        for suit in ["Hearts", "Diamonds", "Clubs", "Spades"]
    ]
    for card in DECK_OF_CARDS:
        print(i, card)
        i += 1
        Item.objects.get_or_create(
            name=card,
            description="",
            drop_group="card",
            drop_max=1,
            min_level=1,
            rarity=30,
            weight=1,
            item_type="card",
            price=5,
        )

    # Add Boosts
    # Add Set items
