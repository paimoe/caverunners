

const store = new Vuex.Store({
    state: {
        selected: 0,
        items: [],
        levels: [],
        inv: [],
        achievements: [],
        player: {
            level: 1,
            name: '',
            gold: 0,
            exp: 0,
            capacity: BASES.INV_SIZE,
            upgrades: [],
            achieved: [],
            opts: {
                confirm_sell: 1, // default to confirm on
            },
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
            selling: {

            },
        },
        stats: {
            owned: {

            },
            sold: {

            },
            gold: { earned: 0, spent: 0, sales: 0 },
            counters: {

            },
        },
        tmp: {
            achievements: [], // newly unlocked
            run: []
        }
    },
    actions: {
        save(ctx) {
            let save = {
                player: ctx.state.player,
                stats: ctx.state.stats,
                inv: ctx.state.inv,
            };
            //if (!save.player.opts) save.player.opts = {};
            DB.setItem('save', save);
            //ctx.commit('message', {type: 'saveload', m: 'Game Saved', unique:true});
        },
        end_run(ctx, run) {
            // ummm, oh yeah group into qty too
            ctx.state.run = run;
        },
        check_achievements(ctx) {
            let achs = ctx.getters.achs;
            // Loop all achievements, that we haven't achieved
            let open = _.reject(achs, a => _.contains(ctx.state.player.achieved, a.name));
            var satisfied = [];

            function all_true(list) {
                return list.length > 0 && _.every(true_list, x => x === true);
            }

            for (let ach of open) {

                var min_trues = Object.keys(ach.exec).length;

                // Own 'n' of these items
                if ('own' in ach.exec) {
                    var true_list = [];
                    // own these specific items
                    _.each(ach.exec.own, n => {
                        var items_count = ctx.getters.inv_item(n[0]).length;
                        true_list.push(items_count >= n[1]); // if our items len is more than required
                    });

                    satisfied.push(all_true(true_list));
                }

                // Own 'n' of these item types (eg 100 Junk, 100 Treasure)
                if ('own_type' in ach.exec) {
                    // own these item types
                    var true_list = [];
                    _.each(ach.exec.own_type, n => {
                        //n = [type, qty]
                        var items_count = ctx.getters.inv_type(n[0]).length; // todo: just get inv at the top, once? then filter that list
                        true_list.push(items_count >= n[1]); // if our items len is more than required
                    });

                    satisfied.push(all_true(true_list));
                }

                if (all_true(satisfied) && min_trues === satisfied.length) {
                    // achieved all applicable conditions
                    // add this to the players achieved
                    ctx.commit('add_achievement', ach);
                    //ctx.dispatch('save');
                    ctx.commit('message', {'type': 'ach', 'm': 'Achievement Unlocked!', '_meta': {a: ach}});
                }
            }
        },

        start_timer(ctx) {
            let timers = ctx.state.timers;
        },

        remove_item(ctx, payload) {
            var item = payload.item; var qty = payload.qty;
            let newinv = [];

            qty = ctx.getters.max_item_sell([item, qty]);
            //console.log('remove_item', item, qty);
            // Check for negative, and max
            _.each(ctx.state.inv, (ele, idx) => {
                if (item.id == ele.id && qty > 0) {
                    // Remove
                    //console.log('skippin', ele.name);
                    qty--;
                } else {
                    newinv.push(ele);
                }
            });
            ctx.state.inv = newinv;
        },

        // opts
        set_option(ctx, opt) {
            // bool toggle
            ctx.state.player.opts[opt] = ctx.state.player.opts[opt] || 0;
            ctx.state.player.opts[opt] = 1 - ctx.state.player.opts[opt];
            ctx.dispatch('save');
            return ctx.state.player.opts[opt];
        },
        set_option_txt(ctx, opts) {
            [opt, txt] = opts;
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
        achievements(state, achs) {
            state.achievements = _.map(achs, a => {
                a.exec = JSON.parse(a.exec);
                return a;
            });
        },
        add_achievement(state, ach) {
            state.player.achieved.push(ach.name);
            state.tmp.achievements.push(ach);
        },
        add_to_inventory(state, items) {
            //let item = _.findWhere(state.items, {'id': itemid});
            state.inv = state.inv.concat(items);
        },
        remove_item(state, payload) {
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
                //console.log('levelled up!', nlevel.capacity);
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
            alert('dont use this, use dispatch()')
            // store state.player, inv in DB
            let save = {
                player: state.player,
                stats: state.stats,
                inv: state.inv,
            };
            DB.setItem('save', save);
            //state.messages.push({type: 'saved', m: 'Game Saved', unique:true});
        },
        loadsave(state, sdata) {
            console.log('loaded save', sdata.player.name);
            state.player = sdata.player;
            state.stats = sdata.stats;
            state.inv = sdata.inv;
            //state.messages.push({type: 'saveload', m:'Save loaded'});
        },
        message(state, message) {
            if (typeof(message) === 'string') {
                message = {
                    type: 'simple',
                    m: message,
                    _meta: {},
                    when: Date.now(),
                    timed: 0, // can we time it to auto-close easily?
                };
            }

            if (!message.when) {
                message.when = Date.now();
            }

            // Check if we only want one of these, in which case, we'll overwrite with this newer one
            if (message.unique === true || message.unique === 1) {
                console.log('Purging unique messages for message:', message.m);
                var purged = _.reject(state.messages, m => m.m == message.m);
                purged.push(message);
                state.messages = purged;
            } else {

                // Make persistant later, with an 'unread messages' list, but for now whatevs
                state.messages.push(message);
            }
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

        // internal stats
        count(state, key) {
            state.stats.counters[key] = state.stats.counters[key] || 0;
            state.stats.counters[key] += 1;
        },
        stat(state, info) {
            // info = ['gold_earned', 220] ['gold_spent', 21]
            // keys: gold_earned, gold_spent, [own, itemid, qty]
            // for now just gold
            var stat;
            if (info.length === 2 && info[0].startsWith('gold')) {
                statkey = info[0].split('_')[1];
                //console.log('setting ', statkey, ' to +', info[1]);
                state.stats.gold[statkey] += info[1];
            }
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
        inv_item: (state, g) => id => {
            return _.filter(g.inventory, i => i.id == id);
        },
        inv_type: (state, g) => type => {
            return _.filter(g.inventory, i => i.type == type);
        },
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
        max_penalty: (state, getters) => {
            let ups = getters.upgrades(true, 'maxpenalty');
            let pen_inc = sum_field(ups, 'hvalue');
            return BASES.HARD_LIMIT + pen_inc;
        },
        over_hard_limit: (state, getters) => {
            let pen = getters.penalty;
            //nsole.log('ov hard', pen, BASES.HARD_LIMIT)//
            return pen > getters.max_penalty;
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
        upgrade: state => name => {
            let up = _.filter(state.upgrades, x => x.name == name);
            return up.length > 0 ? up[0] : false;
        },
        has_upgrade: state => upgrade => {
            return state.player.upgrades.includes(upgrade);
        },
        increased_speed: (state, getters) => {
            let speed = 0;
            let ups = getters.upgrades(true, 'speed');
            let pc_inc = sum_field(ups, 'hvalue');
            return (100 - pc_inc) / 100;
        },
        // Available via upgrades
        gold_find: state => {
            return 0;
        },
        magic_find: state => {
            return BASES.MF;
        },
        sum_inv_type: (state, g) => type => {
            let x = g.upgrades(true, type);
            return sum_field(x, 'hvalue');
        },

        // Latest run
        run: state => state.run,

        // Selling
        cooldown: state => type => {
            if (type == 'sell') {

            }
        },
        max_item_sell: (state, g) => obj => {
            [item, qty] = obj;

            let maxsell = g.sum_inv_type('invpagemultisell');

            let num = g.inv_item(item.id).length;
            qty = Math.min(maxsell + 1, qty); // how much we're trying to remove, but don't go over the max we're allowed to sell
            qty = Math.min(qty, num); // now bound it to their total, so we dont sell more than we own
            qty = Math.max(qty, 1); // may as well not go negative
            return qty;
        },

        // Cheebos
        achs: state => _.sortBy(state.achievements, a => a.name),
        new_achievements: state => state.tmp.achievements,

        // messages
        messages: state => state.messages,

        // stats
        counter: state => key => {
            return state.stats.counters[key];
        },

        options: state => state.player.opts,
        option: state => opt => state.player.opts[opt],

    }
});

