#!/usr/bin/env node
/* Самопроверка assets/yg.js и assets/audio.js на фейковом SDK:  node scripts/test_assets.js */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ASSETS = path.join(__dirname, '..', 'assets');

function makeStorage() {
    const m = new Map();
    return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); } };
}

function makeSdk({ cloud = {}, purchases = [], uid = 'u1' } = {}) {
    const handlers = {};
    const sdk = {
        now: 1000, cloud, consumed: [], ad: null,
        environment: { i18n: { lang: 'ru' } },
        EVENTS: { ACCOUNT_SELECTION_DIALOG_CLOSED: 'ACCOUNT_SELECTION_DIALOG_CLOSED' },
        on: (e, f) => { handlers[e] = f; },
        emit: (e) => handlers[e] && handlers[e](),
        serverTime: () => sdk.now,
        getPlayer: async () => ({
            getUniqueID: () => uid,
            getData: async () => sdk.cloud,
            setData: async (d) => { sdk.cloud = d; }
        }),
        adv: {
            showFullscreenAdv: ({ callbacks }) => { sdk.ad = callbacks; },
            showRewardedVideo: ({ callbacks }) => { sdk.ad = callbacks; }
        },
        payments: {
            getPurchases: async () => purchases,
            consumePurchase: async (token) => { sdk.consumed.push(token); }
        }
    };
    return sdk;
}

// «Страница»: свежий экземпляр скрипта. Тот же storage + новый вызов = перезагрузка (F5).
function loadPage(file, globals) {
    const sandbox = { console: { warn() {}, log() {} }, navigator: { language: 'en' }, ...globals };
    sandbox.window = sandbox;
    vm.runInNewContext(fs.readFileSync(path.join(ASSETS, file), 'utf8'), sandbox);
    return sandbox;
}
const loadYG = (sdk, localStorage) => loadPage('yg.js', { YaGames: { init: async () => sdk }, localStorage }).YG;

const tests = {
    async 'load: свежий localStorage побеждает устаревшее облако того же игрока (F5 до отправки очереди setData)'() {
        const storage = makeStorage();
        const sdk = makeSdk();
        let YG = loadYG(sdk, storage);
        await YG.init();
        await YG.save({ score: 1 });
        const sentToCloud = sdk.cloud;
        sdk.now = 2000;
        await YG.save({ score: 2 });
        sdk.cloud = sentToCloud;              // очередь не ушла: в облаке осталось прошлое сохранение

        YG = loadYG(sdk, storage);            // F5
        await YG.init();
        assert.strictEqual((await YG.load()).score, 2);
    },

    async 'load: облако побеждает localStorage другого игрока'() {
        const storage = makeStorage();
        let YG = loadYG(makeSdk({ uid: 'u1' }), storage);
        await YG.init();
        await YG.save({ score: 99 });

        YG = loadYG(makeSdk({ uid: 'u2', cloud: { score: 5 } }), storage);
        await YG.init();
        assert.strictEqual((await YG.load()).score, 5);
    },

    async 'load: без облака отдаёт localStorage'() {
        const storage = makeStorage();
        const sdk = makeSdk();
        let YG = loadYG(sdk, storage);
        await YG.init();
        await YG.save({ score: 3 });
        sdk.cloud = {};

        YG = loadYG(sdk, storage);
        await YG.init();
        assert.strictEqual((await YG.load()).score, 3);
    },

    async 'реклама: onClose не возобновляет игру, пока платформа держит паузу'() {
        for (const show of ['showInterstitial', 'showRewarded']) {
            const sdk = makeSdk();
            const YG = loadYG(sdk, makeStorage());
            let resumed = 0;
            await YG.init({ onResume: () => { resumed++; } });
            const shown = YG[show]();
            sdk.ad.onOpen();
            sdk.emit('game_api_pause');       // вкладку свернули во время ролика
            sdk.ad.onClose(true);
            await shown;
            assert.strictEqual(resumed, 0, `${show}: возобновили под паузой платформы`);
            sdk.emit('game_api_resume');
            assert.strictEqual(resumed, 1, `${show}: не возобновили после game_api_resume`);
        }
    },

    async 'реклама: без паузы платформы onClose возобновляет игру'() {
        const sdk = makeSdk();
        const YG = loadYG(sdk, makeStorage());
        let resumed = 0;
        await YG.init({ onResume: () => { resumed++; } });
        const shown = YG.showInterstitial();
        sdk.ad.onOpen();
        sdk.ad.onClose(true);
        await shown;
        assert.strictEqual(resumed, 1);
    },

    async 'покупки: сбой начисления одной не блокирует остальные и не консумирует её'() {
        const sdk = makeSdk({ purchases: [
            { productID: 'broken', purchaseToken: 't1' },
            { productID: 'coins', purchaseToken: 't2' }
        ] });
        const YG = loadYG(sdk, makeStorage());
        await YG.init();
        const applied = [];
        await YG.consumePending(async (id) => {
            if (id === 'broken') throw new Error('apply failed');
            applied.push(id);
        });
        assert.deepStrictEqual(applied, ['coins']);
        assert.deepStrictEqual(sdk.consumed, ['t2']);
    },

    async 'звук: resume() поднимает контекст из interrupted (iOS Safari после звонка)'() {
        let ctx;
        class AudioContext {
            constructor() { ctx = this; this.state = 'suspended'; this.destination = {}; }
            createGain() { return { gain: {}, connect() {} }; }
            resume() { this.state = 'running'; }
            suspend() { this.state = 'suspended'; }
        }
        const { GameAudio } = loadPage('audio.js', { AudioContext });
        GameAudio.unlock();
        ctx.state = 'interrupted';
        GameAudio.resume();
        assert.strictEqual(ctx.state, 'running');
    }
};

(async () => {
    let failed = 0;
    for (const [name, fn] of Object.entries(tests)) {
        try { await fn(); console.log('ok   ', name); }
        catch (e) { failed++; console.log('FAIL ', name, '\n      ', e.message); }
    }
    console.log(failed ? `\n${failed} провалено` : '\nвсе проверки прошли');
    process.exit(failed ? 1 : 0);
})();
