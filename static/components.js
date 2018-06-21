
// Maybe make into a Vue component
class Timer {
    //constructor(start, runtime, end, cb, periods, periods_cb) {
    constructor(obj) {
        this._id = _.uniqueId('timer_');
        this._start = obj.start;
        this._end = obj.end; // end is the absolute truth, not runtime
        this.runtime = obj.runtime; // maybe calculate this anyway
        this.cb = obj.cb;

        // Periodically fire off events, jsut do it roughly evenly (10% either side), and any remaining at the end
        this.periods = obj.periods;
        this.periods_cb = obj.periods_cb;

        this._tick = obj.tick;
        this._timer = null;
        this._accumulate = {};
        this._ended = false;
    }
    id() {
        return this._id;
    }
    new_runtime(start, end) {
        this._start = start;
        this._end = end;
    }
    start() {
        //let periods = this.timeleft() / this.periods; // after this many ms, run periodic cb (do later)
        if (this._start !== undefined && this.cb !== undefined) {
            this._timer = requestAnimationFrame(this.update.bind(this));
            this._ended = false;

            // Save to localStorage/IDB?
        }
    }
    update() {
        // Do our internal stuff, then call their cb for custom things to like update the DOM
        if (this.timeleft() > 0) {
            // todo: speed modifier, maybe

            if (this._tick !== undefined) {
                this._tick({ 'timeleft': this.timeleft(), 'timeleft_s': this.timeleft() / 1000, 'css': this.css_background() });
            }

            requestAnimationFrame(this.update.bind(this));
        } else {
            cancelAnimationFrame(this._timer);
            this._ended = true;
            this._tick({ 'timeleft': 0 , 'timeleft_s': 0 })
            this.end();
        }
    }
    end() {
        // Call callback and return any info
        this.cb({
            id: this._id,
            time_taken: this._end - this._start,
            time_taken_s: (this._end - this._start) / 1000
        });
    }
    pause() {

    }
    cancel() {
        cancelAnimationFrame(this._timer);
        // end run?
    }
    force_quit() {
        this._ended = true;
        this.cancel();
        this.end();
    }
    timeleft() {
        if (this._ended === true) {
            return 0;
        }
        return Math.max(0, this._end - Date.now());
    }
    add_stat(stat, val) {
        this._accumulate[stat] += val;
    }
    running() {
        return this.timeleft() > 0;
    }
    percent_done() {
        if (this._ended === true) {
            return 100;
        }
        let timetake = this._end - this._start;
        let pc = (Date.now() - this._start) / timetake * 100;
        pc = Math.min(100, pc).toFixed(2);
        return pc;
    }
    css_background(fgcolor, bgcolor, defaultbg) {
        // Find a way to generalize this, pass in percent or something
        fgcolor = fgcolor || '#4F9622';
        bgcolor = bgcolor || '#4A2E17';
        defaultbg = defaultbg || '#ffffff';
        if (this.running()) {
            let pc = this.percent_done();
            let plus5 = pc + 5;
            let z = `color:#fff;background: linear-gradient(to right, ${fgcolor} 0%, ${fgcolor} ${pc}%, ${bgcolor} ${pc}%, ${bgcolor} 100%);`
            return z;
        } else {
            return `color:#fff;background: ${defaultbg}`;
        }
    }

    save() {
        // output json string for localstorage
    }
};

