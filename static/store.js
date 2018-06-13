

const store = new Vuex.Store({
    state: {
        selected: 0,
        items: [],
        levels: [],
        inv: [],
        player: {
            level: 1,
            name: '',
            gold: 0,
            exp: 0,
            capacity: BASES.INV_SIZE,
            upgrades: [],
        },

        time: {
            running: false,
            time: 0, // milliseconds
            timer: null,
        },
        messages: [],
        upgrades: {},
        run: {
            running: false,
            ended: false,
            ack_end: true,
            result: {}
        },
        timers: {
            sell: 0,
        },
        stats: {
            owned: {

            },
            sold: {

            },
            gold: { earned: 0 }
        }
    },
    actions: {
        check_achievements() {

        }
    },
    mutations: {
        items (state, items) {
            state.items = items;
        },
        levels (state, levels) {
            state.levels = levels;
        },
        upgrades (state, upgrades) {
            state.upgrades = upgrades;
        },
        add_to_inventory(state, items) {
            //let item = _.findWhere(state.items, {'id': itemid});
            state.inv = state.inv.concat(items);
        },
        remove_item(state, payload) {
            var item = payload.item; var qty = payload.qty;
            let newinv = [];
            //console.log('remove_item', item, qty);
            _.each(state.inv, (ele, idx) => {
                if (item.id == ele.id && qty > 0) {
                    // Remove
                    //console.log('skippin', ele.name);
                    qty--;
                } else {
                    newinv.push(ele);
                }
            });
            state.inv = newinv;
            //this.save(state);
        },
        add_gold(state, amount) {
            // amount can also be negative
            state.player.gold += amount;
        },
        add_upgrade(state, upname) {
            state.player.upgrades.push(upname);
        },
        add_exp(state, exp) {

            var nlevel = this.getters.next_level;
            if (nlevel.exp <= state.player.exp + exp && nlevel !== false) {
                // we levelled up
                console.log('levelled up!', nlevel.capacity);
                state.player.level += 1;
                state.player.capacity = INV_BASE + nlevel.capacity;

                // Reset xp to 0, only way it makes any real sense
                let leftover = state.player.exp + exp - nlevel.exp;
                state.player.exp = leftover;
            } else {

                state.player.exp += exp;
            }
            // did we level up?
            //console.log('lev', nlevel, state.player.level, state.player.exp)
        },
        save(state) {
            // store state.player, inv in DB
            let save = {
                player: state.player,
                stats: state.stats,
                inv: state.inv,
            };
            DB.setItem('save', save);
        },
        loadsave(state, sdata) {
            console.log('loaded save', sdata.player.name);
            state.player = sdata.player;
            state.stats = sdata.stats;
            state.inv = sdata.inv;
            state.messages.push('Save loaded');
        },
        message(state, message) {
            state.messages.push(message);
        },
        run(state, full) {
            state.run = full;
        },
        run_end(state) {
            state.run.ack_end = true;
            state.run.running = false;
        },

        // Selling
        sold_item(state) {
            let increase = BASES.SELL_TIMER;
            state.timers.sell = Date.now() + ((increase) * 1000); // can't sell until now+x seconds
        },

        
    },
    getters: {
        difficulty: state => {
            var basetime = 0;
            var lev = _.find(state.levels, l => l.id == state.player.level);
            var basetime = lev.basetime;
            
            let invweight = _.reduce(_.pluck(state.inv, 'size'), (acc, val) => acc + val, 0);
            let mul = Math.max(1, invweight / state.player.capacity); // add overage as multiplier
            //console.log('multiplier', mul);
            return (state.player.level + basetime) * mul;
        },
        inventory: state => state.inv,
        running: state => state.time.running,
        time: state => state.time.time,
        run_time: state => {
            // Base time for runs, affected by upgrades
        },
        items: state => state.items,
        player: state => state.player,
        levels: state => state.levels,
        messages: state => state.messages,
        level: state => {
            // Get current level info
            let lev = _.find(state.levels, l => l.id == state.player.level);
            return lev;
        },
        next_level: state => {
            var nlevel = [0,0];
            var nlevel_id = state.player.level + 1;
            if (nlevel_id > MAX_LEVEL) {
                return false;
            } else {
                let pick = _.find(state.levels, l => l.id == nlevel_id);
                return pick;
            }
        },
        weight: state => {
            // sum the inventory
            let s = _.reduce(_.pluck(state.inv, 'size'), (acc, val) => acc + val, 0);
            return s;
        },
        capacity: (state, getters) => {
            // add in upgrades too
            let ups = getters.upgrades(true, 'capacity');
            // total increased capacity
            let increase = _.reduce(_.pluck(ups, 'hvalue'), (acc, val) => acc + val, 0);
            return state.player.capacity + increase;
        },
        penalty: (state, getters) => {
            let w = getters.weight;
            let pl = getters.capacity
            let pc = w / pl * 100 - 100;
            if (pc > 0) {
                return pc.toFixed(1);
            } 
            return 0;
        },

        // Upgrades
        upgrades: state => (playeronly, type) => {
            var upsrc = playeronly ? state.player.upgrades : state.upgrades;
            if (playeronly === true) {
                // Get all global upgrades that are in our player.upgrades
                var upsrc = _.filter(state.upgrades, x => state.player.upgrades.includes(x.name));
                if (type !== undefined) {
                    upsrc = _.filter(upsrc, x => x.type == type);
                }
                return upsrc;
            } else {
                if (type !== undefined) {
                    var upsrc = _.filter(state.upgrades, u => u.type == type);
                } 
                return _.sortBy(upsrc, u => u.cost); // also sort by name after that, and also split into locked/unlocked/owned
            }
        },
        has_upgrade: state => upgrade => {
            return state.player.upgrades.includes(upgrade);
        },

        // Latest run
        run: state => state.run,

        // Selling
        cooldown: state => type => {
            if (type == 'sell') {

            }
        },
    }
});

