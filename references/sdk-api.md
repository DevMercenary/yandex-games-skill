# SDK Яндекс Игр — полный справочник JavaScript API

Источник: https://yandex.ru/dev/games/doc/ru/sdk/ (актуально на октябрь 2026). Глобальный объект после загрузки `/sdk.js` — `YaGames`; после `YaGames.init()` — экземпляр `ysdk`.

Содержание:
1. Подключение и инициализация
2. Game Ready и разметка геймплея
3. События (пауза/резюм, TV, выбор аккаунта)
4. Окружение, устройство, время, fullscreen, clipboard
5. Игрок: авторизация, облачные сохранения, профиль
6. Реклама: interstitial, rewarded, sticky
7. Инап-покупки
8. Лидерборды
9. Удалённая конфигурация (флаги)
10. Оценка игры и ярлык на рабочий стол
11. Ссылки на другие игры
12. Асинхронный мультиплеер
13. TypeScript
14. Лимиты запросов (сводка)
15. Ошибки и их причины

---

## 1. Подключение и инициализация

### Путь к скрипту (критично для модерации, п. 1.1 и 1.19.1)

| Где размещена игра | Путь |
|---|---|
| Архив загружен в Консоль (рекомендуется) | `/sdk.js` — **относительный** |
| Свой домен (iframe-интеграция) | `https://sdk.games.s3.yandex.net/sdk.js` — абсолютный |

Файл `sdk.js` **не скачивают и не кладут в архив**. Локально его проксирует `@yandex-games/sdk-dev-proxy` (см. `testing-debug.md`). Модерация проверяет «актуальный лоадер»: на debug-панели должно быть `IT`, а не `IF`.

### Тег `<script>`

```html
<!-- Yandex Games SDK -->
<script src="/sdk.js"></script>
```

Неблокирующий вариант с запуском инициализации после загрузки:

```html
<!-- Yandex Games SDK -->
<script async src="/sdk.js" onload="initSDK()"></script>
<script>
    async function initSDK() {
        const ysdk = await YaGames.init();
        // ...
    }
</script>
```

### Динамическая загрузка

```javascript
const script = document.createElement('script');
script.src = '/sdk.js';
script.async = true;
script.onload = initSDK;
document.body.append(script);
```

### `YaGames.init(options?)`

```javascript
const ysdk = await YaGames.init();                 // платежи обрабатываются на клиенте (signed: false)
const ysdk = await YaGames.init({ signed: true }); // платежи обрабатываются на своём сервере
```

`signed: true` → `payments.getPurchases()` и `payments.purchase()` возвращают **только** зашифрованную `signature` (см. §7). Без своего сервера не передавайте `signed`.

Правила порядка:
- `/sdk.js` должен быть загружен **до** вызова `YaGames.init()` (иначе `Uncaught ReferenceError: YaGames is not defined`).
- Любой метод `ysdk.*` — только после резолва `init()` (иначе `ysdk is not defined`).
- `init()` вызывайте один раз и храните `ysdk` глобально/в модуле.

---

## 2. Game Ready и разметка геймплея

### `ysdk.features.LoadingAPI.ready()` — обязателен (п. 1.19.2)

Вызывать в момент, когда игра **полностью загрузила ресурсы и пользователь может взаимодействовать**: нет экранов загрузки, доступно управление/меню/«Нажмите чтобы начать»/всплывающее окно/кат-сцена/настройки. Нельзя привязывать к таймеру — только к реальной готовности. Debug-панель ждёт вызова 90 секунд, потом считает, что Game Ready не используется (индикатор красный). Пока игра грузится, платформа показывает свой загрузочный экран (пульсирующая иконка); загрузочный экран самой игры тоже проверяется модерацией — без чужих логотипов и ссылок.

```javascript
const ysdk = await YaGames.init();
// ... загрузка ассетов ...
ysdk.features.LoadingAPI?.ready();
```

### `ysdk.features.GameplayAPI.start()` / `.stop()` (п. 1.19.3)

Если используете — моменты вызова проверяет модерация (индикатор 🎮 на debug-панели: зелёный = идёт геймплей, красный = пауза).

| `start()` — игрок начинает/возобновляет | `stop()` — игрок останавливает/завершает |
|---|---|
| запуск уровня | прохождение уровня или проигрыш |
| закрытие меню | вызов меню |
| снятие с паузы | пауза в игре |
| возобновление после показа рекламы | показ полноэкранной или rewarded-рекламы |
| возвращение в текущую вкладку браузера | уход в другую вкладку браузера |