const Statusbar = Vue.component('statusbar', {
    template: '#statusbar',
    data: () => ({
        running: false,
        timer: null,
        time: 0,
        time_start: 0,
        time_take: 0,
        ack_end: true, // acknowledged end
        last_run: {
            gold: 0,
            exp: 0,
            items: [],
        },
        runcomplete: {

        }
    }),
    computed: {
        is_running() {
            //console.log('time', this.time, this.time>0)
            let run = this.$store.getters.run;
            return this.time > 0 || run.ack_end == false;
        },
        timeleft() {
            let s = this.time / 1000;
            let run = this.$store.getters.run;
            if (this.running == true || run.ack_end != true) {
                // Also account for minutes
                return (Math.round(s * 100) / 100).toFixed(2);
            } else {
                if (this.$store.getters.over_hard_limit) {
                    return 'You are carrying too much! Sell some of your items.';
                }
                if (this.$store.getters.status == 'selling') {
                    return 'Cannot start until you have finished selling.';
                }
                return 'Enter Dungeon ›';
            }
        },  
        over_hard_limit() {
            return this.$store.getters.over_hard_limit;
        },
        busy() {
            return this.$store.getters.status == 'selling';
        }
    },
    methods: {
        run() {
            //console.log('run dungeon');
            // hwen loading an old run, jsut make sure that the time_start is in the past and we should start part way thorugh
            let diff = this.$store.getters.difficulty;
            let diff_range = 0.1;
            let min = diff * (1 - diff_range);
            let max = diff * (1 + diff_range);

            let runtime = rand_between(min, max) * 1000 * this.$store.getters.increased_speed('speed');
            //console.log('RUNTIME',runtime, `min:${min} max:${max} diff:${diff}`, this.$store.getters.increased_speed);
            //runtime = 500;
            this.time = runtime; // Use this for display
            this.running = true;
            this.time_start = Date.now();
            this.time_take = runtime;

            this.timer = new Timer({
                start: this.time_start,
                //runtime: runtime,
                end: this.time_start + runtime,
                cb: data => {
                    this.end_run(data);
                    this.$store.commit('set_status', null);
                    this.$store.commit('timer_rm', data.id)
                },
                tick: tick => {
                    //console.log('do tick', tick)
                    this.time = tick.timeleft;
                    // or could update the sell field, idk
                },
                periodic: tick => {
                    // got a 'random' periodic ping
                },
            });
            this.timer.start();
            this.$store.commit('timer_add', this.timer);
            this.ack_end = false;
            this.$store.commit('set_status', 'running');
        },
        end_run(data) {
            console.log('ended run, heres some loot');

            this.running = false;

            // Give random item, gold
            const GOLD_FACTOR = 0.1;
            let diff = this.$store.getters.difficulty;

            // Gold. will return (eg) 1.05, but we aren't just applying it, we need the boost seperate
            let goldboost = percent_to_decimal(this.$store.getters.gold_find) - 1; // 
            let gold = rand_between(diff, diff * 0.5);
            let moregold = gold * goldboost;
            this.$store.commit('add_gold', gold + moregold);
            this.$store.commit('stat', ['gold_earned', gold + moregold]);
            //console.log('gold!', gold);

            // Gain exp
            if (!this.$store.getters.is_max_level) {
                var expgain = rand_between(0.5*diff, diff);
                this.$store.commit('add_exp', expgain);
            } else {
                var expgain = 0;
            }

            let rng = rand_between(1,100);
            // Check upgrades for item find

            // chance for item
            var newitems = [];
            //console.log('RNG', rng);
            var newitems = ITEM_FIND({
                area: null,
                player: this.$store.getters.player,
                items: this.$store.getters.items, // find a way to not have to inject this

                // Number of items to return
                itemboostnum: this.$store.getters.sum_inv_type('itemfind'), //+100,
                // Time the run took/difficulty
                difficulty: diff,
                time: data.time_taken_s, 
                // @todo: to use speed boost but keep item counts, change this to the base_time. so 90s run = 3 new items, but boosted to ~70s would only give 2
                // so use the original 90s
            });
            //console.log('NEW ITEMS', newitems);

            //console.log('gained', gold.toFixed(0), 'gold and', expgain.toFixed(0), 'exp!')
            this.$store.dispatch('end_run', {
                //running: this.running,
                ack_end: this.ack_end,
                ended: true,
                result: {
                    'gold': gold,
                    'exp': expgain,
                    'items': newitems,
                    'time': data.time_taken_s, // only used for display atm
                    'boost': {
                        gold: moregold,
                    }
                }
            });

            // Set status to 'returning home'
            let time_return_home_base = data.time_taken_s / 10;

            this.$store.dispatch('save');

        },
        css_gradient_percent(fgcolor, bgcolor) {
            //console.log('gradien');
            // Find a way to generalize this, pass in percent or something
            fgcolor = fgcolor || '#4F9622';
            bgcolor = bgcolor || '#4A2E17';
            if (this.timer) {
                pc = this.timer.percent_done();
                let plus5 = pc + 5;
                z = `background: linear-gradient(to right, ${fgcolor} 0%, ${fgcolor} ${pc}%, ${bgcolor} ${pc}%, ${bgcolor} 100%);`
                return z;
            } else {
                return 'background: #a2753f';
            }
        }
    }
});
const Notices = Vue.component('notices', {
    template: '#notices',
    data: () => ({
        lastrun: {},
        selected_list: [],
    }),
    methods: {
        show() {
            let run = this.$store.getters.run;
            if (run.ended === true && run.ack_end === false) {
                return true;
            }
            return false;
        },

        confirm_end() {
            // Add the items
            //console.log(`Adding ${this.selected_list.length} items`);
            // morph list
            let input_list = [];
            for (i = 0; i < this.selected_list.length; i++) {
                let item = this.selected_list[i];
                let f = fill_array(item, item.qty);
                input_list = input_list.concat(f);
            }
            this.$store.commit('add_to_inventory', input_list);
            
            this.ack_end = true;
            this.last_run = 'etc';
            this.$store.commit('run_end');
            this.$store.dispatch('check_achievements');
            this.$store.dispatch('save');
            this.selected_list = [];
        },

        take_all() {
            this.selected_list = this.runitems();
            this.confirm_end();
        },

        select(item) {
            let wh = _.findWhere(this.selected_list, {id: item.id});
            if (wh !== undefined) {
                // in the list, so unselect it
                this.selected_list = _.reject(this.selected_list, x => x.id == item.id);
            } else {
                this.selected_list.push(item);
            }
        },
        selected(item) {
            return _.some(this.selected_list, i => i.id == item.id);
        },
        text(item) {
            if (item.qty > 1) {
                return `${item.name} x${item.qty}`;
            }
            return item.name;
        },
        has_upgrade(up) {
            return this.$store.getters.has_upgrade(up);
        },
        runitems() {
            // Group it
            let run = this.$store.getters.run.result;
            let counts = _.countBy(run.items, i => i.id);
            let _items = _.map(_.unique(run.items), x => {
                //let c = counts[x.id];
                x.qty = counts[x.id] || 1;
                return x;
            });
            //console.log('counts', _items, run.items);
            return _.sortBy(_items, x => x.rarity);
        },
    },
    computed: {
        run() {
            // Get latest run
            let run = this.$store.getters.run.result;
            return run;
        },
        endbutton() {
            // 
            // total
            let total = _.reduce(this.selected_list, (acc, x) => {
                return acc += x.qty;
            }, 0);
            let s = total > 1 ? 's' : '';
            if (total == 0) {
                return 'Take Nothing';
            }
            return `Take ${total} item${s}`;
        }
    }
});
const Charmenu = Vue.component('charmenu', {
    template: '#charmenu',
    computed: {
        player() {
            return this.$store.getters.player;
        },
        inv() {
            return this.$store.getters.inventory;
        },
        weight() {
            return this.$store.getters.weight;
        },
        penalty() {
            return this.$store.getters.penalty;
        },
        capacity() {
            return this.$store.getters.capacity;
        },
        stats() {
            // compute stats
            return {
                increased_speed: 100 - 100 * this.$store.getters.increased_speed('speed'), // convert to %
                sell_speed: 100 - 100 * this.$store.getters.increased_speed('sellspeed'),
                gold_find: this.$store.getters.gold_find,
                magic_find: this.$store.getters.magic_find,
                max_penalty: this.$store.getters.max_penalty,
                achievement_count: this.$store.getters.player.achieved.length,
                status: this.$store.getters.status,
            }
        },
        obstats() {
            return {
                update: 'Overburdened',
                items: this.$store.getters.items.length,
                upgrades: this.$store.getters.upgrades(false).length,
                achs: this.$store.getters.achs.length,
                version: 0.2,
            }
        },
        opts() {
            return this.$store.getters.options;
        },
        exp_display() {
            if (this.$store.getters.is_max_level) {
                return 'Max Level';
            }
            let pl = this.$store.getters.player;
            let n = this.$store.getters.next_level;
            let exp = pl.exp.toFixed(0);
            if (n == undefined) {
                return exp;
            }
            return `${exp}/${n.exp}`;
        }
    },
    methods: {
        required_exp() {
            let nlevel = this.$store.getters.next_level;

            return nlevel === undefined ? 0 : nlevel.exp;
        },
        set_name() {
            let name = prompt('What is your name?');
            this.$store.state.player.name = name;
            this.$store.dispatch('save');
        },
        check_option(opt) {
            // Return for the current value
            return this.$store.dispatch('set_option', opt);
        },
        checked_option(opt) {
            return this.$store.getters.option(opt);
        }

    }
});

