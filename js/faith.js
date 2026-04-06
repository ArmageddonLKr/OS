/**
 * FAITH.JS - Verse Engine & Spiritual Management
 * Master Class Edition
 */

import { Store, K } from './store.js';

export const VERSES = [
    { r: 'João 3:16', t: 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.' },
    { r: 'Filipenses 4:13', t: 'Tudo posso naquele que me fortalece.' },
    { r: 'Jeremias 29:11', t: 'Porque sou eu que conheço os planos que tenho para vocês, diz o SENHOR, planos de fazê-los prosperar e não de causar dano, planos de dar a vocês esperança e um futuro.' },
    { r: 'Salmos 23:1', t: 'O SENHOR é o meu pastor; nada me faltará.' },
    { r: 'Romanos 8:28', t: 'Sabemos que todas as coisas cooperam para o bem daqueles que amam a Deus, daqueles que são chamados segundo o seu propósito.' },
    { r: 'Isaías 40:31', t: 'Mas aqueles que esperam no SENHOR renovarão as suas forças. Voarão alto como águias; correrão e não ficarão exaustos, andarão e não se cansarão.' },
    { r: 'Mateus 11:28', t: 'Venham a mim, todos os que estão cansados e sobrecarregados, e eu lhes darei descanso.' },
    { r: 'Provérbios 3:5-6', t: 'Confie no SENHOR de todo o seu coração e não se apoie em seu próprio entendimento; reconheça o SENHOR em todos os seus caminhos, e ele endireitará as suas veredas.' },
    { r: 'Salmos 46:1', t: 'Deus é o nosso refúgio e fortaleza, socorro bem-presente nas tribulações.' },
    { r: 'Josué 1:9', t: 'Não fui eu que lhe ordenei? Seja forte e corajoso! Não se apavore nem desanime, pois o SENHOR, o seu Deus, estará com você por onde você andar.' }
    // ... Additional verses would be ported here
];

export const PRAYER_TOPICS = {
    'Adoração': 'Senhor, elevo meu coração a Ti em adoração. Tu és digno de toda honra e glória.',
    'Família': 'Pai, cobre minha família com o Teu sangue precioso. Guarda cada membro, une nossos corações.',
    'Direção': 'Senhor, dirijo meu olhar a Ti. Mostra-me o caminho, ilumina minhas decisões.',
    'Paz': 'Deus da paz, aquieta meu coração. Descansa minha mente em Ti.',
    // ... Additional topics would be ported here
};

export class Faith {
    static getVerseOfDay() {
        const today = new Date().toISOString().slice(0, 10);
        const seed = today.split('-').reduce((a, v) => a + parseInt(v, 10), 0);
        return VERSES[seed % VERSES.length];
    }

    static getJournal() { return Store.get('orbit_fe_journal', []); }
    static saveJournal(a) { Store.set('orbit_fe_journal', a); }

    static addJournal(text) {
        const arr = this.getJournal();
        arr.unshift({
            id: Date.now().toString(),
            text,
            date: new Date().toLocaleDateString('pt-BR')
        });
        if (arr.length > 50) arr.pop();
        this.saveJournal(arr);
    }
}