После `start()` геймплей должен быть реально запущен сразу; после `stop()` — реально остановлен. Эти же методы управляют стартом/паузой асинхронного мультиплеера.

```javascript
ysdk.features.GameplayAPI?.start();
// ... игровой процесс ...
ysdk.features.GameplayAPI?.stop();
```

---

## 3. События

Подписка/отписка: `ysdk.on(eventName, listener)` → возвращает функцию отписки; `ysdk.off(eventName, listener)`. Отправка: `ysdk.dispatchEvent(eventName, detail?)`.

### `game_api_pause` / `game_api_resume` (п. 1.3, 4.7, 1.19.4)

Платформа шлёт их при: показе/закрытии полноэкранной или rewarded-рекламы, открытии/закрытии окна покупок, переключении вкладок, сворачивании/разворачивании окна. Это **основной** способ выполнить требование «звук останавливается при потере фокуса» и «во время рекламы игра и звук на паузе».

- На `game_api_pause` — выключить звук и поставить геймплей на паузу.
- На `game_api_resume` — возобновить.
- SDK сам согласует их с GameplayAPI: при `game_api_pause` вызывается `GameplayAPI.stop()`, при `game_api_resume` — `GameplayAPI.start()`, **кроме** случая, когда игра уже была остановлена вашим `stop()` (например, открыто меню) — тогда `start()` не вызовется.

```javascript
const pauseCallback = () => {
    pauseGame(); // ваша функция: остановить игровой цикл и музыку
};
const resumeCallback = () => {
    resumeGame();
};
ysdk.on('game_api_pause', pauseCallback);
ysdk.on('game_api_resume', resumeCallback);
// ysdk.off('game_api_pause', pauseCallback);
```

Модерация проверяет остановку звука при: сворачивании окна/приложения, переключении вкладки, в меню выбора вкладок. Допустима задержка до 2 с. Не нарушение: звук при переходе по рекламному баннеру и звук в меню вкладок iOS.

### Стартовая полноэкранная реклама

Платформа **автоматически показывает полноэкранную рекламу на старте всех игр**. У неё нет callback-ов — обрабатывайте через `game_api_pause`/`game_api_resume`. Критично для игр, где звук/геймплей стартуют сразу:

```javascript
let gameStarted = false;
let isPaused = false;

function initGame() {
    ysdk.on('game_api_pause', handlePause);
    ysdk.on('game_api_resume', handleResume);
    if (!isPaused) startGame();
}
function handlePause() { isPaused = true; /* стоп звука и геймплея */ }
function handleResume() {
    isPaused = false;
    if (!gameStarted) startGame(); else { /* возобновить звук и геймплей */ }
}
function startGame() { gameStarted = true; /* инициализация звука, запуск цикла */ }
initGame();
```

### Прочие события (`ysdk.EVENTS`)

```typescript
enum ESdkEventName {
    EXIT = 'EXIT',
    HISTORY_BACK = 'HISTORY_BACK',
    ACCOUNT_SELECTION_DIALOG_OPENED = 'ACCOUNT_SELECTION_DIALOG_OPENED',
    ACCOUNT_SELECTION_DIALOG_CLOSED = 'ACCOUNT_SELECTION_DIALOG_CLOSED'
}
```

- `HISTORY_BACK` — **только на ТВ**: нажата кнопка Back на пульте. Показать свой диалог (выход/настройки/магазин). На ТВ: один Back во время игры — пауза и меню; второй — диалог выхода; в стартовом меню — диалог выхода.
  ```javascript
  ysdk.on(ysdk.EVENTS.HISTORY_BACK, () => { /* кастомный диалог */ });
  ```
- `EXIT` — игра **отправляет**, когда пользователь подтвердил выход в вашем диалоге: `ysdk.dispatchEvent(ysdk.EVENTS.EXIT);`
- `ACCOUNT_SELECTION_DIALOG_OPENED/CLOSED` — платформа хранит прогресс и для неавторизованных, и для авторизованных. Если игрок сначала играл гостем, а потом вошёл, платформа покажет диалог выбора прогресса. При OPENED — приостановите синхронизацию данных; при CLOSED — выйдите в меню/перезапустите и заново запросите `getPlayer()` и `getData()`.

