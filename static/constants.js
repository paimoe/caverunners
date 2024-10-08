const MAX_LEVEL = 15;
const INV_BASE = 60;
const FORMULA = {
    time: diff => {
        return diff * 2;
    },
};
const BASES = {
    INV_SIZE: 60,
    MF: 30, // magic find
    HARD_LIMIT: 20, // 20% penalty max
    SCRAP_RATE: 10, // 10% to get scrap
    DROP_NUM: [6, 12], // min/max number of items to drop
    SELL_SPEED: 5, // seconds to sell
    TIER_ORDER: ['junk', 'common', 'rare', 'boost', 'set', 'S'],
};
var FLAGS = [
    'cheated',
];
var FLAGS_SET = [];
function has_flag(name) {
    return FLAGS_SET.includes(name);
};
var DB = localforage;
var HASH = 'd5fde2d59b7bdada04dec44875d89636';
var random_item = (items, num, areas) => {
    /*
     So get the unique weights, and lean towards the lower weights
     Get a random number, and make the pool out of ones with rarity <= that number
     for [1,10], rand(1,11) will bias towards the lower
     then out of the possible options, pick an actual random one (_.sample)
    */
    if (!areas) {
        areas = [null];
    } else {
        areas = [areas, null];
    }


    var u = _.uniq(_.pluck(items, 'rarity'));
    var s = u.reduce((acc,val) => acc + val);
    var r = rand_between(1, 1+s).toFixed(0);

    var f = _.filter(items, i => _.some(areas, i.location));
    var f = _.filter(items, i => i.rarity <= r);
    // this is fucked, since i can't pick double junk etc, it'll just do one of each
    // so redo at some point
    //console.log('u',  r, f, _.sample(f, num), num);
    return _.sample(f,num);
};
function sum_field(collection, field) {
    return _.reduce(_.pluck(collection, field), (acc, val) => acc + val, 0);
};
var fill_array = (value, num) => Array(num).fill(value);
var percent_to_decimal = percent => (100 + parseInt(percent)) / 100;
var decimal_to_percent = dec => ((dec - 1) * 100).toFixed(0);

// 1.06 => 0.94, convert our increase to the amount we multiply by to decrease
var flip_increase = dec => (Math.max(0, 100 - (dec * 100 - 100)) / 100).toFixed(2);

function all_true(list) {
    return all_equal(list, true);
}
function all_equal(list, cmp) {
    return list.length > 0 && _.every(list, x => x === cmp);
}

var RNG = Random.engines.mt19937();
function rand_between(min, max, seed) {
    let engine = RNG.seed(seed);
    return Random.integer(min, max)(engine);
    //Math.random() * (max - min) + min;
};
function random_seed() {
    let mt = Random.engines.mt19937().autoSeed();
    return mt();
};
function rand_pick(list, seed) {
    return Random.pick(RNG.seed(seed), list);
};

