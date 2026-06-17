/**
 * STUDY.JS - Flashcards, Kanban & University Engines
 * Master Class Edition — Audited
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

/* Grades & Faltas — UFPI */
export class Grades {
    static get() { return Store.get('orbit_grades', []); }
    static save(a) { Store.set('orbit_grades', a); }

    static sync() {
        const disc = Store.get('orbit_disc', []);
        const grades = this.get();
        const synced = disc.map(d => {
            const existing = grades.find(g => g.discId === d.id);
            return existing || { discId: d.id, name: d.name, notas: [null, null], faltas: 0, cargaHoraria: 60 };
        });
        this.save(synced);
        return synced;
    }

    static update(discId, changes) {
        const all = this.get();
        const idx = all.findIndex(g => g.discId === discId);
        if (idx >= 0) { all[idx] = { ...all[idx], ...changes }; this.save(all); }
    }

    static calcMedia(notas) {
        const valid = notas.filter(n => n !== null && n !== '');
        if (!valid.length) return null;
        return valid.reduce((s, n) => s + parseFloat(n), 0) / valid.length;
    }

    static statusFor(media, faltas, cargaHoraria = 60) {
        const maxFaltas = cargaHoraria * 0.25;
        if (faltas > maxFaltas) return 'reprovado_faltas';
        if (media === null) return 'cursando';
        if (media >= 7) return 'aprovado';
        if (media >= 4) return 'final';
        return 'reprovado';
    }

    static calcCR(grades) {
        const valid = grades.filter(g => {
            const m = this.calcMedia(g.notas);
            return m !== null;
        });
        if (!valid.length) return null;
        const total = valid.reduce((s, g) => s + this.calcMedia(g.notas), 0);
        return (total / valid.length).toFixed(2);
    }

    /* Quanto precisa tirar nas notas restantes pra fechar a média alvo (padrão: aprovação direta) */
    static neededGrade(notas, target = 7) {
        const known = notas.filter(n => n !== null && n !== '');
        const missing = notas.length - known.length;
        if (missing <= 0) return null;
        const sum = known.reduce((s, n) => s + parseFloat(n), 0);
        return Math.round(((target * notas.length - sum) / missing) * 100) / 100;
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