```javascript
ysdk.on(ysdk.EVENTS.ACCOUNT_SELECTION_DIALOG_OPENED, () => { /* стоп синхронизации */ });
ysdk.on(ysdk.EVENTS.ACCOUNT_SELECTION_DIALOG_CLOSED, async () => {
    const player = await ysdk.getPlayer();
    const data = await player.getData();
});
```

---

## 4. Окружение и утилиты

### `ysdk.environment`

```javascript
{
    app: { id: string },             // ID игры
    i18n: { lang: string },          // язык интерфейса Яндекс Игр, ISO 639-1: 'ru', 'en', 'tr' ...
    payload?: string,                // ?payload=... из адреса игры
    referrer?: { type: 'promo', promoId: string, intent?: string, inappId?: string }
}
```

**Автоопределение языка (п. 2.14, обязательно для всех игр, даже с одним языком или без текстов):**

```javascript
const lang = ysdk.environment.i18n.lang; // 'en', 'ru', ...
```

Брать **на старте**, до показа первого экрана (индикатор 文 на debug-панели должен стать зелёным при загрузке, а не после нажатия Play). Допустимо кешировать выбранный вручную язык. Ручной переключатель языка разрешён в дополнение к автоопределению.

Поддерживаемые коды: ar az be bg ca cs de en es fa fr he hi hu hy id it ja ka kk nl pl pt ro ru sk sr th tk tr uk uz vi zh.
Резервный набор, если язык игрока не поддержан игрой: **ru** для `be, kk, uk, uz`; **en** для всех остальных. Минимальный рекомендуемый набор для трафика: ru, tr, en.

```javascript
const SUPPORTED = ['ru', 'en'];
function pickLang(lang) {
    if (SUPPORTED.includes(lang)) return lang;
    return ['be', 'kk', 'uk', 'uz'].includes(lang) && SUPPORTED.includes('ru') ? 'ru' : 'en';
}
```

**`referrer` (переходы из промоакций):** диплинк вида `https://yandex.ru/games/app/{id}?lang=ru&referrer=promo&promo_id={PROMO_ID}&promo_intent={INTENT}&inapp_id={INAPP_ID}`.

```javascript
const { referrer } = ysdk.environment;
if (referrer?.type === 'promo') {
    if (referrer.inappId) showPurchaseScreen(referrer.inappId);
    else if (referrer.intent) openScreen(referrer.intent);
}
```

### `ysdk.deviceInfo`

`type`: `"desktop" | "mobile" | "tablet" | "tv"`. Методы: `isMobile()`, `isDesktop()`, `isTablet()`, `isTV()`. На ТВ пульт шлёт клавиатурные события `ArrowLeft/ArrowUp/ArrowRight/ArrowDown` и `Enter` (OK); пульт генерирует одно событие за раз; в движках с геймпадом пульт регистрируется как геймпад.

### `ysdk.screen.fullscreen`

| Поле | Описание |
|---|---|
| `STATUS_ON` / `STATUS_OFF` | константы `"on"` / `"off"` |
| `status` | текущее состояние |
| `request()` | `Promise<void>` — войти в полноэкранный режим |
| `exit()` | `Promise<void>` — выйти |

Браузеры запрещают переключение без действия пользователя; у платформы уже есть своя кнопка fullscreen — используйте объект для своих кнопок внутри игры.

### `ysdk.clipboard.writeText(text)` — запись строки в буфер обмена.

### `ysdk.serverTime()` → `number` (мс, как `Date.now()`, но с сервера; защита от перевода часов)

Вызывайте каждый раз, когда нужно актуальное время. Пример ежедневной награды (раз в календарные сутки по UTC):

```javascript
const player = await ysdk.getPlayer();
const data = await player.getData();
const currentDate = new Date(ysdk.serverTime()).toISOString().split('T')[0];
if (currentDate !== (data.lastRewardDate || '')) {
    await giveReward();
    await player.setData({ lastRewardDate: currentDate });
}
```

### `ysdk.isAvailableMethod(name)` → `Promise<boolean>`

Проверка доступности методов, требующих авторизации: `'leaderboards.setScore'`, `'leaderboards.getPlayerEntry'`, `'player.getIDsPerGame'`.

### `ysdk.getStorage()` → safeStorage (интерфейс `localStorage`)

На iOS при интеграции **через свой домен** `localStorage` может сбрасываться. Для архива в Консоли ничего делать не нужно — SDK сам оборачивает `localStorage`. Для своего домена:

```javascript
const safeStorage = await ysdk.getStorage();
Object.defineProperty(window, 'localStorage', { get: () => safeStorage }); // до первого использования localStorage
```

