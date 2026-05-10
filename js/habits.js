/**
 * HABITS.JS — Hábitos diários com streaks
 */
import { Store } from './store.js';

const K_HAB = 'orbit_habits';

export class Habits {
    static getAll() { return Store.get(K_HAB, []); }
    static save(a) { Store.set(K_HAB, a); }

    static add(name, icon, freq = 'daily') {
        const all = this.getAll();
        all.push({ id: Date.now().toString(), name, icon: icon || '●', freq, done: [] });
        this.save(all);
    }

    static remove(id) { this.save(this.getAll().filter(h => h.id !== id)); }

    static update(id, changes) {
        const all = this.getAll();
        const idx = all.findIndex(h => h.id === id);
        if (idx >= 0) { all[idx] = { ...all[idx], ...changes }; this.save(all); }
    }

    static toggle(id, date) {
        const all = this.getAll();
        const h = all.find(x => x.id === id);
        if (!h) return null;
        h.done = h.done || [];
        if (h.done.includes(date)) {
            h.done = h.done.filter(d => d !== date);
        } else {
            h.done.push(date);
        }
        this.save(all);
        return h;
    }

    static getStreak(habit) {
        if (!habit) return 0;
        let streak = 0;
        let d = new Date();
        let skippedToday = false;
        while (streak < 366) {
            const ds = d.toISOString().slice(0, 10);
            if ((habit.done || []).includes(ds)) {
                streak++;
            } else {
                if (!skippedToday) {
                    skippedToday = true;
                    d.setDate(d.getDate() - 1);
                    continue;
                }
                break;
            }
            d.setDate(d.getDate() - 1);
        }
        return streak;
    }

    static getLast30(habit) {
        if (!habit) return [];
        const days = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const ds = d.toISOString().slice(0, 10);
            days.push({ date: ds, done: (habit.done || []).includes(ds), day: d.getDate() });
        }
        return days;
    }

    static todayStats() {
        const all = this.getAll();
        const today = new Date().toISOString().slice(0, 10);
        const done = all.filter(h => (h.done || []).includes(today)).length;
        return { done, total: all.length };
    }
}