function ITEM_FIND(options) {
    // Big mega item find function
    /*
    1. Find how many items we wish to drop, but not the actual items
    2. Loop through and randomly roll for a common/rare etc
    3. Based on that, pick an item.
    4. Roll random qty of item, and use that as a running total

    eg. Need 5 items. j,j,c,r,u. But if we roll 3x junk, we end up with jx3, j, c, so you need a low junk roll to get access to the higher tiers

    itemlevels = [junk, common, special, rare, set, unique, S (for s-tier)]
    maybes = [quest]
    */
    let seed = options.seed || 0; // probably error if no seed present
    let area = options.area || null;
    let level = options.player.level || 1; // if level isn't set, then only show level 1 items
    let diff = options.difficulty || 1;
    let time = options.time || 10; // default ten seconds
    let itemboostnum = options.itemboostnum || 0;
    //console.log('basemf', BASES.MF);
    //console.log('ITEM FIND OPTIONS', options);

    // Filter the possible items from this area, and max level
    var _items = options.items;
    // level
    _items = _.filter(_items, i => i.min_level <= level);
    // area [unused]
    //_items = _.filter(_items, i => _.some([area], i.location));

    // Build range of all items, and rarities
    let boost_drops_time = Math.floor(time / 30);
    let num_drops_base = rand_between(BASES.DROP_NUM[0], BASES.DROP_NUM[1], seed);

    let num_drops = num_drops_base + itemboostnum + boost_drops_time + level;
    //console.log(`num_drops_base:${num_drops_base} boost:${itemboostnum} timeboost:${boost_drops_time} level:${level} total:${num_drops}`);

    var group_probs = {
        'common': 60,
    };

    // Count the number of items per type. If we don't have any rares for this area/level, then knock it down a category
    var _drop_groups = _.groupBy(_items, 'drop_group');
    //console.log('items', _items);
    //console.log('dgroups', _drop_groups)
    var _drop_pool = [];
    var find_types = [];

    // number of drops limited to
    var num_limits = {
        'boost': 2, 
        'S': 1,
    };
    var num_limits_replace = {
        'boost': ['rare', 'set'],
        'S': ['set', 'rare']
    };

    for (i = 0; i < num_drops; i++) {
        // Roll for type
        let rng = rand_between(1,100, seed + i);
        
        var find_type = 'junk';
        if (rng >= 99) {
            // S
            //console.log('Adding S-tier',rng);
            find_type = 'S';
        } else if (rng > 95) {
            // set
            //console.log('Adding unique',rng);
            find_type = 'set'; 
        } else if (rng > 80) {
            // boost
            //console.log('Adding set',rng);
            find_type = 'boost';
        } else if (rng > 65) {
            // rare
            //console.log('Adding rare',rng);
            find_type = 'rare';
        } else {
            // rng < 60, common/junk 50/50 shot
            find_type = rand_pick(['common', 'junk'], seed + i);
            
            //console.log('Adding ' + find_type,rng);
        }

        // Make sure we don't go over our limit
        // @todo: should probably do..while this, so we don't end up with boost turning into S etc
        if (find_type in num_limits) {
            let limit = num_limits[find_type];

            if (limit > 0) {
                num_limits[find_type] -= 1;
            } else {
                old_ft = find_type;
                find_type = rand_pick(num_limits_replace[find_type], seed + i);
                //console.log(`replaced find_type ${old_ft} -> ${find_type}`);
            }
        }
        find_types.push(find_type);
    }
    //console.log('find_types', _.countBy(find_types));

    find_types = _.sortBy(find_types, t => {
        return _.indexOf(BASES.TIER_ORDER, t);
    });
    //console.log('find_types', find_types);
    for (j = 0; j < find_types.length; j++) {
        // Now run through the list
        //console.log('Picking item of type', find_type);
        let pool = _.filter(_items, x => x.drop_group == find_types[j]);
        //console.log('pool', find_type, _.pluck(pool, 'name'));
        let picked_item = rand_pick(pool, seed + j);
        //console.log('picked_item', picked_item.name);
        if (picked_item === undefined) {
            //console.log('No item for you :(');
            num_drops -= 1;
            continue;
        }
        //console.log('picked item', picked_item.name);
        let picked_count = rand_between(1, picked_item.drop_max, seed + j);
        picked_count = Math.min(picked_count, num_drops); // bound it to num_drops, otherwise we get 10 items, but roll x5 on all, and get 50 items

        //console.log('item and pick count', picked_item.name, picked_count);
        let picked_bunch = fill_array(picked_item, picked_count);
        _drop_pool = _drop_pool.concat(picked_bunch);

        // Remove picked_count - 1 from the end of the array. [a,a,a,a,b,b,c,c,c] and the first a=4, we want to then have [ax4,a,a,a,b,b]
        // So getting S relies on getting low rolls on shit items
        num_drops -= picked_count;
        //console.log('find_types_before_slice', find_types, picked_count);
        if (picked_count > 1) {
            // If we pick more than one, take it from the end, otherwise just continue the loop
            find_types = find_types.slice(0, -(picked_count - 1))
        }
        //console.log('new num drops', num_drops, j, find_types);
    }

    //console.log('_drop_pool', _drop_pool);

    // Add possible extras; quest items, notes for quests
    //S = _.filter(_items, x => x.drop_group == 'boost')[0]
    //console.log('SSSSS', S)
    //_drop_pool.push(S)

    return _drop_pool;
};

const TickerMessages = [
    'Townsfolk wondering where the surplus Short Swords are coming from',
    'Local police considering sealing off cave near town, wary of ghosts'
];