---

## 5. Игрок (`Player`)

### Инициализация

```javascript
try {
    const player = await ysdk.getPlayer();
} catch (e) { /* ошибка инициализации Player */ }
```

Лимит: **20 запросов за 5 минут**. Возвращает ID для всех; аватар и имя — только для авторизованных; данные о покупках — для игроков из РФ в играх с покупками. Если игрок запретил доступ к персональным данным — в ответе только ID.

Для авторизации на своём сервере: `ysdk.getPlayer({ signed: true })` → `player.signature` (`<подпись>.<данные профиля>` в base64, проверяется секретным ключом из Консоли, вкладка Инап-покупки → Настройки; ключ появляется после подключения покупок):

```javascript
const player = await ysdk.getPlayer({ signed: true });
await fetch('https://your.game.server/auth', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: player.signature });
```

### Авторизация (п. 1.2: только по осознанному действию, с объяснением выгоды; гостевой режим обязателен)

```javascript
let player = await ysdk.getPlayer();
if (!player.isAuthorized()) {
    try {
        await ysdk.auth.openAuthDialog();
        player = await ysdk.getPlayer(); // перезапросить после входа
    } catch (e) { /* игрок отказался или ошибка */ }
}
```

`player.getMode()` устарел.

### Облачные сохранения

| Метод | Сигнатура | Лимит | Размер |
|---|---|---|---|
| `player.setData(data, flush?)` | `(data: object, flush = false) => Promise<void>` | 100 / 5 мин | 200 КБ на игрока |
| `player.getData(keys?)` | `(keys?: string[]) => Promise<object>` | 100 / 5 мин | — |
| `player.setStats(stats)` | `(stats: object) => Promise<void>` — только числа | 60 / 1 мин | 10 КБ |
| `player.incrementStats(increments)` | `(increments: object) => Promise<object>` | 60 / 1 мин | 10 КБ |
| `player.getStats(keys?)` | `(keys?: string[]) => Promise<object>` | 60 / 1 мин | — |

- `flush: true` — отправить немедленно; `false` (по умолчанию) — поставить в очередь; `getData()` сразу вернёт последние установленные данные, даже если ещё не отправлены.
- `setStats/incrementStats` — для часто меняющихся чисел (очки, валюта); `setData` — для структур.
- Сброс прогресса: записать пустые объекты через `setData({})` и `setStats({})` (или кнопка ☁️ Clear cloud data на debug-панели).
- Если данных больше лимита — свой сервер.
- Если игра использует `setData/setStats` — в черновике включите опцию **Игра использует облачные сохранения** (п. 1.11).

```javascript
const player = await ysdk.getPlayer();
await player.setData({ achievements: ['trophy1'] });
const data = await player.getData(['achievements']);
await player.incrementStats({ gold: 500 });
```

### Профиль

| Метод | Возвращает |
|---|---|
| `player.getUniqueID()` | `string` — постоянный ID (`getID()` устарел; значения могут не совпадать — мигрируйте) |
| `player.getIDsPerGame()` | `Promise<Array<{appID: number, userID: string}>>` — только авторизованные; проверить `isAvailableMethod('player.getIDsPerGame')` |
| `player.getName()` | `string` |
| `player.getPhoto(size)` | `string` URL, `size: 'small' | 'medium' | 'large'` |
| `player.getPayingStatus()` | `'paying' | 'partially_paying' | 'not_paying' | 'unknown'` |

`paying` — купил портальной валюты > 500 ₽ за месяц; `partially_paying` — была хотя бы одна покупка за год; `not_paying` — не было; `unknown` — не из РФ или запретил передачу. Используйте для офферов вместо рекламы и как `clientFeatures` в флагах.

---

## 6. Реклама (`ysdk.adv`)

Правила: реклама только через SDK (п. 4.1); только в логических паузах (п. 4.4); при полноэкранной и rewarded — звук и геймплей на паузе (п. 4.7); нельзя имитировать/кастомизировать блоки (п. 1.16); задержка между действием игрока и началом показа ≤ 2 с; частота interstitial управляется платформой (слишком частые вызовы — предупреждение в консоли, `onClose(false)`); частота rewarded не ограничена. Случайные клики → РСЯ считает фродом и режет доход. **Нельзя** так:

```javascript
setInterval(() => ysdk.adv.showFullscreenAdv(), 180000); // неправильно
```

### `ysdk.adv.showFullscreenAdv({ callbacks })`

