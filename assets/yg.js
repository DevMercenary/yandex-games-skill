/* yg.js — тонкая обёртка над SDK Яндекс Игр, покрывающая обязательные для модерации паттерны.
 * Требует загруженный /sdk.js. Vanilla ES2017, без сборщика. Все методы безопасны без SDK (локальный запуск). */
window.YG = (() => {
    let ysdk = null;
    let player = null;
    let lang = 'en';
    let hooks = { onPause: () => {}, onResume: () => {}, onAccountChanged: null };
    let pausedByPlatform = false;
    let gameplayActive = false;
    const STORAGE_KEY = 'yg_save';

    const FALLBACK_RU = ['be', 'kk', 'uk', 'uz'];
    function pickLang(code, supported) {
        if (supported.includes(code)) return code;
        if (FALLBACK_RU.includes(code) && supported.includes('ru')) return 'ru';
        return supported.includes('en') ? 'en' : supported[0];
    }

    async function init({ supportedLangs = ['en'], onPause, onResume, onAccountChanged, signed = false } = {}) {
        hooks = { onPause: onPause || hooks.onPause, onResume: onResume || hooks.onResume, onAccountChanged: onAccountChanged || null };
        if (typeof YaGames === 'undefined') {
            console.warn('[YG] YaGames is not defined — running without SDK');
            lang = pickLang((navigator.language || 'en').slice(0, 2), supportedLangs);
            return { ysdk: null, lang, player: null };
        }
        ysdk = await YaGames.init(signed ? { signed: true } : undefined);
        lang = pickLang(ysdk.environment.i18n.lang, supportedLangs); // п. 2.14: на старте

        // п. 1.3 / 4.7 / 1.19.4: платформа сама шлёт паузу при рекламе, покупках, потере фокуса
        ysdk.on('game_api_pause', () => { pausedByPlatform = true; hooks.onPause(); });
        ysdk.on('game_api_resume', () => { pausedByPlatform = false; hooks.onResume(); });

        try { player = await ysdk.getPlayer(); } catch (e) { player = null; }

        // Гость поиграл, потом вошёл: платформа покажет диалог выбора прогресса.
        // После закрытия нужно заново получить игрока и данные (перезагрузка — самый простой вариант).
        ysdk.on(ysdk.EVENTS.ACCOUNT_SELECTION_DIALOG_CLOSED, async () => {
            try { player = await ysdk.getPlayer(); } catch (e) { player = null; }
            if (hooks.onAccountChanged) hooks.onAccountChanged();
        });
        return { ysdk, lang, player };
    }

    // ---- Game Ready / разметка геймплея (п. 1.19.2, 1.19.3) ----
    function ready() { ysdk?.features?.LoadingAPI?.ready(); }
    function gameplayStart() { if (!gameplayActive) { gameplayActive = true; ysdk?.features?.GameplayAPI?.start(); } }
    function gameplayStop() { if (gameplayActive) { gameplayActive = false; ysdk?.features?.GameplayAPI?.stop(); } }

    // ---- Реклама (п. 4.x). Вызывать только в логической паузе, после действия игрока ----
    // Реклама закрылась, а платформа ещё держит паузу (вкладку свернули во время ролика) —
    // не возобновляем: это сделает game_api_resume, иначе звук заиграет в фоне (п. 1.3).
    function resumeAfterAd() { if (!pausedByPlatform) hooks.onResume(); }

    function showInterstitial() {
        return new Promise((resolve) => {
            if (!ysdk) return resolve(false);
            gameplayStop();
            ysdk.adv.showFullscreenAdv({
                callbacks: {
                    onOpen: () => hooks.onPause(),
                    onClose: (wasShown) => { resumeAfterAd(); resolve(!!wasShown); },
                    onError: () => { resumeAfterAd(); resolve(false); }
                }
            });
        });
    }

    function showRewarded() {
        return new Promise((resolve) => {
            if (!ysdk) return resolve(false);
            let rewarded = false;
            gameplayStop();
            ysdk.adv.showRewardedVideo({
                callbacks: {
                    onOpen: () => hooks.onPause(),
                    onRewarded: () => { rewarded = true; },           // награда ТОЛЬКО здесь
                    onClose: () => { resumeAfterAd(); resolve(rewarded); },
                    onError: () => { resumeAfterAd(); resolve(false); }
                }
            });
        });
    }

    // ---- Сохранения (п. 1.9): облако + localStorage, сразу после действия игрока ----
    // В сохранение добавляются служебные поля: _t — время (серверное, если есть), _u — чей это localStorage.
    function uid() { try { return player?.getUniqueID?.() ?? null; } catch (e) { return null; } }
    async function save(data) {
        const stamped = { ...data, _t: ysdk?.serverTime?.() ?? Date.now() };
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stamped, _u: uid() })); } catch (e) {}
        if (player) { try { await player.setData(stamped); } catch (e) { console.warn('[YG] setData', e); } }
    }
    async function load() {
        let local = null;
        try { local = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (e) {}
        if (!player) return local;
        try {
            const cloud = await player.getData();
            // setData без flush уходит очередью: при F5 сразу после действия облако может отстать от localStorage.
            // Локальная копия побеждает, только если она новее и записана этим же игроком.
            const localIsNewer = local && local._u === uid() && (local._t || 0) > (cloud?._t || 0);
            if (cloud && Object.keys(cloud).length && !localIsNewer) return cloud;
        } catch (e) { console.warn('[YG] getData', e); }
        return local;
    }

    // ---- Покупки (п. 1.13.1): консумировать необработанные на каждом запуске ----
    async function consumePending(apply /* async (productID) => void */) {
        if (!ysdk) return;
        let purchases;
        try { purchases = await ysdk.payments.getPurchases(); }
        catch (e) { console.warn('[YG] getPurchases', e); return; }  // покупки не подключены или недоступны
        for (const p of purchases) {
            try {
                await apply(p.productID);                          // сначала начислить
                await ysdk.payments.consumePurchase(p.purchaseToken); // потом консумировать
            } catch (e) { console.warn('[YG] покупка не обработана, повтор при следующем запуске:', p.productID, e); }
        }
    }
    async function buy(id, apply) {
        if (!ysdk) return false;
        try {
            const purchase = await ysdk.payments.purchase({ id });
            await apply(purchase.productID);
            await ysdk.payments.consumePurchase(purchase.purchaseToken);
            return true;
        } catch (e) { return false; }
    }

    // ---- Авторизация по кнопке (п. 1.2.1) ----
    async function login() {
        if (!ysdk) return false;
        try { await ysdk.auth.openAuthDialog(); player = await ysdk.getPlayer(); return player.isAuthorized(); }
        catch (e) { return false; }
    }

    return {
        init, ready, gameplayStart, gameplayStop, showInterstitial, showRewarded,
        save, load, consumePending, buy, login,
        get ysdk() { return ysdk; }, get player() { return player; }, get lang() { return lang; },
        get isPausedByPlatform() { return pausedByPlatform; },
        get isTV() { return !!ysdk?.deviceInfo?.isTV(); },
        get isMobile() { return !!ysdk?.deviceInfo?.isMobile(); }
    };
})();
