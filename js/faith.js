/**
 * FAITH.JS — Versículos, Oração ACTS, Plano de Leitura
 */
import { Store, K } from './store.js';

export const VERSES = [
    { r: 'João 3:16',          t: 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.' },
    { r: 'Filipenses 4:13',    t: 'Tudo posso naquele que me fortalece.' },
    { r: 'Jeremias 29:11',     t: 'Porque sou eu que conheço os planos que tenho para vocês, diz o SENHOR, planos de fazê-los prosperar e não de causar dano, planos de dar a vocês esperança e um futuro.' },
    { r: 'Salmos 23:1',        t: 'O SENHOR é o meu pastor; nada me faltará.' },
    { r: 'Romanos 8:28',       t: 'Sabemos que todas as coisas cooperam para o bem daqueles que amam a Deus, daqueles que são chamados segundo o seu propósito.' },
    { r: 'Isaías 40:31',       t: 'Mas aqueles que esperam no SENHOR renovarão as suas forças. Voarão alto como águias; correrão e não ficarão exaustos, andarão e não se cansarão.' },
    { r: 'Mateus 11:28',       t: 'Venham a mim, todos os que estão cansados e sobrecarregados, e eu lhes darei descanso.' },
    { r: 'Provérbios 3:5-6',   t: 'Confie no SENHOR de todo o seu coração e não se apoie em seu próprio entendimento; reconheça o SENHOR em todos os seus caminhos, e ele endireitará as suas veredas.' },
    { r: 'Salmos 46:1',        t: 'Deus é o nosso refúgio e fortaleza, socorro bem-presente nas tribulações.' },
    { r: 'Josué 1:9',          t: 'Não fui eu que lhe ordenei? Seja forte e corajoso! Não se apavore nem desanime, pois o SENHOR, o seu Deus, estará com você por onde você andar.' },
    { r: 'Isaías 41:10',       t: 'Não tema, porque estou com você; não se desanime, porque sou o seu Deus. Eu o fortalecerei e o ajudarei; eu o sustentarei com minha destra vitoriosa.' },
    { r: 'Salmos 121:1-2',     t: 'Elevo os meus olhos para os montes — de onde virá o meu auxílio? O meu auxílio vem do SENHOR, que fez os céus e a terra.' },
    { r: 'Romanos 8:38-39',    t: 'Pois estou convicto de que nem morte nem vida, nem anjos nem demônios... poderá nos separar do amor de Deus que está em Cristo Jesus, nosso Senhor.' },
    { r: 'Mateus 6:33',        t: 'Mas busquem em primeiro lugar o seu reino e a sua justiça, e todas essas coisas serão acrescentadas a vocês.' },
    { r: 'João 14:27',         t: 'Deixo-lhes a paz; a minha paz dou a vocês. Não a dou como o mundo a dá. Não se perturbem os seus corações, nem se acovardem.' },
    { r: 'Salmos 37:4',        t: 'Deleite-se no SENHOR, e ele lhe concederá os desejos do seu coração.' },
    { r: 'Efésios 2:8',        t: 'Pois vocês são salvos pela graça, por meio da fé, e isso não vem de vocês, é dom de Deus.' },
    { r: 'Salmos 91:1',        t: 'Aquele que habita no esconderijo do Altíssimo e descansa à sombra do Todo-Poderoso.' },
    { r: 'Provérbios 16:9',    t: 'O coração do homem planeja o seu caminho, mas é o SENHOR quem lhe dirige os passos.' },
    { r: 'Gálatas 2:20',       t: 'Fui crucificado com Cristo. Assim, já não sou eu quem vive, mas Cristo vive em mim.' },
    { r: 'Romanos 12:2',       t: 'Não se conformem com este século, mas transformem-se pela renovação da mente, para que experimentem e aprovem a boa, agradável e perfeita vontade de Deus.' },
    { r: 'Hebreus 11:1',       t: 'Ora, a fé é a certeza daquilo que esperamos e a prova das coisas que não vemos.' },
    { r: 'João 10:10',         t: 'O ladrão vem apenas para roubar, matar e destruir; eu vim para que tenham vida e a tenham plenamente.' },
    { r: 'Salmos 27:1',        t: 'O SENHOR é a minha luz e a minha salvação — a quem temerei? O SENHOR é o refúgio da minha vida — de quem me recearei?' },
    { r: 'Isaías 43:2',        t: 'Quando você atravessar as águas, eu estarei com você, e os rios não o submergirão. Quando caminhar pelo fogo, não se queimará.' },
    { r: 'Filipenses 4:6-7',   t: 'Não andem ansiosos por coisa alguma, mas em tudo, pela oração e súplicas, com ação de graças, apresentem seus pedidos a Deus. E a paz de Deus, que excede todo o entendimento, guardará os seus corações.' },
    { r: 'Salmos 34:18',       t: 'O SENHOR está perto dos que têm o coração quebrantado e salva os que estão com o espírito abatido.' },
    { r: 'João 16:33',         t: 'No mundo vocês terão tribulações, mas tenham coragem! Eu venci o mundo.' },
    { r: '1 João 4:4',         t: 'Filhinhos, vocês são de Deus e os venceram, porque aquele que está em vocês é maior do que o que está no mundo.' },
    { r: 'Provérbios 18:10',   t: 'O nome do SENHOR é uma torre forte; o justo corre para ela e fica a salvo.' },
    { r: 'Romanos 5:8',        t: 'Mas Deus prova o seu próprio amor para conosco pelo fato de Cristo ter morrido em nosso favor quando ainda éramos pecadores.' },
    { r: 'Mateus 19:26',       t: 'Para os homens isso é impossível, mas para Deus tudo é possível.' },
    { r: 'Salmos 118:24',      t: 'Este é o dia que o SENHOR fez; regozijemo-nos e alegremo-nos nele.' },
    { r: 'Colossenses 3:23',   t: 'Tudo o que fizerem, façam de todo o coração, como para o Senhor, e não para os homens.' },
    { r: 'Isaías 26:3',        t: 'Aquele cujo modo de pensar está firme em ti, tu manterás em perfeita paz, porque confia em ti.' },
    { r: 'Hebreus 12:1',       t: 'Portanto, também nós, visto que estamos rodeados de tão grande nuvem de testemunhas, despojemo-nos de todo embaraço e do pecado que tão facilmente nos enreda.' },
    { r: '2 Coríntios 5:17',   t: 'Assim, se alguém está em Cristo, é nova criação. As coisas antigas já passaram; eis que surgiram coisas novas!' },
    { r: 'Marcos 11:24',       t: 'Por isso lhes digo: tudo o que vocês pedirem em oração, creiam que já o receberam, e assim lhes acontecerá.' },
    { r: 'Salmos 119:105',     t: 'A tua palavra é lâmpada que ilumina os meus pés e luz que clareia o meu caminho.' },
    { r: 'Lamentações 3:22-23',t: 'As misericórdias do SENHOR não têm fim, nem se esgotam as suas compaixões. Renovam-se cada manhã. Grande é a tua fidelidade!' },
    { r: 'Ezequiel 36:26',     t: 'Darei a vocês um coração novo e porei em vocês um espírito novo; tirarei de vocês o coração de pedra e lhes darei um coração de carne.' },
    { r: 'Miquéias 6:8',       t: 'O que o SENHOR exige de você: que pratique a justiça, ame a fidelidade e ande humildemente com o seu Deus.' },
    { r: 'Salmos 16:11',       t: 'Tu me mostrarás o caminho da vida; na tua presença há plenitude de alegria; na tua destra, delícias para sempre.' },
    { r: '1 Coríntios 13:4-5', t: 'O amor é paciente, o amor é bondoso. Não inveja, não se vangloria, não se orgulha. Não se comporta de modo inconveniente, não procura os seus próprios interesses.' },
    { r: 'Neemias 8:10',       t: 'A alegria do SENHOR é a nossa força.' },
    { r: 'Habacuque 3:19',     t: 'O SENHOR Deus é a minha força; ele faz os meus pés como os pés das corças e me faz andar pelos lugares altos.' },
    { r: 'Tiago 1:2-3',        t: 'Considerem motivo de grande alegria, meus irmãos, quando vocês enfrentarem provações de muitas espécies, porque o teste da sua fé produz perseverança.' },
    { r: 'Efésios 3:20',       t: 'Ora, àquele que é poderoso para fazer infinitamente mais do que tudo o que pedimos ou pensamos, conforme o seu poder que opera em nós.' },
    { r: '2 Timóteo 1:7',      t: 'Pois Deus não nos deu espírito de covardia, mas de poder, de amor e de equilíbrio.' },
    { r: 'Mateus 5:16',        t: 'Da mesma forma, brilhe a luz de vocês diante dos homens, para que eles vejam as suas boas obras e glorifiquem o Pai de vocês que está nos céus.' },
    { r: 'João 15:5',          t: 'Eu sou a videira; vocês são os ramos. Quem permanece em mim e eu nele, esse dá muito fruto; pois sem mim vocês não podem fazer coisa alguma.' },
];

export const ACTS_PRAYERS = {
    A: { label: 'Adoração', prompt: 'Senhor, elevo meu coração a Ti em adoração. Tu és digno de toda honra e glória.' },
    C: { label: 'Confissão', prompt: 'Pai, confesso meus erros e pecados. Purifica-me e renova-me.' },
    T: { label: 'Thanksgiving', prompt: 'Obrigado, Senhor, por tudo que tens feito. Reconheço Tua bondade.' },
    S: { label: 'Súplica', prompt: 'Pai, trago ao Senhor minhas necessidades e as dos que amo. Ouça minha oração.' },
};

const READING_PLAN = [
    { ref: 'Gênesis 1-2',        topic: 'A Criação'          },
    { ref: 'Salmos 1',           topic: 'O Homem Bem-aventurado' },
    { ref: 'Salmos 23',          topic: 'O Bom Pastor'        },
    { ref: 'Provérbios 1-3',     topic: 'Sabedoria'           },
    { ref: 'Mateus 5-7',         topic: 'Sermão do Monte'     },
    { ref: 'João 1',             topic: 'O Verbo Eterno'      },
    { ref: 'João 3',             topic: 'Novo Nascimento'     },
    { ref: 'João 14-16',         topic: 'O Espírito Consolador' },
    { ref: 'Romanos 8',          topic: 'Vida no Espírito'    },
    { ref: 'Efésios 1-3',        topic: 'Bênçãos em Cristo'   },
    { ref: 'Filipenses 4',       topic: 'Paz que excede'      },
    { ref: 'Hebreus 11',         topic: 'Galeria da Fé'       },
    { ref: '1 João 4',           topic: 'Deus é Amor'         },
    { ref: 'Apocalipse 21-22',   topic: 'Nova Criação'        },
];

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
        arr.unshift({ id: Date.now().toString(), text, date: new Date().toLocaleDateString('pt-BR') });
        if (arr.length > 60) arr.pop();
        this.saveJournal(arr);
    }

    static getPrayers() { return Store.get('orbit_fe_prayers', []); }
    static savePrayers(a) { Store.set('orbit_fe_prayers', a); }

    static addPrayer(type, text) {
        const arr = this.getPrayers();
        arr.unshift({ id: Date.now().toString(), type, text, date: new Date().toLocaleDateString('pt-BR'), answered: false });
        this.savePrayers(arr);
    }

    static togglePrayerAnswered(id) {
        const arr = this.getPrayers();
        const p = arr.find(x => x.id === id);
        if (p) { p.answered = !p.answered; this.savePrayers(arr); }
    }

    static removePrayer(id) { this.savePrayers(this.getPrayers().filter(p => p.id !== id)); }

    static getReadingPlan() { return READING_PLAN; }

    static getReadingProgress() { return Store.get('orbit_fe_reading', []); }

    static markRead(idx) {
        const arr = this.getReadingProgress();
        const today = new Date().toISOString().slice(0, 10);
        if (!arr.includes(idx)) { arr.push(idx); Store.set('orbit_fe_reading', arr); }
        // streak
        let streak = parseInt(localStorage.getItem('orbit_fe_streak') || '0');
        const lastDay = localStorage.getItem('orbit_fe_streak_day');
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        if (lastDay === yesterday.toISOString().slice(0, 10)) streak++;
        else if (lastDay !== today) streak = 1;
        localStorage.setItem('orbit_fe_streak', streak.toString());
        localStorage.setItem('orbit_fe_streak_day', today);
    }

    static getStreak() { return parseInt(localStorage.getItem('orbit_fe_streak') || '0'); }
}