```typescript
function showFullscreenAdv(callbacks?: {
    onOpen?: () => void;
    onClose?: (wasShown: boolean) => void;
    onError?: (error: object) => void;
}) => void {}
```

`onClose` вызывается при закрытии, после ошибки и если реклама не открылась из-за частого вызова; `wasShown` говорит, был ли показ. Возобновляйте игру **в `onClose`**, а не после вызова.

```javascript
ysdk.adv.showFullscreenAdv({
    callbacks: {
        onOpen: () => { pauseGame(); },
        onClose: (wasShown) => { resumeGame(); },
        onError: (error) => { resumeGame(); }
    }
});
```

### `ysdk.adv.showRewardedVideo({ callbacks })`

```typescript
function showRewardedVideo(callbacks?: {
    onOpen?: () => void;
    onRewarded?: () => void;
    onClose?: (wasShown: boolean) => void;
    onError?: (error: object) => void;
}) => void {}
```

Награду начисляйте **только в `onRewarded`**. Кнопка должна однозначно говорить, что будет реклама и какая награда (п. 4.5.1); награда — дополнительный бонус, не условие продолжения игры (п. 4.5.2).

```javascript
let rewarded = false;
ysdk.adv.showRewardedVideo({
    callbacks: {
        onOpen: () => pauseGame(),
        onRewarded: () => { rewarded = true; },
        onClose: () => { if (rewarded) giveExtraLife(); resumeGame(); },
        onError: (e) => resumeGame()
    }
});
```

### Стики-баннер

Включается в Консоли (вкладка **Реклама** → Sticky-баннеры: мобильные портрет — внизу/вверху; альбом — внизу/вверху/справа; десктоп — справа). По умолчанию показывается всю сессию. Для управления из кода включите в Консоли **Использовать API для показа sticky-баннера**.

```typescript
ysdk.adv.getBannerAdvStatus(): Promise<{ stickyAdvIsShowing: boolean; reason?: 'ADV_IS_NOT_CONNECTED' | 'UNKNOWN' }>
ysdk.adv.showBannerAdv():      Promise<{ stickyAdvIsShowing: boolean; reason?: ... }>
ysdk.adv.hideBannerAdv():      Promise<{ stickyAdvIsShowing: boolean }>
```

```javascript
const { stickyAdvIsShowing, reason } = await ysdk.adv.getBannerAdvStatus();
if (!stickyAdvIsShowing && !reason) ysdk.adv.showBannerAdv();
```

Стики-баннер — единственный допустимый «дополнительный» блок (п. 4.6); активная область игры должна учитывать его (п. 1.6.2.1).

---

## 7. Инап-покупки (`ysdk.payments`)

### Условия
- Покупки нужно **подключить заранее**: Консоль → Профиль → поле **Единая лицензионная схема**. `Активен` — включены во всех играх; `На проверке/Подготовлен` — включатся автоматически; `Не подключён` — РФ/юрлица: кнопка **Перейти к ЕЛС**; остальные — подключить РСЯ, затем письмо на games-partners@yandex-team.ru с названием и ID игры.
- Товары добавляются в Консоли (вкладка **Инап-покупки**); должно быть ≥ 1 товар и надпись **Покупки подключены**.
- Игра с покупками обязана: консумировать покупки (п. 1.13.1), брать название/иконку валюты из SDK (п. 1.13.2), хранить прогресс в облаке (п. 1.13.3), показывать цену цифрами с портальной валютой (п. 1.13.4), список покупок в игре = списку в Консоли (п. 1.13.6). На ТВ покупок быть не должно.
- **Тестировать покупки только после реализации консумирования**, иначе зависнут необработанные платежи и модерация не пройдёт. Тестовые логины задаются в Консоли (Инап-покупки → список логинов для тестовых покупок) — платежи с них бесплатны.

### Инициализация

```javascript
const payments = ysdk.payments;                       // ленивая инициализация при первом вызове
// или
try { const payments = await ysdk.getPayments(); } catch (err) { /* покупки недоступны */ }
// серверная обработка:
const ysdk = await YaGames.init({ signed: true });   // или ysdk.getPayments({ signed: true })
```

### `payments.purchase({ id, developerPayload? })` → `Promise<IPurchase | ISign>`

```typescript
interface IPurchase { productID: string; purchaseToken: string; developerPayload: string; }
interface ISign { signature: string; }
```

Открывает фрейм платёжного шлюза. Resolve при успехе; reject, если закрыл окно/нет товара/не авторизовался/не хватило денег/истекло время. Покупать можно без авторизации, но лучше предложить войти.

