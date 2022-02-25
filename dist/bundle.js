
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var tabBarPlugin = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function stop_propagation(fn) {
        return function (event) {
            event.stopPropagation();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            // @ts-ignore
            callbacks.slice().forEach(fn => fn.call(this, event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error('Cannot have duplicate keys in a keyed each');
            }
            keys.add(key);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.46.4' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\lib\Tab.svelte generated by Svelte v3.46.4 */
    const file$2 = "src\\lib\\Tab.svelte";

    function create_fragment$2(ctx) {
    	let div2;
    	let div0;
    	let t0;
    	let span0;
    	let t2;
    	let span1;
    	let div1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			t0 = space();
    			span0 = element("span");
    			span0.textContent = `${/*name*/ ctx[3]}`;
    			t2 = space();
    			span1 = element("span");
    			div1 = element("div");
    			attr_dev(div0, "class", "active-indicator svelte-1511mcd");
    			set_style(div0, "display", /*active*/ ctx[0] ? 'block' : 'none');
    			add_location(div0, file$2, 21, 2, 510);
    			attr_dev(span0, "class", "name svelte-1511mcd");
    			add_location(span0, file$2, 22, 2, 592);
    			attr_dev(div1, "class", "close-icon svelte-1511mcd");
    			add_location(div1, file$2, 30, 4, 821);
    			set_style(span1, "visibility", /*active*/ ctx[0] ? 'visible' : 'hidden');
    			attr_dev(span1, "class", "close-button svelte-1511mcd");
    			toggle_class(span1, "single", /*single*/ ctx[2]);
    			add_location(span1, file$2, 23, 2, 628);
    			attr_dev(div2, "class", "container svelte-1511mcd");
    			toggle_class(div2, "active", /*active*/ ctx[0]);
    			toggle_class(div2, "preview", /*preview*/ ctx[1]);
    			add_location(div2, file$2, 20, 0, 432);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div2, t0);
    			append_dev(div2, span0);
    			append_dev(div2, t2);
    			append_dev(div2, span1);
    			append_dev(span1, div1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(span1, "click", stop_propagation(/*closeTab*/ ctx[5]), false, false, true),
    					listen_dev(span1, "mousedown", stop_propagation(/*mousedown_handler*/ ctx[7]), false, false, true),
    					listen_dev(div2, "mousedown", /*openFile*/ ctx[4], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*active*/ 1) {
    				set_style(div0, "display", /*active*/ ctx[0] ? 'block' : 'none');
    			}

    			if (dirty & /*active*/ 1) {
    				set_style(span1, "visibility", /*active*/ ctx[0] ? 'visible' : 'hidden');
    			}

    			if (dirty & /*single*/ 4) {
    				toggle_class(span1, "single", /*single*/ ctx[2]);
    			}

    			if (dirty & /*active*/ 1) {
    				toggle_class(div2, "active", /*active*/ ctx[0]);
    			}

    			if (dirty & /*preview*/ 2) {
    				toggle_class(div2, "preview", /*preview*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Tab', slots, []);
    	let { path = "" } = $$props;
    	let { active = false } = $$props;
    	let { preview = false } = $$props;
    	let { single = false } = $$props;
    	let name = path.match(/.*[/\\](.*)/)?.[1] ?? path;
    	const dispatch = createEventDispatcher();

    	function openFile() {
    		dispatch("openfile", { path });
    	}

    	function closeTab() {
    		dispatch("closefile", { path });
    	}

    	const writable_props = ['path', 'active', 'preview', 'single'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Tab> was created with unknown prop '${key}'`);
    	});

    	function mousedown_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ('path' in $$props) $$invalidate(6, path = $$props.path);
    		if ('active' in $$props) $$invalidate(0, active = $$props.active);
    		if ('preview' in $$props) $$invalidate(1, preview = $$props.preview);
    		if ('single' in $$props) $$invalidate(2, single = $$props.single);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		path,
    		active,
    		preview,
    		single,
    		name,
    		dispatch,
    		openFile,
    		closeTab
    	});

    	$$self.$inject_state = $$props => {
    		if ('path' in $$props) $$invalidate(6, path = $$props.path);
    		if ('active' in $$props) $$invalidate(0, active = $$props.active);
    		if ('preview' in $$props) $$invalidate(1, preview = $$props.preview);
    		if ('single' in $$props) $$invalidate(2, single = $$props.single);
    		if ('name' in $$props) $$invalidate(3, name = $$props.name);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [active, preview, single, name, openFile, closeTab, path, mousedown_handler];
    }

    class Tab extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			path: 6,
    			active: 0,
    			preview: 1,
    			single: 2
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tab",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get path() {
    		throw new Error("<Tab>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set path(value) {
    		throw new Error("<Tab>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get active() {
    		throw new Error("<Tab>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set active(value) {
    		throw new Error("<Tab>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get preview() {
    		throw new Error("<Tab>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set preview(value) {
    		throw new Error("<Tab>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get single() {
    		throw new Error("<Tab>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set single(value) {
    		throw new Error("<Tab>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const fileLibrary = document.getElementById("file-library");
    const fileTreeObserver = new MutationObserver(attachListenerToFileNode);

    let activeFile;

    let tabs = [];

    let onTabChanged = () => {};

    function addEventListener(callback) {
      onTabChanged = callback;
    }

    function openFile(path) {
      fileLibrary
        .querySelector(
          `[data-path=\"${path.replace(/\\/gm, "\\\\")}\"] > div.file-node-content`
        )
        ?.click();
    }
    function closeFile(path) {
      const pathIndex = tabs.findIndex((tab) => tab.path === path);

      if (tabs.length <= 1) ; else if (pathIndex === 0) {
        tabs.splice(0, 1);
        openFile(tabs[tabs.length - 1].path);
      } else {
        tabs.splice(pathIndex, 1);
        openFile(tabs[pathIndex - 1].path);
      }

      onTabChanged(tabs);
    }

    function openTab(path, preview = true) {
      const tab = {
        path,
        active: false,
        preview,
      };

      const pathIndex = tabs.findIndex((tab) => tab.path === path);

      if (pathIndex > -1) {
        if (!tabs[pathIndex].preview) tab.preview = false;
        tabs[pathIndex].preview = tab.preview;
      } else {
        const previewIndex = tabs.findIndex((tab) => tab.preview === true);
        if (previewIndex > -1) {
          tabs[previewIndex].path = path;
        } else {
          tabs.push(tab);
        }
      }

      onTabChanged(tabs);
    }

    fileTreeObserver.observe(fileLibrary, {
      childList: true,
      subtree: true,
      attributeFilter: ["class"],
    });

    attachListenerToFileNode();

    function attachListenerToFileNode() {
      const fileNodes = Array.from(
        fileLibrary.querySelectorAll("[data-path][data-is-directory=false]")
      );

      activeFile = "";
      fileNodes.forEach((node) => {
        const path = node.getAttribute("data-path");
        if (node.classList.contains("active")) activeFile = path;

        node.onclick = () => {
          onFileNodeClicked(path);
        };
        node.ondblclick = () => {
          onFileNodeDblClicked(path);
        };
      });

      tabs = tabs.map((tab) => {
        if (tab.path === activeFile) {
          tab.active = true;
          return tab;
        } else {
          tab.active = false;
          return tab;
        }
      });

      onTabChanged(tabs);
    }

    function onFileNodeClicked(path) {
      openTab(path);
    }

    function onFileNodeDblClicked(path) {
      openTab(path, false);
    }

    var tabs$1 = /*#__PURE__*/Object.freeze({
        __proto__: null,
        addEventListener: addEventListener,
        openFile: openFile,
        closeFile: closeFile
    });

    /* src\lib\TabBar.svelte generated by Svelte v3.46.4 */
    const file$1 = "src\\lib\\TabBar.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[18] = list[i];
    	child_ctx[20] = i;
    	return child_ctx;
    }

    // (54:2) {#if mouseClientX && draggedItemIndex !== null}
    function create_if_block(ctx) {
    	let div;
    	let tab;
    	let current;

    	tab = new Tab({
    			props: {
    				path: /*draggedItemData*/ ctx[4].path,
    				active: /*draggedItemData*/ ctx[4].active,
    				preview: /*draggedItemData*/ ctx[4].preview,
    				single: /*tabList*/ ctx[0].length === 1
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(tab.$$.fragment);
    			attr_dev(div, "class", "tab-clone svelte-1acoaxj");
    			set_style(div, "left", /*mouseClientX*/ ctx[5] - /*mouseGrabOffset*/ ctx[6] - (/*cloneContainer*/ ctx[7]?.getBoundingClientRect()?.left ?? 0) + "px");
    			add_location(div, file$1, 54, 4, 1231);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(tab, div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const tab_changes = {};
    			if (dirty & /*draggedItemData*/ 16) tab_changes.path = /*draggedItemData*/ ctx[4].path;
    			if (dirty & /*draggedItemData*/ 16) tab_changes.active = /*draggedItemData*/ ctx[4].active;
    			if (dirty & /*draggedItemData*/ 16) tab_changes.preview = /*draggedItemData*/ ctx[4].preview;
    			if (dirty & /*tabList*/ 1) tab_changes.single = /*tabList*/ ctx[0].length === 1;
    			tab.$set(tab_changes);

    			if (!current || dirty & /*mouseClientX, mouseGrabOffset, cloneContainer*/ 224) {
    				set_style(div, "left", /*mouseClientX*/ ctx[5] - /*mouseGrabOffset*/ ctx[6] - (/*cloneContainer*/ ctx[7]?.getBoundingClientRect()?.left ?? 0) + "px");
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tab.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tab.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(tab);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(54:2) {#if mouseClientX && draggedItemIndex !== null}",
    		ctx
    	});

    	return block;
    }

    // (78:2) {#each tabList as tab, index (tab.path)}
    function create_each_block(key_1, ctx) {
    	let div;
    	let tab;
    	let t;
    	let current;
    	let mounted;
    	let dispose;

    	tab = new Tab({
    			props: {
    				path: /*tab*/ ctx[18].path,
    				active: /*tab*/ ctx[18].active,
    				preview: /*tab*/ ctx[18].preview,
    				single: /*tabList*/ ctx[0].length === 1
    			},
    			$$inline: true
    		});

    	tab.$on("openfile", /*openfile_handler*/ ctx[12]);
    	tab.$on("closefile", /*closefile_handler*/ ctx[13]);

    	function mousedown_handler(...args) {
    		return /*mousedown_handler*/ ctx[14](/*tab*/ ctx[18], /*index*/ ctx[20], ...args);
    	}

    	function mouseover_handler(...args) {
    		return /*mouseover_handler*/ ctx[15](/*index*/ ctx[20], ...args);
    	}

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div = element("div");
    			create_component(tab.$$.fragment);
    			t = space();
    			attr_dev(div, "class", "grab-container svelte-1acoaxj");
    			toggle_class(div, "invisible", /*tab*/ ctx[18].path === /*draggedItemData*/ ctx[4]?.path);
    			add_location(div, file$1, 79, 4, 1870);
    			this.first = div;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(tab, div, null);
    			append_dev(div, t);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(div, "mousedown", stop_propagation(mousedown_handler), false, false, true),
    					listen_dev(div, "mouseover", mouseover_handler, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const tab_changes = {};
    			if (dirty & /*tabList*/ 1) tab_changes.path = /*tab*/ ctx[18].path;
    			if (dirty & /*tabList*/ 1) tab_changes.active = /*tab*/ ctx[18].active;
    			if (dirty & /*tabList*/ 1) tab_changes.preview = /*tab*/ ctx[18].preview;
    			if (dirty & /*tabList*/ 1) tab_changes.single = /*tabList*/ ctx[0].length === 1;
    			tab.$set(tab_changes);

    			if (dirty & /*tabList, draggedItemData*/ 17) {
    				toggle_class(div, "invisible", /*tab*/ ctx[18].path === /*draggedItemData*/ ctx[4]?.path);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tab.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tab.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(tab);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(78:2) {#each tabList as tab, index (tab.path)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let t0;
    	let div0;
    	let t1;
    	let div1;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*mouseClientX*/ ctx[5] && /*draggedItemIndex*/ ctx[1] !== null && create_if_block(ctx);
    	let each_value = /*tabList*/ ctx[0];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*tab*/ ctx[18].path;
    	validate_each_keys(ctx, each_value, get_each_context, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			t0 = space();
    			div0 = element("div");
    			if (if_block) if_block.c();
    			t1 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "class", "clone-container svelte-1acoaxj");
    			add_location(div0, file$1, 52, 0, 1118);
    			attr_dev(div1, "class", "container svelte-1acoaxj");
    			add_location(div1, file$1, 70, 0, 1611);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div0, anchor);
    			if (if_block) if_block.m(div0, null);
    			/*div0_binding*/ ctx[11](div0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			/*div1_binding*/ ctx[16](div1);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(document.body, "mousemove", /*mousemove_handler*/ ctx[8], false, false, false),
    					listen_dev(document.body, "mouseup", /*mouseup_handler*/ ctx[9], false, false, false),
    					listen_dev(document.body, "mouseleave", /*mouseleave_handler*/ ctx[10], false, false, false),
    					listen_dev(div1, "wheel", prevent_default(/*wheel_handler*/ ctx[17]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*mouseClientX*/ ctx[5] && /*draggedItemIndex*/ ctx[1] !== null) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*mouseClientX, draggedItemIndex*/ 34) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div0, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (dirty & /*tabList, draggedItemData, draggedItemIndex, mouseClientX, mouseGrabOffset, hoveredItemIndex, tabs*/ 119) {
    				each_value = /*tabList*/ ctx[0];
    				validate_each_argument(each_value);
    				group_outros();
    				validate_each_keys(ctx, each_value, get_each_context, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div1, outro_and_destroy_block, create_each_block, null, get_each_context);
    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div0);
    			if (if_block) if_block.d();
    			/*div0_binding*/ ctx[11](null);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			/*div1_binding*/ ctx[16](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('TabBar', slots, []);

    	addEventListener(newTabs => {
    		$$invalidate(0, tabList = newTabs);
    	});

    	let tabList = [];
    	let scrollContainer;
    	let draggedItemData = {};
    	let draggedItemIndex = null;
    	let hoveredItemIndex = null;
    	let mouseClientX;
    	let mouseGrabOffset;
    	let cloneContainer;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<TabBar> was created with unknown prop '${key}'`);
    	});

    	const mousemove_handler = e => {
    		$$invalidate(5, mouseClientX = e.clientX);
    	};

    	const mouseup_handler = e => {
    		$$invalidate(4, draggedItemData = {});
    		$$invalidate(1, draggedItemIndex = null);
    		$$invalidate(2, hoveredItemIndex = null);
    		$$invalidate(5, mouseClientX = e.clientX);
    	};

    	const mouseleave_handler = e => {
    		$$invalidate(4, draggedItemData = {});
    		$$invalidate(1, draggedItemIndex = null);
    		$$invalidate(2, hoveredItemIndex = null);
    		$$invalidate(5, mouseClientX = e.clientX);
    	};

    	function div0_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			cloneContainer = $$value;
    			$$invalidate(7, cloneContainer);
    		});
    	}

    	const openfile_handler = e => {
    		openFile(e.detail.path);
    	};

    	const closefile_handler = e => {
    		closeFile(e.detail.path);
    	};

    	const mousedown_handler = (tab, index, e) => {
    		$$invalidate(4, draggedItemData = tab);
    		$$invalidate(1, draggedItemIndex = index);
    		$$invalidate(5, mouseClientX = e.clientX);
    		$$invalidate(6, mouseGrabOffset = e.clientX - e.target.getBoundingClientRect().left);
    	};

    	const mouseover_handler = (index, e) => {
    		$$invalidate(2, hoveredItemIndex = index);
    	};

    	function div1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			scrollContainer = $$value;
    			$$invalidate(3, scrollContainer);
    		});
    	}

    	const wheel_handler = e => {
    		$$invalidate(3, scrollContainer.scrollLeft += e.deltaY, scrollContainer);
    	};

    	$$self.$capture_state = () => ({
    		Tab,
    		tabs: tabs$1,
    		tabList,
    		scrollContainer,
    		draggedItemData,
    		draggedItemIndex,
    		hoveredItemIndex,
    		mouseClientX,
    		mouseGrabOffset,
    		cloneContainer
    	});

    	$$self.$inject_state = $$props => {
    		if ('tabList' in $$props) $$invalidate(0, tabList = $$props.tabList);
    		if ('scrollContainer' in $$props) $$invalidate(3, scrollContainer = $$props.scrollContainer);
    		if ('draggedItemData' in $$props) $$invalidate(4, draggedItemData = $$props.draggedItemData);
    		if ('draggedItemIndex' in $$props) $$invalidate(1, draggedItemIndex = $$props.draggedItemIndex);
    		if ('hoveredItemIndex' in $$props) $$invalidate(2, hoveredItemIndex = $$props.hoveredItemIndex);
    		if ('mouseClientX' in $$props) $$invalidate(5, mouseClientX = $$props.mouseClientX);
    		if ('mouseGrabOffset' in $$props) $$invalidate(6, mouseGrabOffset = $$props.mouseGrabOffset);
    		if ('cloneContainer' in $$props) $$invalidate(7, cloneContainer = $$props.cloneContainer);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*draggedItemIndex, hoveredItemIndex, tabList*/ 7) {
    			{
    				if (draggedItemIndex !== null && hoveredItemIndex !== null && draggedItemIndex !== hoveredItemIndex) {
    					$$invalidate(0, [tabList[draggedItemIndex], tabList[hoveredItemIndex]] = [tabList[hoveredItemIndex], tabList[draggedItemIndex]], tabList);
    					$$invalidate(1, draggedItemIndex = hoveredItemIndex);
    				}
    			}
    		}
    	};

    	return [
    		tabList,
    		draggedItemIndex,
    		hoveredItemIndex,
    		scrollContainer,
    		draggedItemData,
    		mouseClientX,
    		mouseGrabOffset,
    		cloneContainer,
    		mousemove_handler,
    		mouseup_handler,
    		mouseleave_handler,
    		div0_binding,
    		openfile_handler,
    		closefile_handler,
    		mousedown_handler,
    		mouseover_handler,
    		div1_binding,
    		wheel_handler
    	];
    }

    class TabBar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TabBar",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.46.4 */

    const { console: console_1 } = globals;
    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let div1;
    	let div0;
    	let tabbar;
    	let current;
    	tabbar = new TabBar({ $$inline: true });

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			create_component(tabbar.$$.fragment);
    			attr_dev(div0, "class", "tab-bar-container svelte-1vhgd3o");
    			add_location(div0, file, 6, 2, 129);
    			attr_dev(div1, "class", "container svelte-1vhgd3o");
    			add_location(div1, file, 5, 0, 103);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			mount_component(tabbar, div0, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tabbar.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tabbar.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_component(tabbar);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	console.log("Tabs Plugin Running!");
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ TabBar });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const target = document.createElement("div");
    target.setAttribute("id", "svelte-target");

    document
      .getElementById("write-style")
      .parentElement.insertBefore(target, document.getElementById("write-style"));

    const app = new App({
      target: target,
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
