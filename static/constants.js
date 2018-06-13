const MAX_LEVEL = 10;
const INV_BASE = 60;
const FORMULA = {
    time: diff => {
        return diff * 2;
    },
};
const BASES = {
    INV_SIZE: 60,
    MF: 30, // magic find
    SELL_TIMER: 10,
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
var rand_between = (min, max) => Math.random() * (max - min) + min;
var random_item = (items, num) => {
    /*
     So get the unique weights, and lean towards the lower weights
     Get a random number, and make the pool out of ones with rarity <= that number
     for [1,10], rand(1,11) will bias towards the lower
     then out of the possible options, pick an actual random one (_.sample)
    */
    var u = _.uniq(_.pluck(items, 'rarity'));
    var s = u.reduce((acc,val) => acc + val);
    var r = rand_between(1, 1+s).toFixed(0);
    var f = _.filter(items, i => i.rarity <= r);
    // this is fucked, since i can't pick double junk etc, it'll just do one of each
    // so redo at some point
    //console.log('u',  r, f, _.sample(f, num), num);
    return _.sample(f,num);
};
function sum_field(collection, field) {
    return _.reduce(_.pluck(collection, field), (acc, val) => acc + val, 0);
}

const TickerMessages = [
'Townsfolk wondering where the surplus Short Swords are coming from',
'Local police considering sealing off cave near town, wary of ghosts'
];
