/**
 * STUDY.JS - Flashcards, Kanban & University Engines
 * Master Class Edition
 */

import { Store, K } from './store.js';

/* [#91][#92] Flashcards Engine (Leitner System) */
export class Flashcards {
    static get() { return Store.get(K.flash, []); }
    static save(a) { Store.set(K.flash, a); }

    static add(cards) {
        const all = this.get();
        cards.forEach(c => {
            all.push({
                id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                f: c.f || '?',
                b: c.b || '?',
                box: 1
            });
        });
        this.save(all);
    }

    static updateBox(id, knew) {
        const all = this.get();
        const card = all.find(c => c.id === id);
        if (card) {
            card.box = knew ? Math.min(card.box + 1, 5) : 1;
            this.save(all);
        }
    }
}

/* [#114] Kanban Engine */
export class Kanban {
    static get() { return Store.get(K.kanban, { todo: [], doing: [], done: [] }); }
    static save(k) { Store.set(K.kanban, k); }

    static add(col, text) {
        const kb = this.get();
        if (!kb[col]) kb[col] = [];
        kb[col].push({ id: Date.now().toString(), text });
        this.save(kb);
    }

    static move(id, from, to) {
        const kb = this.get();
        const card = kb[from].find(c => c.id === id);
        if (card) {
            kb[from] = kb[from].filter(c => c.id !== id);
            if (!kb[to]) kb[to] = [];
            kb[to].push(card);
            this.save(kb);
        }
    }

    static remove(id, col) {
        const kb = this.get();
        kb[col] = (kb[col] || []).filter(c => c.id !== id);
        this.save(kb);
    }
}

/* [#115] Disciplines (UFPI) Engine */
export class University {
    static get() { return Store.get(K.disc, []); }
    static save(a) { Store.set(K.disc, a); }

    static add(name, prof, time, days) {
        const all = this.get();
        all.push({
            id: Date.now().toString(),
            name,
            professor: prof,
            time,
            days
        });
        this.save(all);
    }

    static remove(id) {
        const all = this.get().filter(d => d.id !== id);
        this.save(all);
    }
}

/* [#119] Idea Vault Engine */
export class IdeaVault {
    static get() { return Store.get('orbit_ideas', []); }
    static save(a) { Store.set('orbit_ideas', a); }

    static add(text) {
        const all = this.get();
        all.push({
            id: Date.now().toString(),
            text,
            date: new Date().toLocaleDateString('pt-BR')
        });
        this.save(all);
    }

    static remove(id) {
        const all = this.get().filter(i => i.id !== id);
        this.save(all);
    }
}
