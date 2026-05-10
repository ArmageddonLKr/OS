/**
 * AGENDA.JS — Gerenciamento de eventos e calendário
 */
import { Store } from './store.js';

const K_EVT = 'orbit_agenda_events';

export const EVT_CATS = [
    { id: 'ufpi',     name: 'UFPI',        color: '#4a9eff', icon: '🎓' },
    { id: 'dax',      name: 'DAX',         color: '#c9982a', icon: '💼' },
    { id: 'nupi',     name: 'NUPIEEPRO',   color: '#a78bfa', icon: '🏛️' },
    { id: 'faith',    name: 'Fé',          color: '#fbbf24', icon: '🙏' },
    { id: 'health',   name: 'Saúde',       color: '#22c55e', icon: '💪' },
    { id: 'personal', name: 'Pessoal',     color: '#ebebeb', icon: '📌' },
    { id: 'other',    name: 'Outros',      color: '#6b7280', icon: '📅' },
];

export class Agenda {
    static getEvents() { return Store.get(K_EVT, []); }
    static saveEvents(a) { Store.set(K_EVT, a); }

    static add(evt) {
        const all = this.getEvents();
        const item = { id: Date.now().toString(), ...evt, created: Date.now() };
        all.push(item);
        this.saveEvents(all);
        return item;
    }

    static remove(id) {
        this.saveEvents(this.getEvents().filter(e => e.id !== id));
    }

    static update(id, updates) {
        this.saveEvents(this.getEvents().map(e => e.id === id ? { ...e, ...updates } : e));
    }

    static getForDate(dateStr) {
        const disc = Store.get('orbit_disc', []);
        const [y, m, d] = dateStr.split('-').map(Number);
        const dow = new Date(y, m - 1, d).getDay();

        const classes = disc
            .filter(di => di.days && di.days.includes(dow))
            .map(di => ({ id: 'disc_' + di.id, title: di.name, cat: 'ufpi', time: di.time || '', disc: true, professor: di.professor || '' }));

        const events = this.getEvents().filter(e => e.date === dateStr);
        return [...classes, ...events].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    }

    static getForMonth(year, month) {
        const prefix = `${year}-${String(month).padStart(2, '0')}`;
        return this.getEvents().filter(e => e.date && e.date.startsWith(prefix));
    }

    static getDaysWithEvents(year, month) {
        const evts = this.getForMonth(year, month);
        const disc = Store.get('orbit_disc', []);
        const days = new Set(evts.map(e => parseInt(e.date.split('-')[2])));

        const daysInMonth = new Date(year, month, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
            const dow = new Date(year, month - 1, d).getDay();
            if (disc.some(di => di.days && di.days.includes(dow))) days.add(d);
        }
        return days;
    }

    static getUpcoming(limit = 5) {
        const today = new Date().toISOString().slice(0, 10);
        return this.getEvents()
            .filter(e => e.date >= today)
            .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
            .slice(0, limit);
    }

    static catColor(catId) {
        return EVT_CATS.find(c => c.id === catId)?.color || '#888';
    }
}