var unicode_arrow = which => which == 'asc' ? '&#x25BC' : '&#x25B2';
const Inventory = Vue.component('inventory', {
    template: '#inventory',
    data: () => ({
        sorts: {},
        filters: {},
        sort_name: '',
        sort_qty: '',
        sort_weight: '',
        sort_value: '',
        selling: [],
        selltxts: {},
    }),
    methods: {
        items() {
            return this.$store.getters.inventory;
        },
        has_upgrade(name) {
            return this.$store.getters.has_upgrade(name);
        },
        do_sell(item, qty) {
            // Add gold
            this.$store.commit('add_gold', item.value * qty);
            this.$store.commit('stat', ['gold_sales', item.value * qty]);
            this.$store.dispatch('remove_item', {'item': item, 'qty': qty});
            this.$store.dispatch('check_achievements');
            this.$store.dispatch('save');
        },
        sell(item, opts) {
            if (this.$store.getters.status == 'running') return;

            opts = opts || {};
            let qty = opts.qty || 1;
            let base_allow = total = 1;
            let increased_allow = this.$store.getters.sum_inv_type('invpagemultisell');
            let confirmed = opts.confirm || false;
            //console.log('increased_allow', increased_allow);
            if (increased_allow > 0 && !confirmed) {
                // Ask for amount to sell
                total = base_allow + increased_allow;
                qty = prompt(`How many do you wish to sell? Max: ${total}`, total);
            }

            if (qty === null) {
                // they clicked cancel
                return;
            }

            // Confirm the sell
            // Update qty to the max
            qty = this.$store.getters.max_item_sell([item, qty]);

            if (this.$store.getters.option('confirm_sell') == 1) {
                confirmed = confirm(`Sell ${qty}x ` + item.name + '?');
            } else {
                confirmed = true;
            }
            if (confirmed) {
                let start = Date.now()
                if (this.$store.getters.penalty_mul === 1) {
                    var sellpenalty10pc = 1;
                } else {
                    var sellpenalty10pc = this.$store.getters.penalty_mul * 0.1 + 1;
                }
                let sellspeedboost = this.$store.getters.increased_speed('sellspeed');

                let runtime = BASES.SELL_SPEED * 1000 * qty * sellpenalty10pc * sellspeedboost;
                //console.log('sell pen', this.$store.getters.penalty_mul, runtime, sellpenalty10pc, sellspeedboost, BASES.SELL_SPEED * 1000 * qty)

                let ele = `#invrow-sell-${item.id}`;
                this.timer = new Timer({
                    start: start,
                    //runtime: runtime,
                    end: start + runtime,
                    cb: data => {
                        //console.log('can sell ', item.name, ' again');
                        document.querySelector(ele).style = '';
                        this.selling = _.without(this.selling, item.id);
                        this.do_sell(item, qty);
                        this.$store.commit('timer_rm', data.id);
                        // If all are finished
                        if (this.selling.length == 0) {
                            this.$store.commit('set_status', null);
                        }
                    },
                    tick: tick => {
                        document.querySelector(ele).innerText = tick.timeleft_s.toFixed(2);
                        document.querySelector(ele).style = tick.css;
                    },
                });
                this.timer.start();
                this.$store.commit('timer_add', this.timer);
                //console.log('starting timer', this.timer.id())
                this.$store.commit('set_status', 'selling');
                this.selling.push(item.id);
            }
        },
        midsell(item) {
            // are we in the middle of selling this item?r
            return _.contains(this.selling, item.id);
        },
        totalvalue() {
            let inv = this.$store.getters.inventory;
            if (!this.$store.getters.has_upgrade('inv_totalvalue')) {
                return '?';
            }
            return _.reduce(inv, (acc, val) => acc + val.value, 0);
        },
        totalitems() {
            if (!this.$store.getters.has_upgrade('inv_totalcount')) {
                return '?';
            }
            return this.$store.getters.inventory.length;
        },
        uncommon(item) {
            return !_.contains(['junk', 'common'], item.dropgroup);
        },
        close_achievement(name) {
            this.$store.state.tmp.achievements = _.reject(this.$store.state.tmp.achievements, a => a.name == name);
            console.log('name', this.$store.state.tmp.achievements, name);
        },

        sort(col) {
            let sort = this['sort_' + col];
            if (sort === undefined) return; // undefined
            if (this.has_upgrade('inv_sort_' + col)) {
                // only sort if we have the update
                sort = sort == 'asc' ? 'desc' : 'asc';
                this['sort_' + col] = sort;
            }
        },

        // Some multi selling
        sellmax(item) {
            let max = this.$store.getters.max_item_sell([item, item.qty]);
            this.sell(item, {qty: max, confirm: true});
        }
    },
    computed: {
        items_list() {
            let items = this.$store.getters.inventory;

            // If we don't have the upgrade, just return raw list
            if (!this.$store.getters.has_upgrade('inv_group')) {
                return items;
            }

            //let keys = items[0]
            let inv = {};
            _.each(items, (i, idx) => {
                var o = i;
                if (i.id in inv) {
                    // update quantity
                    inv[i.id].qty += 1;
                } else {
                    o.qty = 1;
                    inv[i.id] = o;
                }
            });

            // add sorts, filters
            if (this.has_upgrade('inv_sort_name') && this.sort_name != '') {
                // check without upgrade too btw
                inv = _.sortBy(inv, 'name');
                if (this.sort_name == 'desc') {
                    inv = inv.reverse();
                }
            }
            return inv;
        },
        sorts_list() {
            //filtttttterssssssss
            return this.sorts;
        },
        filters_list() {

        },
        sort_icon_name() {
            //console.log('sortz', this.sort_name)
            if (!this.sort_name || !this.has_upgrade('inv_sort_name')) return;
            this.sort_name = this.sort_name || 'desc';
            return unicode_arrow(this.sort_name);
        },

        new_achievements() {
            return this.$store.getters.new_achievements;
        },
        max_multi_sell() {
            let increased_allow = this.$store.getters.sum_inv_type('invpagemultisell');
            return increased_allow + 1; // +1 for the base amount
        },

        busy() {
            return this.$store.getters.status == 'running';
        }
    }
});
const Actionmenu = Vue.component('actionmenu', {
    template: '#actionmenu',
    computed: {
        upgrades() {
            let ups = this.$store.getters.upgrades(false);
            // only show ones that don't end in 1
            return _.filter(ups, u => u.cost % 10 === 0 && !this.owned(u.name));
        },
        upgrades_owned() {
            let ups = this.$store.getters.upgrades(true);
            return _.sortBy(ups, 'name');
        },
        messages() {
             let z = this.$store.getters.messages;
             return z;
        }
    },
    methods: {
        owned(name) {
            return this.$store.getters.has_upgrade(name);
        },
        toomuch(up) {
            return this.$store.getters.player.gold < up.cost;
        },
        buytext(up) {
            let s = 'Buy for ' + up.cost + 'g'; //&#x1F5F8;
            return this.owned(up.name) ? "Owned" : up.cost + 'g';
        },
        purchase(up) {
            let pl = this.$store.getters.player;
            if (this.owned(up.name)) {
                console.log('Already owned');
                return;
            };
            if (pl.gold >= up.cost) {
                this.$store.commit('add_gold', -up.cost);
                this.$store.commit('add_upgrade', up.name);
                this.$store.commit('stat', ['gold_spent', up.cost]);
                this.$store.dispatch('save');
            } else {
                // can't afford it bruh
                this.$parent.message('Cannot afford this upgrade');
            }
        },
        messageclass(m) {
            let cls = ['message'];
            cls.push('message-' + m.type);
            return cls;
        },
        has_requirement(up) {
            if (!up.requires) return;

            // See what it requires
            let ups = this.$store.getters.upgrade(up.requires);
            if (ups !== false && !this.owned(ups.name)) {
                return `(requires: ${ups.nice_name})`;
            }
            return '';
        },
        done_requirements(up) {
            return (up.requires != false && this.owned(up.requires)) || up.requires == false;
        },
    }
});