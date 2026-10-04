// Injected into the game page by tests/play.cjs (rotest eval). Talks to NPCs
// the way the client does -- the same packets its NPC windows send -- and
// reads the NPC windows back, so a test needs no screen coordinates. An NPC
// is an entity of type NPC or NPC2 (what the client reports for Welcoming).
// Uses window.roAgent (the app's agent hook, docs/AGENT_TESTING.md).
(() => {
    if (window.snpc) return 'ready';
    const M = roAgent.modules;
    const ui = name => M.UIManager.getComponent(name);
    const root = name => { const c = ui(name); try { return c && c.getRoot ? c.getRoot() : null; } catch { return null; } };
    const shown = el => !!el && el.isConnected && getComputedStyle(el).display !== 'none' && el.offsetParent !== null;
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const send = (name, fields) => { const p = new M.PACKET.CZ[name](); Object.assign(p, fields); M.Network.sendPacket(p); };

    // What the player sees of the NPC right now.
    function view() {
        const box = root('NpcBox'), menu = root('NpcMenu');
        const boxContent = box && box.querySelector('.content');
        // n: the number rAthena's select() returns for the item. An empty
        // option is not drawn, so n is read off the item, not its position.
        const items = menu && shown(menu.querySelector('.content'))
            ? [...menu.querySelectorAll('.content div[data-index]')]
                .map(d => ({ n: Number(d.dataset.index) + 1, text: d.textContent.trim() })) : [];
        return {
            text: boxContent && shown(boxContent) ? boxContent.innerText.trim() : '',
            next: !!box && shown(box.querySelector('.next')),
            close: !!box && shown(box.querySelector('.close')),
            menu: items,
        };
    }
    // Waits until the view changes from `before` (or a timeout), then returns it.
    async function settle(before, ms = 4000) {
        const start = Date.now();
        let now = view();
        while (Date.now() - start < ms) {
            await sleep(150);
            now = view();
            if (JSON.stringify(now) !== before) { await sleep(300); return view(); }
        }
        return now;
    }
    // The NPC being talked to. The text box knows it, but an NPC that only
    // shows menus (the Warper) never opens one, so talk() remembers it too.
    let talking = 0;
    const owner = () => ui('NpcBox').ownerID || talking;

    window.snpc = {
        view,
        npcs: (radius = 10) => roAgent.entities({ radius }).filter(e => /^NPC/.test(e.type)).map(e => ({ gid: e.gid, name: e.name, position: e.position })),
        async talk(prefix) {
            const npc = roAgent.entities({ radius: 14 }).filter(e => /^NPC/.test(e.type)).find(e => e.name.startsWith(prefix));
            if (!npc) return { error: `no NPC named ${prefix}* within 14 cells` };
            const before = JSON.stringify(view());
            talking = npc.gid;
            send('CONTACTNPC', { NAID: npc.gid, type: 1 });
            return { npc: npc.name, ...(await settle(before)) };
        },
        async next() {
            const before = JSON.stringify(view());
            send('REQ_NEXT_SCRIPT', { NAID: owner() });
            return settle(before);
        },
        // n is 1-based, as rAthena's select() counts; 255 cancels.
        async choose(n) {
            const before = JSON.stringify(view());
            ui('NpcMenu').onSelectMenu(owner(), n);
            return settle(before);
        },
        // The first menu item whose text starts with `prefix`.
        async pick(prefix) {
            const item = view().menu.find(i => i.text.startsWith(prefix));
            if (!item) return { error: `no menu item ${prefix}*`, ...view() };
            return this.choose(item.n);
        },
        // Presses Next until a menu with an item starting with `prefix`
        // appears (at most `steps` times), then picks it.
        async go(prefix, steps = 6) {
            for (let i = 0; i < steps; i++) {
                const v = view();
                if (v.menu.some(item => item.text.startsWith(prefix))) return this.pick(prefix);
                if (!v.next) break;
                await this.next();
            }
            return { error: `no menu item ${prefix}* reached`, ...view() };
        },
        // Opens a shop NPC's buy list and returns the item names in it.
        async shop(prefix) {
            const npc = roAgent.entities({ radius: 14 }).filter(e => /^NPC/.test(e.type)).find(e => e.name.startsWith(prefix));
            if (!npc) return { error: `no NPC named ${prefix}* within 14 cells` };
            send('CONTACTNPC', { NAID: npc.gid, type: 1 });
            await sleep(1000);
            send('ACK_SELECT_DEALTYPE', { NAID: npc.gid, type: 0 });
            await sleep(1500);
            const store = root('NpcStore');
            const names = store ? [...store.querySelectorAll('.name')].map(e => e.textContent.trim()).filter(Boolean) : [];
            try { ui('NpcStore').remove(); } catch { /* not open */ }
            return { npc: npc.name, items: [...new Set(names)] };
        },
        async close() {
            const box = ui('NpcBox');
            if (box && box.onClosePressed) box.onClosePressed(owner());
            await sleep(300);
            return view();
        },
        chat: (n = 8) => roAgent.chat(n),
    };
    return 'installed';
})()