```javascript
try {
    const purchase = await ysdk.payments.purchase({ id: 'gold500', developerPayload: '{serverId:42}' });
} catch (err) { /* покупка не удалась */ }
```

### `payments.getPurchases()` → `Promise<IPurchase[] | ISign>`

Список совершённых и **ещё не консумированных** покупок. Для постоянных покупок (отключение рекламы) — проверять каждый запуск; для расходуемых — найти необработанные и консумировать.

```javascript
let SHOW_ADS = true;
try {
    const purchases = await ysdk.payments.getPurchases();
    if (purchases.some((p) => p.productID === 'disable_ads')) SHOW_ADS = false;
} catch (err) { /* PAYMENT_FAILURE */ }
```

### `payments.getCatalog()` → `Promise<IProduct[]>`

```typescript
interface IProduct {
    id: string; title: string; description: string; imageURI: string;
    price: string;              // "<цена> <код валюты>"
    priceValue: string;         // "<цена>"
    priceCurrencyCode: string;
    getPriceCurrencyImage(size: 'small' | 'medium' | 'svg'): string;
}
```

Название и иконку валюты в UI **всегда** берите из `priceCurrencyCode` / `getPriceCurrencyImage()` (модерация включает Currency mock: должно смениться на `TST` и ¥).

### `payments.consumePurchase(purchaseToken)` → `Promise<void>`

Удаляет покупку безвозвратно. Порядок: **сначала** начислить (`player.setData/setStats/incrementStats`), **потом** консумировать.

```javascript
try {
    const purchase = await ysdk.payments.purchase({ id: 'gold500' });
    await ysdk.player.incrementStats({ gold: 500 });
    await ysdk.payments.consumePurchase(purchase.purchaseToken);
} catch (err) {}
```

### Проверка необработанных покупок (обязательно, п. 1.13.1) — на каждом запуске

```javascript
async function handlePurchase(purchase) {
    if (purchase.productID === 'gold500') {
        await ysdk.player.incrementStats({ gold: 500 });
        await ysdk.payments.consumePurchase(purchase.purchaseToken);
    }
}
const purchases = await ysdk.payments.getPurchases();
for (const purchase of purchases) await handlePurchase(purchase);
```

### Защита от накруток (серверная проверка `signature`)

`signature` = `<подпись>.<JSON base64>`, HMAC-SHA256 секретным ключом игры (Консоль → Инап-покупки → Настройки). В `purchase()` JSON содержит объект покупки в `data`; в `getPurchases()` — массив в `data`. Проверять подпись и защищаться от двойного зачисления по `data.token`.

```javascript
const crypto = require('crypto');
const usedTokens = {};
const key = 't0p$ecret'; // храните в секрете
const [sign, data] = signature.split('.');
const purchaseDataString = Buffer.from(data, 'base64').toString('utf8');
const hmac = crypto.createHmac('sha256', key);
hmac.update(purchaseDataString);
const purchaseData = JSON.parse(purchaseDataString);
if (sign === hmac.digest('base64')) {
    if (!usedTokens[purchaseData.data.token]) {
        usedTokens[purchaseData.data.token] = true; // в проде — БД
        // безопасно начислить purchaseData.data.product
    }
}
```

Python-вариант: `hmac.new(secret, base64.b64decode(data), hashlib.sha256).digest()` → `base64.b64encode(...)` == `sign`.

---

## 8. Лидерборды (`ysdk.leaderboards`)

Лидерборд создаётся в Консоли; поле **Техническое название лидерборда** — это `leaderboardName`. Иначе ошибка 404. `ysdk.getLeaderboards()` устарел — обращайтесь к `ysdk.leaderboards` напрямую.

| Метод | Лимит | Нужна авторизация |
|---|---|---|
| `getDescription(name)` → `Promise<ILeaderboardDescription>` | 20 / 5 мин | нет |
| `setScore(name, score, extraData?)` → `Promise<void>` | 1 / 1 с | **да** |
| `getPlayerEntry(name)` → `Promise<ILeaderboardEntry>` | 60 / 5 мин | **да** |
| `getEntries(name, { includeUser?, quantityAround?, quantityTop? })` → `Promise<ILeaderboardEntries>` | 20 / 5 мин | нет |

