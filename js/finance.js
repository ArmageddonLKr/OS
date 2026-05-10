/**
 * FINANCE.JS — Gestão financeira completa
 */
import { Store } from './store.js';

const K_TX = 'orbit_finance_tx';

export const FIN_CATS = [
    { id: 'salary',     name: 'Salário',     icon: '💼', type: 'income'  },
    { id: 'freelance',  name: 'Freelance',   icon: '🖥️', type: 'income'  },
    { id: 'dax',        name: 'DAX',         icon: '🎨', type: 'income'  },
    { id: 'other_in',   name: 'Entrada +',   icon: '➕', type: 'income'  },
    { id: 'food',       name: 'Alimentação', icon: '🍽️', type: 'expense' },
    { id: 'transport',  name: 'Transporte',  icon: '🚌', type: 'expense' },
    { id: 'health',     name: 'Saúde',       icon: '💊', type: 'expense' },
    { id: 'education',  name: 'Educação',    icon: '📚', type: 'expense' },
    { id: 'entertain',  name: 'Lazer',       icon: '🎮', type: 'expense' },
    { id: 'housing',    name: 'Moradia',     icon: '🏠', type: 'expense' },
    { id: 'personal',   name: 'Pessoal',     icon: '👤', type: 'expense' },
    { id: 'other',      name: 'Outros',      icon: '📌', type: 'expense' },
];

export class Finance {
    static getAll() { return Store.get(K_TX, []); }
    static save(a) { Store.set(K_TX, a); }

    static getMonth(year, month) {
        const prefix = `${year}-${String(month).padStart(2, '0')}`;
        return this.getAll().filter(t => t.date && t.date.startsWith(prefix));
    }

    static add(tx) {
        const all = this.getAll();
        const item = { id: Date.now().toString(), ...tx, created: Date.now() };
        all.unshift(item);
        this.save(all);
        this._syncSummary();
        return item;
    }

    static remove(id) {
        this.save(this.getAll().filter(t => t.id !== id));
        this._syncSummary();
    }

    static _syncSummary() {
        const now = new Date();
        const txs = this.getMonth(now.getFullYear(), now.getMonth() + 1);
        const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
        const expenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
        Store.set('orbit_finance', { income, expenses });
    }

    static getSummary(year, month) {
        const now = new Date();
        const y = year || now.getFullYear();
        const m = month || (now.getMonth() + 1);
        const txs = this.getMonth(y, m);
        const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
        const expenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
        return { income, expenses, balance: income - expenses, txs };
    }

    static catInfo(id) {
        return FIN_CATS.find(c => c.id === id) || { name: 'Outros', icon: '📌', type: 'expense' };
    }

    static fmt(n) {
        return `R$ ${Math.abs(n).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }

    static byCategory(txs) {
        const map = {};
        txs.forEach(t => {
            const cat = t.cat || 'other';
            map[cat] = (map[cat] || 0) + (t.amount || 0);
        });
        return Object.entries(map)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([id, total]) => ({ id, name: this.catInfo(id).name, total }));
    }
}
