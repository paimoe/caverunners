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
        }
    }),
    computed: {
        is_running() {
            //console.log('time', this.time, this.time>0)
            let run = this.$store.getters.run;
            return this.time > 0;// || run.ack_end == false;
        },
        timeleft() {
            let s = this.time / 1000;
            let run = this.$store.getters.run;
            if (this.running == true/* || run.ack_end != true*/) {
                return (Math.round(s * 100) / 100).toFixed(2);
            } else {
                if (this.$store.getters.over_hard_limit) {
                    return 'You are carrying too much! Sell some of your items.';
                }
                return 'Enter Dungeon ›';
            }
        },  
        over_hard_limit() {
            return this.$store.getters.over_hard_limit;
        },
    },
    methods: {
        run() {
            //console.log('run dungeon');
            let diff = this.$store.getters.difficulty;
            let diff_range = 0.1;
            let min = diff * (1 - diff_range);
            let max = diff * (1 + diff_range);
            //console.log('min',min,max)

            let runtime = rand_between(min, max) * 1000 * this.$store.getters.increased_speed;
            this.time = runtime;
            this.running = true;
            this.time_start = Date.now();
            this.time_take = runtime;

            if (!this.timer) {
                //console.log('start timer');
                this.ack_end = false;

                this.timer = requestAnimationFrame(this.update_run);
            }
        },
        update_run() {
            var timeleft = this.time_start + this.time_take - Date.now();
            //console.log('timeleft', timeleft);
            if (timeleft > 0) {
                //this.time = Math.max(0, this.time - speed);
                this.time = Math.max(0, timeleft);
                requestAnimationFrame(this.update_run);
            } else {
                //console.log('times up!');
                cancelAnimationFrame(this.timer);
                this.end_run();
                this.timer = null;
                this.running = false;
                this.time = this.time_start = this.time_take = 0;
            }
        },
        end_run() {
            //console.log('ended run, heres some loot');

            // Give random item, gold
            const GOLD_FACTOR = 0.1;
            let diff = this.$store.getters.difficulty;
            let gold = rand_between(diff, diff * 0.5);
            this.$store.commit('add_gold', gold);
            //console.log('gold!', gold);

            // Gain exp
            var expgain = rand_between(0.5*diff, diff);
            this.$store.commit('add_exp', expgain);

            let rng = rand_between(1,100);
            // Check upgrades for item find

            // chance for item
            var newitems = [];
            //console.log('RNG', rng);
            let itemchance = BASES.MF;
            itemchance = 101;
            if (rng < itemchance) {
                // got an item!
                let numnewitems = Math.floor(rand_between(1,3));
                let ritem = random_item(this.$store.getters.items, numnewitems);
                //let ritem = _.sample(this.$store.getters.items);
                newitems = newitems.concat(ritem);
                //console.log('You got an item!', ritem.name);
                this.$store.commit('add_to_inventory', newitems);
            }

            //console.log('gained', gold.toFixed(0), 'gold and', expgain.toFixed(0), 'exp!')
            this.$store.commit('run', {
                running: this.running,
                ack_end: this.ack_end,
                ended: true,
                result: {
                    'gold': gold,
                    'exp': expgain,
                    'items': newitems,
                    'time': this.time_take/1000, // only used for display atm
                }
            })

            this.$store.commit('save');
            this.$parent.message('Game Saved');

        },
        css_gradient_percent() {
            //console.log('gradien');
            // Find a way to generalize this, pass in percent or something
            let pc = ((Date.now() - this.time_start) * 100) / ((this.time_start + this.time_take) - this.time_start);
            pc = Math.min(100, pc).toFixed(2);
            let plus5 = pc + 5;
            z = `background: linear-gradient(to right, #4F9622 0%, #4F9622 ${pc}%, #4A2E17 ${pc}%, #4A2E17 100%);`
            return z;
        }
    }
});
const Notices = Vue.component('notices', {
    template: '#notices',
    data: () => {
        lastrun: {}
    },
    methods: {
        show() {
            let run = this.$store.getters.run;
            if (run.ended === true && run.ack_end === false) {
                return true;
            }
            return false;
        },
        confirm_end() {
            this.ack_end = true;
            this.last_run = 'etc';
            this.$store.commit('run_end');
        }
    },
    computed: {
        run() {
            // Get latest run
            let run = this.$store.getters.run.result;
            return run;

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
                increased_speed: 100 - 100 * this.$store.getters.increased_speed, // convert to %
                gold_find: this.$store.getters.gold_find,
                magic_find: this.$store.getters.magic_find,
                max_penalty: this.$store.getters.max_penalty,
            }
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
            this.$store.commit('save');
        }

    }
});
const Inventory = Vue.component('inventory', {
    template: '#inventory',
    methods: {
        items() {
            return this.$store.getters.inventory;
        },
        has_upgrade(name) {
            return this.$store.getters.has_upgrade(name);
        },
        sell(item) {
            let qty = 1;
            if (this.has_upgrade('inv_multisell')) {
                // Ask for amount to sell
            }

            // Confirm the sell
            if (confirm('Sell 1x ' + item.name + '?')) {

                // Add gold
                this.$store.commit('add_gold', item.value);
                this.$store.commit('remove_item', {'item': item, 'qty': qty});
                this.$store.commit('save');

                // Set sell timeout
            }
        },
        totalvalue() {
            let inv = this.$store.getters.inventory;
            return _.reduce(inv, (acc, val) => acc + val.value, 0);
        },
        totalitems() {
            return this.$store.getters.inventory.length;
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
            return inv;
        }
    }
});
const Actionmenu = Vue.component('actionmenu', {
    template: '#actionmenu',
    computed: {
        upgrades() {
            return this.$store.getters.upgrades(false);
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
                this.$store.commit('save');
            } else {
                // can't afford it bruh
                this.$parent.message('Cannot afford this upgrade');
            }
        }
    }
});