```typescript
interface ILeaderboardDescription {
    appID: string; default: boolean; name: string; title: Record<Locale, string>;
    description: { invert_sort_order: boolean; sort_order: 'DESC' | 'ASC';
                   score_format: { type: 'numeric' | 'time'; options: { decimal_offset: number } } };
}
interface ILeaderboardEntry {
    score: number; rank: number; extraData: string;
    player: { publicName: string; uniqueID: string;
              getAvatarSrc(size?: 'small'|'medium'|'large'): string;
              getAvatarSrcSet(size?: 'small'|'medium'|'large'): string };
}
interface ILeaderboardEntries {
    leaderboard: ILeaderboardDescription;
    ranges: { start: number; size: number }[]; // start с нуля
    userRank: number;                          // 0, если нет записи или запрошен топ без пользователя
    entries: ILeaderboardEntry[];
}
```

- `score` ≥ 0; для типа `time` — миллисекунды; `decimal_offset: 2` → 1234 отображается как 12.34.
- `quantityAround` 1–10 (по умолчанию 5), `quantityTop` 1–20 (по умолчанию 5), `includeUser` по умолчанию false.
- Перед `setScore`/`getPlayerEntry` проверяйте `await ysdk.isAvailableMethod('leaderboards.setScore')`. Неавторизованные в лидерборд не попадают — для них делайте локальный/кастомный рейтинг.
- `getPlayerEntry` бросает `err.code === 'LEADERBOARD_PLAYER_NOT_PRESENT'`, если записи нет.
- «Пользователь скрыт» — игрок запретил показывать имя/аватар.

```javascript
if (await ysdk.isAvailableMethod('leaderboards.setScore')) {
    await ysdk.leaderboards.setScore('leaderboard2021', 120);
}
const entries = await ysdk.leaderboards.getEntries('leaderboard2021', { quantityTop: 10, includeUser: true, quantityAround: 3 });
```

---

## 9. Удалённая конфигурация (`ysdk.getFlags`)

```typescript
interface IFlags { [key: string]: string; }                  // значения — всегда строки
interface IClientFeature { name: string; value: string; }
interface IGetFlagsParams { defaultFlags?: IFlags; clientFeatures?: IClientFeature[]; }
function getFlags(params: IGetFlagsParams = {}): Promise<IFlags> {}
```

Запрашивать один раз на старте. **Всегда** передавайте `defaultFlags` (локальный фолбэк при отсутствии сети); удалённая конфигурация приоритетнее. Флаги настраиваются в Консоли (вкладка **Флаги**), условия могут зависеть от `clientFeatures`.

```javascript
const flags = await ysdk.getFlags({
    defaultFlags: { difficult: 'easy' },
    clientFeatures: [{ name: 'payingStatus', value: player.getPayingStatus() }]
});
if (flags.difficult === 'hard') { /* ... */ }
```

---

## 10. Оценка игры и ярлык

### `ysdk.feedback.canReview()` → `Promise<{ value: boolean, reason?: string }>`

`reason`: `NO_AUTH`, `GAME_RATED`, `REVIEW_ALREADY_REQUESTED`, `REVIEW_WAS_REQUESTED`, `UNKNOWN`.

### `ysdk.feedback.requestReview()` → `Promise<{ feedbackSent: boolean }>`

Только один раз за сессию и только после `canReview()` (иначе ошибка `use canReview before requestReview`).

```javascript
const { value, reason } = await ysdk.feedback.canReview();
if (value) { const { feedbackSent } = await ysdk.feedback.requestReview(); }
```

### `ysdk.shortcut.canShowPrompt()` → `Promise<{ canShow: boolean }>`; `ysdk.shortcut.showPrompt()` → `Promise<{ outcome: 'accepted' | ... }>`

Первый вызов создаёт ярлык на каталог Яндекс Игр, следующий — на саму игру. Показывайте кнопку только если `canShow`.

```javascript
const prompt = await ysdk.shortcut.canShowPrompt();
if (prompt.canShow) {
    const result = await ysdk.shortcut.showPrompt();
    if (result.outcome === 'accepted') { /* награда */ }
}
```

---

## 11. Ссылки на другие игры (`GamesAPI`)

Любые ссылки на внешние ресурсы запрещены (п. 8.4.2). Ссылки на свои игры — только через SDK (п. 8.4.1), не прерывая геймплей; на ТВ ссылок быть не должно.

```javascript
const { games, developerURL } = await ysdk.features.GamesAPI.getAllGames();
const { isAvailable, game } = await ysdk.features.GamesAPI.getGameByID(100000); // appID: number
```

```typescript
interface IGame { appID: string; title: string; url: string; coverURL: string; iconURL: string; }
```

Если `isAvailable === false` — `game` равен `undefined`, кнопку не показывать. На debug-панели есть «Game links mock» — в режиме проверки ссылки должны открывать статичную страницу.

---

## 12. Асинхронный мультиплеер (`ysdk.multiplayer.sessions`)

SDK записывает таймлайн событий игрока и воспроизводит чужие сессии как «теней»/соперников. Свой сервер не нужен.

### `init(params)` → `Promise<Session[]>`

| Параметр | Тип | Описание |
|---|---|---|
| `count` | number | сколько сессий загрузить (макс. 10) |
| `isEventBased` | boolean | `true` — SDK сам выдаёт события по таймингу; `false` — вы обрабатываете таймлайны сами |
| `maxOpponentTurnTime` | number | мс; ход соперника длиннее — сжимается до этого значения |
| `meta` | `{ meta1?: {min,max}, meta2?, meta3? }` | фильтр похожих сессий (счёт, уровень...) |

Для загрузки нужен хотя бы один `meta` и `count > 0`, иначе инициализация только на запись. Ответ: `[{ id, meta: {meta1,meta2,meta3}, player: {avatar, name}, timeline: [{ id, payload, time }] }]`.

### `commit(payload)` — зафиксировать событие текущей сессии (id и time считает SDK — вызывайте своевременно). `push({ meta1?, meta2?, meta3? })` — сохранить сессию в конце игры (хотя бы один meta). Макс. размер сессии — 200 КБ.

```javascript
await ysdk.multiplayer.sessions.init({ count: 2, isEventBased: true, maxOpponentTurnTime: 200,
    meta: { meta1: { min: 0, max: 6000 } } });
ysdk.on('multiplayer-sessions-transaction', ({ opponentId, transactions }) => { /* применить transaction.payload */ });
ysdk.on('multiplayer-sessions-finish', (opponentId) => {});
ysdk.features.GameplayAPI.start(); // старт/пауза мультиплеера — через разметку геймплея
ysdk.multiplayer.sessions.commit({ x: 1, y: 2, health: 67 });
ysdk.multiplayer.sessions.push({ meta1: 12 });
```

---

## 13. TypeScript

```console
npm install --save @types/ysdk
```

```typescript
import type { SDK, Player } from 'ysdk';
const ysdk: SDK = await YaGames.init();
const player: Player = await ysdk.getPlayer();
```

---

## 14. Лимиты (сводка)

| Метод | Лимит |
|---|---|
| `ysdk.getPlayer()` | 20 / 5 мин |
| `player.setData()`, `player.getData()` | 100 / 5 мин; 200 КБ |
| `player.setStats()`, `getStats()`, `incrementStats()` | 60 / 1 мин; 10 КБ |
| `leaderboards.setScore()` | 1 / 1 с |
| `leaderboards.getPlayerEntry()` | 60 / 5 мин |
| `leaderboards.getEntries()` и прочие | 20 / 5 мин |
| `feedback.requestReview()` | 1 раз за сессию |
| multiplayer session | 200 КБ |

---

## 15. Ошибки и их причины

| Симптом | Причина / решение |
|---|---|
| `Uncaught ReferenceError: YaGames is not defined` | `/sdk.js` подключён после `YaGames.init()` или не подключён; используйте `onload`/`await` загрузки |
| `Uncaught ReferenceError: ysdk is not defined` | метод вызван до резолва `init()` |
| Debug-панель: лоадер `IF` | старый способ подключения; подключите по документации (`/sdk.js`) |
| Game Ready красный `"ready" called on timeout` | `LoadingAPI.ready()` не вызван за 90 с |
| `SDK is not initialized. Wait for "unit" call` | SDK не инициализирован вообще |
| Лидерборды 404 | нет лидерборда с таким техническим названием в Консоли |
| `LEADERBOARD_PLAYER_NOT_PRESENT` | у игрока нет записи |
| `Object already exists` | лидерборд с таким именем уже был — выберите новое |
| `PAYMENT_FAILURE` | покупки не подключены / нет товаров / ошибка сети |
| `use canReview before requestReview` | не вызван `canReview()` |
| Реклама не показывается локально | ограничение хостинга; проверяйте в prod-окружении через sdk-dev-proxy или в режиме черновика |
| Слишком частые `showFullscreenAdv` | платформа режет частоту, `onClose(false)`; предупреждение в консоли |
