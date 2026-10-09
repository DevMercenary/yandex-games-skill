# Yandex Games SDK для Unity — Plugin Your Games 2.0 (PluginYG2)

Официальный раздел «Unity» в документации Яндекс Игр — это видеокурс, который ссылается на документацию **стороннего** плагина Plugin Your Games 2.0 (max-games). Этот файл собирает реальный C#-API плагина, шаги установки, настройки WebGL-билда и подводные камни.

Источники (все проверены):
- Документация плагина: https://max-games.ru/plugin-yg/doc/ (+ страницы модулей, `/pause-game/`, `/faq/`).
- Исходники: https://github.com/JustPlay-Max/unity-PluginYG-2 (ветка `main`, `Assets/PluginYourGames/Version.txt` = **v2.0092**, лицензия CC0-1.0). Сигнатуры ниже сверены с исходниками этой версии.
- Asset Store: https://assetstore.unity.com/packages/tools/integration/plugin-your-games-2-0-302343
- Обновления: https://t.me/pluginYG2 , вопросы: https://t.me/pluginYG

Не путать с PluginYG 1.x (`YandexGame.*`) — у 2.0 другой API (`YG2.*`).

## Содержание
1. Требования и установка
2. Настройки проекта/WebGL, которые ставит плагин
3. Модульная система и зависимости
4. Базовый API `YG2`: инициализация, `onGetSDKData`, Game Ready, Gameplay
5. Пауза и фокус игры
6. Реклама: interstitial, rewarded, sticky
7. Данные окружения (`YG2.envir`)
8. Авторизация (`YG2.player`)
9. Локализация
10. Сохранения: Storage, RedefinePlayerPrefs, PlayerStats
11. Лидерборды
12. Инап-покупки и консумирование
13. Флаги (Remote Config)
14. Серверное время, оценка игры, ярлык
15. Метрика
16. Ссылки на другие игры (OpenURL)
17. Прочие модули (TV, Fullscreen, Clipboard, Bonuses, QuitGameEvent, EventsYG2)
18. Симуляция в редакторе
19. Сборка, ZIP для Консоли, локальный запуск
20. Подводные камни (FAQ)
21. Требования Яндекс Игр, на которые ссылаются уроки
22. Видеоуроки Яндекса
23. Поддержка

---

## 1. Требования и установка

- Unity: **2021.3.18+, 2022.3+, 2023.2+, Unity 6 (6000+)**. На более старых версиях будет ошибка про `FindAnyObjectByType()`.
- Перед импортом в проекте **не должно быть ошибок компиляции**. Файлы плагина **не перемещать** (папка `Assets/PluginYourGames`).
- Установка:
  1. Импортировать PluginYG2 из Asset Store (или релиз с GitHub). Появится приветственное окно (дублирует меню `Tools → YG2`).
  2. При импорте плагин предлагает применить оптимальные настройки под Яндекс Игры — согласиться. Если отказались: `Tools → YG Settings → Basic Settings → Platform` → флаг **Auto Apply Settings**, выбрать Platform = `None`, дождаться компиляции, затем выбрать `YandexGames`.
  3. Открыть настройки плагина (`Tools → YG Settings`), пройти раздел **Basic Settings** (у полей есть tooltips).
  4. Через **инструмент контроля версий** плагина (окно Version Control) скачать нужные модули (см. раздел 3). Зависимости подтягиваются автоматически.
  5. WebGL-шаблон: `Player Settings → Resolution and Presentation → WebGL Template` = **YandexGames** (`Assets/WebGLTemplates/YandexGames/index.html`). При включённом Auto Apply Settings выбирается сам.
- Namespace плагина — `YG`; почти весь API — статический класс `YG2`:

```csharp
using YG;
YG2.InterstitialAdvShow();
```

- **Own Host** (настройки платформы): если игра хостится на своём сервере, включить — добавит строку подключения SDK в `index.html`. Свой хост может не поддерживать Brotli — отключите компрессию в настройках платформы.
- **EmptyWebGL** — отдельный модуль-платформа без зависимостей от SDK (для тестов на своём хосте/GitHub, мультиплеера). Опция **Give Reward** (вкл. по умолчанию) симулирует выдачу награды за rewarded; компрессию можно выключить.

## 2. Настройки проекта/WebGL, которые ставит плагин

Значения по умолчанию из `Scripts/Platform/ProjectSettings.cs` (применяются при Auto Apply Settings; каждое можно отключить тумблером в свойствах платформы):

| Настройка | Значение | Где в Unity |
|---|---|---|
| WebGL Template | `YandexGames` | Player → Resolution and Presentation |
| Run In Background | **false** | Player → Resolution and Presentation |
| Enable Exceptions | `FullWithoutStacktrace` | Player → Publishing Settings |
| Compression Format | **Brotli** | Player → Publishing Settings |
| Decompression Fallback | **false** (для Яндекс Игр не нужен) | Player → Publishing Settings |
| Auto Graphics API | true | Player → Other Settings |
| Managed Stripping Level | `Minimal` | Player → Other Settings |
| Data Caching | true | Player → Publishing Settings |
| Color Space | **Gamma** (Linear даёт чёрный экран) | Player → Other Settings |
| Archiving Build | true (автоматический ZIP) | настройки плагина, Basic Settings |
| Auto Pause Game | true | Basic Settings |
| Sync Init SDK | false | Basic Settings |

Настройки памяти (Initial Memory Size и т. п.) документация не задаёт.

Прочие опции Basic Settings (`InfoYG.Basic`): `Auto GRA` (true), `Auto Pause Game` + `Edit Time Scale` + `Edit Event System`, `Log In Editor`, `Auto Define Symbols`, `Sync Init SDK` (+ `Load Scene If SDK Late`, `Load Scene Index`, `Init Delay Simulation`, см. раздел 4).
Templates (`InfoYG.Templates`): `Logo Image Format`, `Background Img Format` (Gradient / Player Settings / No / PNG / JPG / GIF; файлы `logo.*`, `background.*` в `Assets/WebGLTemplates/YandexGames/Images/`), `Custom Progress Bar`, `Fixed Aspect Ratio` (`Aspect Ratio` "16/9"/"9/16", `Disable For Mobile`, `Fill Background`), `Pixel Ratio Enable` (1.3), **`Developer Build`** — плашка с номером билда (выключить перед релизом).
Build Settings → Code Optimization: `Shorter Build Time` для тестов, `Runtime Speed with LTO` для релиза.

## 3. Модульная система и зависимости

- Модули лежат в `Assets/PluginYourGames/Modules/<Имя>`; любая папка там — модуль. Код неимпортированных модулей в билд не попадает.
- Для каждого модуля создаётся define `<Имя>_yg` (например `InterstitialAdv_yg`, `Storage_yg`, `Authorization_yg`), для платформ — `<Имя>Platform_yg` (`YandexGamesPlatform_yg`). Если дефайны сломались — удалить `PluginYourGames/Editor/ModulesListYG2.txt` (или всю папку `PluginYourGames/Editor` для сброса кеша).
- Настройки модуля появляются в окне настроек плагина.

| Модуль | Что даёт | Зависимости | Документация |
|---|---|---|---|
| InterstitialAdv | полноэкранная реклама | — | https://max-games.ru/plugin-yg/doc/inter-ad/ |
| RewardedAdv | реклама за награду | — | https://max-games.ru/plugin-yg/doc/reward-ad/ |
| StickyAdv | вкл/выкл стики-баннера | — | https://max-games.ru/plugin-yg/doc/sticky-adv/ |
| EnvirData | устройство, язык, payload | — | https://max-games.ru/plugin-yg/doc/envir/ |
| Authorization | `YG2.player` | — | https://max-games.ru/plugin-yg/doc/auth/ |
| Localization | `YG2.lang`, смена языка | — | https://max-games.ru/plugin-yg/doc/lang/ |
| AutoTranslateLangs | автоперевод (Google Translate) | Authorization, Localization, Newtonsoft Json | https://max-games.ru/plugin-yg/doc/lang/#Auto_Translate_Langs |
| Storage | облачные сохранения `YG2.saves` | Authorization (для Save Cloud) | https://max-games.ru/plugin-yg/doc/storage/ |
| RedefinePlayerPrefs | PlayerPrefs → облако | Authorization (+Storage) | там же |
| PlayerStats | быстрые int-сейвы | Authorization | https://max-games.ru/plugin-yg/doc/storage/#Player_Stats |
| Leaderboards | лидерборды | Authorization | https://max-games.ru/plugin-yg/doc/lb/ |
| Payments | покупки | Authorization, Storage или PlayerStats | https://max-games.ru/plugin-yg/doc/pay/ |
| Metrica | Яндекс Метрика | — | https://max-games.ru/plugin-yg/doc/metrica/ |
| ServerTime | серверное время | — | https://max-games.ru/plugin-yg/doc/server-time/ |
| Review | оценка игры | — | https://max-games.ru/plugin-yg/doc/review/ |
| GameLabel | ярлык на рабочий стол | — | https://max-games.ru/plugin-yg/doc/game-label/ |
| Flags | Remote Config | — | https://max-games.ru/plugin-yg/doc/flags/ |
| OpenURL | ссылки на игры/разработчика | — | https://max-games.ru/plugin-yg/doc/open-url/ |
| TV, Fullscreen, Clipboard, Bonuses, BannerAdv, QuitGameEvent, EmptyWebGL | см. раздел 17 | Bonuses → Authorization | только исходники/README модуля |

## 4. Базовый API `YG2`: инициализация, `onGetSDKData`, Game Ready, Gameplay

Поля и события (`Scripts/Basic/YG2.cs`):

| Член | Тип | Смысл |
|---|---|---|
| `YG2.platform` | `string` | имя платформы: `YandexGames`, `CrazyGames`, … |
| `YG2.isSDKEnabled` | `bool` | SDK инициализирован, данные получены |
| `YG2.onGetSDKData` | `Action` | SDK инициализирован. **Вызывается повторно** после авторизации, `LoadProgress`, `LoadStats`, `SetDefaultSaves`, `GetEnvirData` |
| `YG2.isFirstGameSession` | `bool` | первая сессия на этом устройстве (хранится в localStorage, не в облаке) |
| `YG2.buildNumber` | `int` | номер сборки |
| `YG2.nowAdsShow`, `nowInterAdv`, `nowRewardAdv` | `bool` | открыта ли реклама |
| `YG2.onAdvNotification`, `onOpenAnyAdv`, `onCloseAnyAdv`, `onErrorAnyAdv` | `Action` | общие события рекламы |
| `YG2.Message(string)` | метод | лог в консоль браузера (в редакторе — при `Log In Editor`) |

Порядок инициализации: `[RuntimeInitializeOnLoadMethod(BeforeSceneLoad)]` создаёт объект `YG2Instance` (DontDestroyOnLoad), затем модули инициализируются по атрибутам `[InitYG_0]` (EnvirData) → `[InitYG_1]` (Localization, TV) → `[InitYG_2]` (Authorization) → `[InitYG]` (остальные) → `[StartYG]` (GameReady, `onSwitchLang`, `onDefaultSaves`), после чего `isSDKEnabled = true` и `onGetSDKData`.

По умолчанию (`Sync Init SDK` выкл.) шаблон `index.html` сначала ждёт `YaGames.init()`, и только потом вызывает `createUnityInstance` — поэтому данные платформы готовы к первому `Awake`. При включённом **Sync Init SDK** Unity грузится параллельно с SDK; тогда ждите `onGetSDKData` (опции `Load Scene If SDK Late` / `Load Scene Index` перезагрузят указанную сцену, когда SDK догонит).

Безопасный паттерн подписки (так сделано в самом плагине):

```csharp
using YG;

public class Boot : MonoBehaviour
{
    private void Start()
    {
        if (YG2.isSDKEnabled) OnSDK();
        else YG2.onGetSDKData += OnSDK;
    }

    private void OnDestroy() => YG2.onGetSDKData -= OnSDK;

    private void OnSDK()
    {
        // YG2.player, YG2.saves, YG2.envir, YG2.lang уже заполнены
    }
}
```

Game Ready / Gameplay (`GameReadyAPI.cs`, `GameplayAPI.cs`):
- `YG2.GameReadyAPI()` — сообщить платформе, что игра загружена. При `Auto GRA` (по умолчанию вкл.) вызывается автоматически после инициализации. Если после загрузки есть свои долгие этапы — выключить Auto GRA и вызвать вручную. Повторные вызовы игнорируются.
- `YG2.GameplayStart()` / `YG2.GameplayStop()` — разметка геймплея. При рекламе/паузе плагин сам вызывает Stop, а после — Start, **но только если Start вызывался раньше** (состояние восстанавливается). `YG2.isGameplaying` — текущее состояние. Необязательны, но рекомендуются.
- `YG2.optionalPlatform.HappyTime()` — «счастливое время».

## 5. Пауза и фокус игры

Документация: https://max-games.ru/plugin-yg/doc/pause-game/ (страница объявлена обязательной к прочтению).

- Шаблон `index.html` подписан на `ysdk.on('game_api_pause')` / `'game_api_resume'` и на `visibilitychange`/`blur`/`focus`; в Unity приходят `SetPauseGame` и `SetFocusWindowGame`. Ничего прописывать в `index.html` не нужно.
- **Auto Pause Game** (Basic Settings, вкл.): при рекламе, окне авторизации/покупки, потере фокуса плагин ставит `Time.timeScale = 0`, `AudioListener.pause = true`, показывает курсор (`Cursor.visible = true`, `lockState = None`) и отключает `EventSystem`. Если во время паузы ваш код меняет эти параметры, плагин их перебьёт, а после паузы восстановит значения, которые выставил ваш код.
- Рекомендуемый способ менять эти параметры в своём коде — `PauseGameYG.SetState` (синхронизируется с паузой плагина):

```csharp
if (openMenu)
{
	// Открыто меню. Время остановлено, аудио пауза включена, курсор видно.
	PauseGameYG.SetState(0, true, true);
}
else
{
	// Меню закрыто. Время активно, аудио пауза выключена, курсор скрыт.
	PauseGameYG.SetState(1, false, false);
}
```

Сигнатуры: `PauseGameYG.SetState(float timeScale, bool audioPause, bool cursorEnable)` и `PauseGameYG.SetState(float timeScale, bool audioPause, bool cursorVisible, CursorLockMode cursorLockState)`. Все параметры обязательны.

API паузы и фокуса:
- `YG2.onPauseGame` — `Action<bool>` (`true` — остановить, `false` — продолжить). `YG2.isPauseGame` — `bool`.
- `YG2.PauseGame(bool pause)`; `YG2.PauseGame(bool pause, bool editTimeScale, bool editAudioPause, bool editCursor, bool editEventSystem)`; `YG2.PauseGameNoEditEventSystem(bool pause)` (для UnityEvent).
- Фокус (не работает на Crazy Games): `YG2.onShowWindowGame`, `YG2.onHideWindowGame` (`Action`), `YG2.onFocusWindowGame` (`Action<bool>`), `YG2.isFocusWindowGame` (`bool`).
- Яндекс сам может показать рекламу при запуске игры. Плагин видит только паузу: первая пауза в первые 5 секунд (`Time.unscaledTime < 5`) трактуется как interstitial (`YGInsides.OpenInterAdv`/`CloseInterAdv`). В остальных случаях автореклама платформы **не** порождает `onOpenInterAdv`/`onCloseAnyAdv`/`nowInterAdv` — используйте `onPauseGame`/`isPauseGame`.
- Проверка в редакторе: General Simulation → **Pause On Focus Game**.

## 6. Реклама: interstitial, rewarded, sticky

Правила Яндекса: реклама обязательна (п. 1.12), сторонняя запрещена (п. 1.16), показ — раздел 4 Требований (ссылки в разделе 21). Общая статья: https://yandex.ru/dev/games/console/adv-monetization.md

### 6.1 Interstitial (модуль InterstitialAdv)

```csharp
using YG; // Подключите пространство имён плагина

public class MyClass
{
    public void MyMethod()
    {
        YG2.InterstitialAdvShow();
    }
}
```

Поведение `InterstitialAdvShow()` (из исходников): показ происходит только если `!nowAdsShow && isTimerAdvCompleted`; иначе пишет в лог «Реклама будет доступна через: N» и **молча ничего не делает**. На платформе YandexGames таймер стартует при инициализации, т. е. первая реклама возможна не раньше `Inter Adv Interval` секунд после запуска. Перед показом вызывается `onAdvNotification`, затем `PauseGame(true)`.

| Член | Тип | Смысл |
|---|---|---|
| `YG2.onOpenInterAdv`, `onCloseInterAdv`, `onErrorInterAdv` | `Action` | открытие / закрытие / ошибка |
| `YG2.onCloseInterAdvWasShow` | `Action<bool>` | закрытие; была ли реклама реально показана |
| `YG2.onOpenAnyAdv`, `onCloseAnyAdv` | `Action` | любая реклама (inter или rewarded) |
| `YG2.onPauseGame` / `isPauseGame` | `Action<bool>` / `bool` | пауза |
| `YG2.nowInterAdv`, `nowAdsShow` | `bool` | открыта ли сейчас |
| `YG2.interAdvInterval` | `int` | интервал между показами (сек) из настроек |
| `YG2.timerInterAdv` | `float` | сколько осталось до конца интервала |
| `YG2.isTimerAdvCompleted` | `bool` | можно ли показывать |
| `YG2.SkipNextInterAdCall()` | метод | пропустить следующий вызов |
| `YG2.optionalPlatform.FirstInterAdvShow()` | метод | на Яндексе показывает всегда; на Crazy Games пропускает первый показ первой сессии |
| `YG2.optionalPlatform.OtherInterAdvShow()` | метод | на Яндексе показывает всегда; на Crazy Games не показывает |

Настройки модуля (`InfoYG.InterstitialAdv`): `Show First Adv`, `Inter Adv Interval` (60), `Postpone Call By Fail`, `Postpone Call Timer` (10). Если реклама не показана (`wasShown == false`) и `Postpone Call By Fail` включён, следующий запрос откладывается на `Postpone Call Timer`. При зацикливании таймера FAQ советует: Inter Adv Interval = 65, Postpone Call By Fail = true, Postpone Call Timer = 70.

### 6.2 Rewarded (модуль RewardedAdv)

Сигнатуры: `YG2.RewardedAdvShow(string id)` и `YG2.RewardedAdvShow(string id, Action callback)`. Событие `YG2.onRewardAdv` — `Action<string>` (передаёт id). Показ не происходит, если уже открыта любая реклама. Пустой id заменяется на `"null"` (в событие придёт `""`); id нужен для внутренней работы даже при использовании callback.

```csharp
using UnityEngine;
using YG;

public class MyClass : MonoBehaviour
{
    public string rewardID;
    public int coins;

	// Вызов рекламы за вознаграждение
    public void MyRewardAdvShow()
    {
        YG2.RewardedAdvShow(rewardID, () =>
        {
            // Получение вознаграждения
            coins++;

			// По желанию, воспользуйтесь ID вознаграждения
			if (rewardID == "AddCoin")
				coins++;
        });
    }
}
```

Вариант через событие (из документации, сокращён): подписаться `YG2.onRewardAdv += OnReward;` в `OnEnable`, отписаться в `OnDisable`, вызывать `YG2.RewardedAdvShow(rewardID);`, а в `OnReward(string id)` выдавать награду только `if (id == rewardID)`.

Остальное: `YG2.onOpenRewardedAdv`, `onCloseRewardedAdv`, `onErrorRewardedAdv` (`Action`); `onAdvNotification` — перед открытием любой рекламы; `YG2.nowRewardAdv`; `YG2.optionalPlatform.LoadRewardedAdv()` — предзагрузка. Порядок при награде: callback → `onRewardAdv`; при ошибке callback сбрасывается и вызывается `onErrorRewardedAdv`. Настройка `Skip Inter Adv After Reward` — после награды пропустить следующий interstitial. Для платформ с обязательной блокировкой после награды есть префаб **Lock Timer** со скриптом `RewardedAdvLockTimer` (`Modules/RewardedAdv/Prefabs`).

### 6.3 Sticky-баннер (модуль StickyAdv)

Баннер включён по умолчанию даже без модуля; модуль нужен только чтобы управлять им из кода:

```csharp
YG2.StickyAdActivity(bool activity);
```

Баннер не показывается, если: экран ПК слишком мал; включён fullscreen; баннеры выключены в Консоли (раздел «Реклама»); скрыт через API. После публикации баннеры появляются в течение нескольких часов.

Модуль **BannerAdv** (для других платформ; в документации Яндекс-страниц не описан): `YG2.SetBannerPosition(YG2.BannerPosition)` (`Top/Bottom/Left/Right`), `YG2.LoadBanner()`, `ShowBanner()`, `HideBanner()`, `DestroyBanner()`, события `onBannerClicked`, `onBannerError`.

## 7. Данные окружения (`YG2.envir`, модуль EnvirData)

```csharp
using UnityEngine;
using YG;

public class MyClass : MonoBehaviour
{
    public void MyMethod()
    {
        // deviceType может возвращать: desktop, mobile, tablet, tv
        string deviceStr = YG2.envir.deviceType;

        // Есть bool поля: isDesktop, isMobile, isTablet, isTV
        bool deviceIsDesktop = YG2.envir.isDesktop;

        // Поле enum:
        YG2.Device device = YG2.envir.device;
    }
}
```

| Поле `YG2.envir` | Тип | Пример |
|---|---|---|
| `deviceType` | string | `desktop`, `mobile`, `tablet`, `tv` |
| `isDesktop`, `isMobile`, `isTablet`, `isTV` | bool | |
| `device` | `YG2.Device` (`Desktop, Mobile, Tablet, TV`) | |
| `language` | string | `ru`, `en` (код страны) |
| `domain` | string | `ru`, `com` |
| `appID` | string | `177895` |
| `browserLang` | string | язык браузера |
| `payload` | string | значение из `?payload=` |
| `platform` | string | ОС, например `Win32` |
| `browser` | string | `Yandex`, `Opera`, `Firefox`, `IE`, `Edge`, `Chrome`, `Safari`, `Other` |

`YG2.GetEnvirData()` — перезапросить. Payload: ссылка `https://yandex.ru/games/app/012345?payload=debug123` → `YG2.envir.payload == "debug123"`. Симуляция: General Simulation → `Device`, `Language`.

## 8. Авторизация (`YG2.player`, модуль Authorization)

| Поле | Тип | Значение |
|---|---|---|
| `YG2.player.auth` | bool | авторизован |
| `YG2.player.name` | string | ник; `unauthorized` если не авторизован, `anonymous` если скрыл данные |
| `YG2.player.id` | string | идентификатор |
| `YG2.player.photo` | string | URL аватара (размер — настройка `Player Photo Size`: small/medium/large) |
| `YG2.player.payingStatus` | `YG2.PayingStatus` | `Paying`, `PartiallyPaying`, `NotPaying`, `Unknown` |

- `YG2.OpenAuthDialog()` — открыть окно входа (откроется только если пользователь не авторизован). После успешного входа срабатывает `onGetSDKData` (на Яндексе дополнительно перезагружаются сохранения через `LoadProgress`).
- `YG2.GetAuth()` — перезапросить данные игрока.
- Префаб **Player Name & Photo** (`Modules/Authorization/Prefabs`) со скриптом `GetPlayerYG` — положить внутрь Canvas. Для своих правок делать prefab variant.
- Игра должна работать и без авторизации (п. 1.2 Требований). Симуляция: настройки → Authorization (`Authorized`, `Player Name`, `Unique ID`, `Player Photo`, `Paying Status`).

## 9. Локализация (модуль Localization)

- Язык — код страны в нижнем регистре (`ru`, `en`, `tr`); плагин приводит `us`/`as`/`ai` → `en`.
- Настройка **Set Language Mod**: `Только при первом запуске` / `При каждом запуске` (обязательно для Яндекс Игр, значение по умолчанию) / `Не менять язык при запуске`.
- `YG2.lang` (`string`) — текущий язык; `YG2.SwitchLanguage(string language)` — переключить (сохраняется в localStorage под ключом `langYG`); `YG2.onSwitchLang` (`Action<string>`) — после установки языка (в т. ч. один раз при старте); `YG2.onCorrectLang` (`Action<string>`) — при запросе языка у платформы, чтобы подменить неподдерживаемый:

```csharp
using UnityEngine;
using YG;

public static class CorrectLang
{
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
    private static void Init()
    {
        YG2.onCorrectLang += OnСhangeLang;
    }

    public static void OnСhangeLang(string lang)
    {
        if (lang != "ru" && lang != "en" && lang != "tr")
        {
            YG2.lang = "en";
        }
    }
}
```

- Демо-скрипт `LanguageExample` — шаблон своего компонента перевода.
- **AutoTranslateLangs** (тянет Authorization + Localization, требует пакет Newtonsoft Json — кнопка импорта в настройках): массив `Languages`; компонент `LanguageYG` на объекте с Text/TextMeshPro; `YG2 → Auto Translate Langs → Auto Localization Masse` переводит все тексты сцены; шрифты — `Fonts` (массив на язык + дефолтный), `Font Index` и `Unique Font` в компоненте, `Font Default Masse`, `Font Size Correct`; компонент `LangYGAdditionalText` (поле `Additional Text`). Авторы предупреждают об архитектурных ограничениях модуля.
- Замечание модерации по п. 2.14 (нет автоопределения языка) — ставить Localization + AutoTranslateLangs. В черновике язык проверяется через debug-панель → SDK mocks → Choose Game Lang.

## 10. Сохранения: Storage, RedefinePlayerPrefs, PlayerStats

Все три модуля зависят от Authorization. Яндекс требует сохранение прогресса (п. 1.9) и указание облачных сохранений в черновике (п. 1.11).

### 10.1 Storage (`YG2.saves`)

Объявите поля в `partial class SavesYG` (можно в нескольких файлах):

```csharp
namespace YG
{
    public partial class SavesYG
    {
        // Ваши данные для сохранения
		public int coins = 5; // Пример
    }
}
```

```csharp
using UnityEngine;
using YG;

public class MyClass : MonoBehaviour
{
    public void MyMethod()
    {
        // Чтение
		Debug.log(YG2.saves.coins);

		// Запись
		YG2.saves.coins += 10;
    }
}
```

(В примере документации опечатка `Debug.log` — правильно `Debug.Log`.)

- `YG2.SaveProgress()` — отправить `YG2.saves` в облако/локально. До `isSDKEnabled` выводит ошибку и ничего не делает. Каждый вызов инкрементирует `saves.idSave`; при загрузке побеждает копия (облако/локальная) с бо́льшим `idSave`.
- Загрузка автоматическая при старте. Ручная: `YGInsides.LoadProgress()` (namespace `YG.Insides`), асинхронно → `onGetSDKData`.
- `YG2.onDefaultSaves` (`Action`) — при первом запуске без сохранений или после `YG2.SetDefaultSaves()`. После сброса вызываются `onDefaultSaves` и `onGetSDKData`, автосохранения нет — вызовите `SaveProgress` сами.
- Данные — JSON (`JsonUtility`). Вложенные классы/структуры помечать `[System.Serializable]`; **использовать `List<T>`, не массивы** (расширенный массив ломает загрузку); конструкторы и методы внутри `SavesYG` допустимы (пример с `List<ItemData>` и методом `GetItem` — на странице Storage).
- Dictionary/многомерные массивы — только с Newtonsoft JSON: импорт кнопкой в настройках → кнопка «Активировать NJSON для Storage» (define `NJSON_STORAGE_YG2`; +~2 МБ к билду).
- Настройки модуля (`InfoYG.Storage`): **Save Cloud** (по умолчанию вкл.; для Яндекса требует Authorization и галку облачных сохранений в черновике; сохраняет и неавторизованных — в локальное хранилище Яндекса), **Save Local** (для платформ без облака), **Flush** (в документации «Flash»; рекомендуют выключить, чтобы сохранения шли очередью и не отклонялись по лимитам).
- Сохранения редактора — файл `PluginYourGames/Editor/SavesEditorYG2.json` (удалить для сброса).
- Не сохраняйте слишком часто (лимиты платформы).

### 10.2 RedefinePlayerPrefs

В каждом скрипте, где используется PlayerPrefs:

```csharp
using PlayerPrefs = RedefineYG.PlayerPrefs;
```

`SetString/GetString/SetFloat/GetFloat/SetInt/GetInt/HasKey/DeleteKey/DeleteAll/Save` — тот же API. Записи меняют только текущую сессию: вызывайте `YG2.SaveProgress()` или `PlayerPrefs.Save()`. С модулем Storage данные уходят в облако, без него — в localStorage браузера. Без переопределения на Яндекс Играх сохранения в PlayerPrefs стираются после обновления игры.

### 10.3 PlayerStats (только `int`)

- `YG2.SetState(string key, int value)` — записать и сразу отправить; `YG2.GetState(string key)` → `int` (0, если ключа нет); до инициализации SDK — ошибка в лог.
- `YG2.GetAllStats()` → `Dictionary<string,int>`; `YG2.SetAllStats(Dictionary<string,int> stats)` — заменить всё (можно очистить).
- `YG2.LoadStats()` — перезагрузить, асинхронно → `onGetSDKData`. Загрузка при старте автоматическая.
- Рекомендуется для хранения купленных товаров.

## 11. Лидерборды (модуль Leaderboards, тянет Authorization)

Создать лидерборд в Консоли (https://yandex.ru/dev/games/concepts/leaderboards.md#create) и взять «Техническое название».

```csharp
using YG; // Подключите пространство имён плагина

public class MyClass
{
    public void MyMethod()
    {
        YG2.SetLeaderboard("TechnoNameLB", 100);
    }
}
```

Сигнатуры (`LB_yg.cs`):
- `YG2.SetLeaderboard(string nameLB, int score)` / `SetLeaderboard(string nameLB, int score, string extraData)`.
- `YG2.SetLBTimeConvert(string nameLB, float secondsScore)` / `(…, string extraData)` — для Time-лидербордов, секунды (`180` = 3 минуты, допустимо `180.135`), значение > 0.
- `YG2.GetLeaderboard(string nameLB)` (= top 3, around 3, фото `small`), `GetLeaderboard(string nameLB, int quantityTop, int quantityAround)`, `GetLeaderboard(string nameLB, int quantityTop, int quantityAround, string photoSizeLB)`.
- `YG2.onGetLeaderboard` — `Action<LBData>`; классы в namespace `YG.Utils.LB`.
- Запись выполняется только при `YG2.player.auth == true`; анонимов можно отсечь настройкой **Save Score Anonymous** = false.

| `LBData` | `LBPlayerData` | `LBCurrentPlayerData` |
|---|---|---|
| `technoName`, `entries` (текст для простого режима), `isDefault`, `isInvertSortOrder` (false = по убыванию), `decimalOffset`, `type` (`numeric`/`time`), `players` (`LBPlayerData[]`), `currentPlayer` | `rank`, `name`, `score`, `photo`, `uniqueID`, `extraData` | `rank`, `score`, `extraData` |

Ограничения: новое число **перезаписывает** старое, даже если меньше — сравнивайте сами; не чаще **1 запроса в секунду**; `long` не поддерживается.

Готовый UI — компонент `LeaderboardYG` (префабы в `Modules/Leaderboards/Prefabs`, внутрь Canvas, делать prefab variant): поля `Name LB` (обязательно), `Advanced`, `Entries Text`, `Root Spawn Players Data`, `Player Data Prefab` (с `LBPlayerDataYG`), `Time Type Converter`; методы `UpdateLB()`, `SetLeaderboard(int score)`, `SetLBTimeConvert(float score)`. Time-тип: в Консоли выбрать тип Time, сортировку по возрастанию, размер десятичной части 0; в коде копить `timer += Time.deltaTime` и писать `YG2.SetLBTimeConvert("nameLB", timer);`.

Симуляция: настройки → Leaderboards → массив таблиц (`Techno Name`, `Entries`, `Is Invert Sort Order`, игроки: `Rank`, `Score`, `Name` (`anonymous` = аноним), `Photo`, `Unique ID` — совпадение с Unique ID в симуляции Authorization выделяет текущего игрока). Без симуляции в редакторе — «Нет данных».

## 12. Инап-покупки и консумирование (модуль Payments)

Предварительно: запрос на подключение покупок и тестовые покупки в Консоли (https://yandex.ru/dev/games/console/purchases.md#connect); прогресс обязан сохраняться в облако (Storage или PlayerStats).

| Член | Тип | Смысл |
|---|---|---|
| `YG2.BuyPayments(string id)` | метод | открыть окно покупки (ставит паузу) |
| `YG2.onPurchaseSuccess` | `Action<string>` | успешная покупка, id товара |
| `YG2.onPurchaseFailed` | `Action<string>` | неуспешная (на странице документации опечатка `onFailedPurchased`) |
| `YG2.onGetPayments` | `Action` | каталог получен (при старте) |
| `YG2.purchases` | `Purchase[]` | все товары |
| `YG2.PurchaseByID(string ID)` | `Purchase` | товар по id (`null`, если нет) |
| `YG2.langPayments` | string | язык каталога |
| `YG2.ConsumePurchases()` / `ConsumePurchases(bool onPurchaseSuccess)` | метод | консумировать все необработанные |
| `YG2.ConsumePurchaseByID(string id)` / `(string id, bool onPurchaseSuccess)` | метод | одну |

`Purchase` (namespace `YG.Utils.Pay`): `id`, `title`, `description`, `imageURI`, `price` (`<цена> <код валюты>`), `priceValue`, `priceCurrencyCode`, `currencyImageURL`, `consumed`.

```csharp
private void OnEnable()
{
    YG2.onPurchaseSuccess += SuccessPurchased;
    YG2.onPurchaseFailed += FailedPurchased;
}

private void OnDisable()
{
    YG2.onPurchaseSuccess -= SuccessPurchased;
    YG2.onPurchaseFailed -= FailedPurchased;
}

private void SuccessPurchased(string id)
{
    // Ваш код для обработки покупки, например:
	string coinsKey = "coins";
	int coins = YG2.GetState(coinsKey);

	if (id == "50")
		YG2.SetState(coinsKey, coins + 50);
	else if (id == "250")
		YG2.SetState(coinsKey, coins + 250);
	else if (id == "1500")
		YG2.SetState(coinsKey, coins + 1500);
}

private void FailedPurchased(string id)
{
	// Покупка не была совершена
}
```

Консумирование **обязательно**: при запуске проверять необработанные покупки (деньги списаны, товар не выдан). `ConsumePurchases()` с параметром `true` (по умолчанию) вызовет `onPurchaseSuccess` для каждой — ваши подписчики выдадут товар; с `false` выдавайте сами. Компонент `ConsumePurchasesYG` делает это один раз в `Start()` (уже стоит на префабе **Payments Catalog**). Проверка в черновике: купить, **не** нажимать «Хорошо», перезагрузить страницу — товар должен выдаться.

Готовый UI: префаб **Payments Catalog** (поле `Purchase Prefab`) создаёт экземпляры префаба **Purchase** со скриптом `PurchaseYG` (для одного товара заполнить `ID`). Внутрь Canvas, prefab variant. Симуляция: настройки модуля → массив `Purchases`, `Duration Pay Panel`, `Test Buy Fail`.

## 13. Флаги / Remote Config (модуль Flags)

В Консоли → «Флаги»: добавить флаг, имя и значение, при необходимости условия (например по языку), **опубликовать**. A/B-эксперименты: https://yandex.ru/dev/games/console/vq-test.md

```csharp
// Допустим, из облака мы получаем уровень сложности

string value = YG2.GetFlag("difficult");  // difficult — имя флага

if (value == "easy")
{
    // Установите лёгкий уровень сложности.
}
else if (value == "hard")
{
    // Установите сложный уровень сложности.
}
else
{
    // Значение флага не определено, установите дефолтное значение.
    // Если значение не определено, метод GetFlag вернёт null.
}
```

```csharp
if (YG2.TryGetFlag("difficult", out string difficult))
{
    // Флаг существует, пользуемся им!
    Debug.Log(difficult);
}

if (YG2.TryGetFlagAsInt("intType", out int intType))
{
    // Флаг существует и преобразован в тип int
}

if (YG2.TryGetFlagAsFloat("floatType", out float floatType))
{
    // Флаг существует и преобразован в тип float
}

if (YG2.TryGetFlagAsBool("boolType", out bool boolType))
{
    // Флаг существует и преобразован в тип bool
}
```

Преобразование вычищает лишние символы; допустим минус; для float точка или запятая; bool принимает `true/false/0/1`. `YG2.flagsDictionary` — `Dictionary<string,string>` (только чтение); `YG2.flags` — `YG2.Flag[]` (struct `name`, `value`, чтение/запись). Симуляция: настройки модуля → массив `Flags`. Пример — `FlagsExample` в демо-сцене Flags.

## 14. Серверное время, оценка игры, ярлык

**ServerTime**: `YG2.ServerTime()` → `long`, **миллисекунды** Unix. На Яндексе — время сервера; на платформах без API — `DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();` (локальные часы, можно подкрутить). В редакторе — настройка модуля `Server Time` (`Manual Date Setup` + дата, иначе текущее время).

**Review**: `YG2.ReviewShow()` — открыть окно оценки (только если доступно); `YG2.reviewCanShow` (`bool`) — проверять перед показом; `YG2.onReviewSent` (`Action<bool>`, `true` — отзыв оставлен; после события `reviewCanShow` становится `false`). Окно не показывается неавторизованным и уже оценившим. Префаб **Review** (скрипт `ReviewYG`, деактивируется при недоступности) с UnityEvent: Review Available, Review Not Available, Review Success (здесь выдавать награду), Review Failed.

**GameLabel**: `YG2.GameLabelShowDialog()` — диалог установки ярлыка (вызов игнорируется, если `gameLabelCanShow == false`); `YG2.gameLabelCanShow` (`bool`); `YG2.onGameLabelSuccess` / `YG2.onGameLabelFail` (`Action`; после любого из них `gameLabelCanShow = false`). Префаб **Game Label** со скриптом `GameLabelYG` — готовая кнопка.

## 15. Метрика (модуль Metrica)

1. Создать счётчик на https://metrika.yandex.ru (адрес сайта в формате `yandex.ru/games/app/012345`).
2. ID счётчика → настройки плагина → Metrica → **Metrica Counter ID** (`enable`, `log`, `useYandexMetrica` — поля настроек). Работает и в черновике; данные на сайте отображаются с задержкой.
3. Цели: тип условия **JavaScript-Событие**, идентификатор **«совпадает»**, идентификатор латиницей без пробелов. События видны в «Конверсии», вложенные параметры — «Параметры цели».

Перегрузки `YG2.MetricaSend` (примеры со страницы модуля):

```csharp
YG2.MetricaSend("level_up");

var eventData = new Dictionary<string, object>
{
    { "action", "click" },
    { "element", "button" },
    { "user", new Dictionary<string, object>
        {
            { "level", 5 },
            { "experience", 1020 }
        }
    }
};
YG2.MetricaSend("ui_interaction", eventData);

YG2.MetricaSend("level_up", "level", "5");

YG2.MetricaSend("levelsFinish", "1", new Dictionary<string, object>
{
    { "stars", 3 },
    { "time", 10 }
});
```

Сигнатуры: `MetricaSend(string eventName)`, `(string, Dictionary<string,string>)`, `(string, Dictionary<string,object>)`, `(string eventName, string nestedParam, string subNestedParam)`, `(string eventName, string nestedParam, Dictionary<string,object> subNestedData)`. Требуется `using System.Collections.Generic;`. Для других платформ: опция платформы **Use Yandex Metrica**; при включённой в счётчике опции «Принимать данные только с указанных адресов» метрика с других адресов не работает.

## 16. Ссылки на другие игры (модуль OpenURL)

- `YG2.OnDeveloperURL()` — страница разработчика (в билде URL генерируется; для редактора — поле `Developer URL` в настройках модуля, заменить ID разработчика PluginYG на свой).
- `YG2.OnGameURL(int gameID)` — переход к игре по ID.
- `YG2.OnURL(string url)` — любая ссылка (на Яндексе сторонние ссылки обычно запрещены).
- `YG2.allGames` — `GameInfo[]` доступных игр; `YG2.GetGameByID(int appID)` → `GameInfo`; класс `YG.Utils.OpenURL.GameInfo`: `appID`, `title`, `url`, `coverURL`, `iconURL`.
- Префабы **Game YG** (компонент `GameYG`, для одной игры включить `Load By App ID` и указать ID) и **All Games** (`AllGamesYG`, поле `Game Info Prefab`). Сортировка через флаги: флаг (например `SortListGamesYG`) со списком ID через запятую; в `AllGamesYG` включить `Sort Using Flags`, указать имя флага; `Only Games From Flag` — показывать только перечисленные. Симуляция: массив `All Games` в настройках модуля (ID в `GameYG` должен существовать и в этом списке).

## 17. Прочие модули (по исходникам и README модулей)

- **TV**: `YG2.onTVKeyDown`, `onTVKeyUp` (`Action<string>`), `onTVKeyBack` (`Action`), `YG2.ExitTVGame()`; в билде режим ТВ-теста включается `?payload=tvtest`; в редакторе — `Device = TV`. Есть скрипты навигации меню (`MenuNavigation` и др.).
- **Fullscreen**: `YG2.SetFullscreen(bool)`, `YG2.isFullscreen`.
- **Clipboard**: `YG2.SetClipboardText(string)`, `YG2.GetClipboardTextAsync(Action<string>)`.
- **Bonuses** (Authorization): `YG2.GetBonusCatalog()`, `YG2.GetPlayerBonuses()`, `YG2.ConsumeBonus(string token)`; события `onGetBonusCatalog` (`Action<BonusCatalogResponse>`), `onGetPlayerBonuses` (`Action<PlayerBonusesResponse>`, поле `isSignedResponse`/`signature`), `onConsumeBonus` (`Action<ConsumptionResponse>`), `onErrorBonuses`.
- **QuitGameEvent**: настройки `Enable`, `Object Name`, `Method Name` — вызвать публичный метод без перегрузок при закрытии/обновлении страницы.
- **EventsYG2** (компонент, без модуля): содержит большинство методов плагина для привязки к кнопкам без кода и «Добавить новый тип события» для реакции на события плагина (как `Button.onClick`).
- Демо: `PluginYourGames/Example/Scenes/ExampleYG2`; кнопка «Добавить демо сцены» добавляет сцены модулей в Build Settings — **удалить перед релизом** (и до удаления модуля, иначе останется битая запись).

## 18. Симуляция в редакторе

Плагин эмулирует SDK в Play Mode без сборки. Настройки → **General Simulation** (`InfoYG.Simulation`):

| Поле | По умолчанию | Смысл |
|---|---|---|
| `Device` | Desktop | устройство для `YG2.envir` |
| `Language` | `ru` | язык для `envir.language` и `YG2.lang` |
| `Enable Inter Adv` | true | симулировать interstitial |
| `Adv Interval Simulation` | 60 | интервал между показами (сек) |
| `Duration Adv` | 0.5 | длительность показа |
| `Load Adv` | 0 | задержка перед открытием |
| `Test Fail Ads` | false | симулировать ошибку показа |
| `Pause On Focus Game` | false | пауза при потере фокуса окна редактора |

Также: Basic → `Init Delay Simulation` (задержка SDK при Sync Init), Authorization (данные игрока), Leaderboards (таблицы), Payments (`Purchases`, `Duration Pay Panel`, `Test Buy Fail`), Flags (`Flags`), ServerTime (`Manual Date Setup`), OpenURL (`All Games`, `Developer URL`). Сохранения редактора — `PluginYourGames/Editor/SavesEditorYG2.json`, PlayerStats — в обычных PlayerPrefs под ключом `PlayerStatsYG`.

## 19. Сборка, ZIP для Консоли, локальный запуск

- Собирать WebGL в папку **без кириллицы** в пути. Плагин после сборки модифицирует `index.html` (подставляет код модулей в места `<!-- Additional head modules -->`, `// Additional init modules` и т. п.) и пишет в консоль браузера `[Plugin Your Games vX] [Build: N] [Platform: YandexGames]`.
- **Номер сборки** хранится в `PluginYourGames/Editor/BuildLogYG2.txt` (удалить для обнуления); виден в логе Unity, имени архива, консоли браузера и плашке Developer Build.
- **Archiving Build** (вкл.): после сборки создаётся ZIP **рядом** с папкой билда (`ZipFile.CreateFromDirectory(…, includeBaseDirectory: false)`), имя `<папка>_<Platform>_Build(N).zip` (при коллизии добавляется дата-время). Чтобы архив не терялся — создайте внутри папки назначения подпапку с именем игры и собирайте в неё. В корне архива лежат `index.html`, `style.css`, `Build/` (`*.loader.js`, `*.data.br`, `*.framework.js.br`, `*.wasm.br` при Brotli), `StreamingAssets/` (если есть), `Images/` — это и загружается в черновик Консоли (https://games.yandex.ru/console).
- **Build And Run** на localhost работает, но инициализация SDK пропускается (функция `IsLocalHost()` в `index.html` шаблона — `localhost`, `127.0.0.1`, `*.local`); при необходимости её можно править в `Assets/WebGLTemplates/YandexGames/index.html`.
- **Локальный билд с реальным SDK** (production-окружение Яндекс Игр): нужен Node.js (npm/npx; после установки перезапустить Unity). В настройках платформы: `Local Prod Game ID` (из черновика, обязателен), `Local Prod Port` (8080), `Local Prod Use Csp` (применить CSP черновика; домены мультиплеера/Addressables добавлять в белый список CSP черновика). Собрать WebGL → `Tools → YG2 → Run local build in YandexGames` (автозапуск: `Tools → YG2 → Enable autorun after build`). При первом запуске открыть `https://localhost:8080/`, принять сертификат, обновить страницу игры. Проверено в Яндекс Браузере, Chrome, Edge; VPN мешает.
- Перед модерацией обязательно тестировать именно загруженный в черновик архив. Если по ссылке черновика «такой игры нет» — заполнить все поля черновика (скриншоты/видео необязательны).

## 20. Подводные камни (FAQ + исходники)

- Нет пункта `Tools` и куча ошибок после импорта — удалить все Scripting Define Symbols модулей (`*_yg`) и починить ошибки компиляции.
- `SaveProgress`, `SetState`, `GetState` до `isSDKEnabled` — ошибка в лог, операция не выполняется. Ждите `onGetSDKData`.
- `InterstitialAdvShow()` до истечения `Inter Adv Interval` ничего не показывает и не вызывает события — проверяйте `isTimerAdvCompleted`, если логика зависит от показа.
- Отписывайтесь от событий `YG2.*` в `OnDisable`/`OnDestroy`; в редакторе статические события сбрасываются при входе в Play Mode.
- Автореклама Яндекса при запуске видна только через `onPauseGame`/`isPauseGame`.
- Чёрный экран при работающем UI — Color Space = Gamma. Звук в свёрнутой вкладке — снять `Run In Background`. Плеер в шторке телефона — у AudioClip `Load Type = Decompress On Load`.
- «Мыльная» картинка — выключить Pixel Ratio в Templates (или удалить `config.devicePixelRatio` из `index.html`). Не виден шрифт — Legacy Text не может использовать встроенный `Legacy Runtime`, назначьте файл шрифта.
- Игра не запускается после загрузки в черновик — кириллица в пути, не тот билд, красные строки в консоли браузера (F12).
- Обновление плагина при своих правках: смотреть изменённые файлы в коммитах на GitHub и импортировать только их (или форк). Префабы плагина не редактировать — prefab variant.

## 21. Требования Яндекс Игр, на которые ссылаются уроки

Пункты Требований (https://yandex.ru/dev/games/concepts/requirements.md, якоря `#1-2` и т. д.): 1.2 игра доступна без авторизации; 1.9 сохранение прогресса (в т. ч. бесконечные игры); 1.11 облачные сохранения указать в черновике; 1.12 рекламная монетизация обязательна; 1.16 сторонняя реклама запрещена; 4 правила показа рекламы; 6.9 ручной выбор языка; 8.2.3 перевод хотя бы на один язык из черновика (рекомендуются ru, en, tr; список: https://yandex.ru/dev/games/concepts/languages-and-domains.md#languages).

Game Ready: https://yandex.ru/dev/games/doc/ru/sdk/sdk-game-events . Семантика `ysdk.*` (лимиты, `purchase_token`, `can_review`) одинакова для всех движков — см. справочники HTML5 SDK в этой папке; плагин оборачивает те же методы.

## 22. Видеоуроки Яндекса

Текстовые страницы: https://yandex.ru/dev/games/doc/ru/sdk/unity/install и далее `advertisement.md`, `env-auth-lang.md`, `progress-saving.md`, `leaderboards.md`, `inaps.md`, `metrics.md`, `other.md`, `flags-links.md`, `setting-up.md` (префикс https://yandex.ru/dev/games/doc/ru/). Сам плагин рекомендует ориентироваться на документацию, а не на видео.

| № | Тема | YouTube |
|---|---|---|
| 1 | Знакомство и базовая функциональность | https://youtu.be/juGa0-EG24k |
| 2 | Реклама | https://youtu.be/B9J2G2hoXKA |
| 3 | Данные, авторизация, локализация | https://youtu.be/olyTBkJJAfY |
| 4 | Облачные сохранения | https://youtu.be/QCgXHR6sBIk |
| 5 | Таблицы лидеров | https://youtu.be/G3xiaG-HoqM |
| 6 | Инап-покупки | https://youtu.be/pOvmbZtgSBw |
| 7 | Метрики | https://youtu.be/XdYtMTFk7jg |
| 8 | Серверное время, отзыв, ярлык | https://youtu.be/JxiatIGGZq0 |
| 9 | Флаги, ссылки на игры | https://youtu.be/prpPWD7_Cmo |
| 10 | Оптимизация проекта | https://youtu.be/NhWP7Og8kPk |

Статья по оптимизации, на которую ссылается плагин: https://vk.com/@-210544836-optimizaciya-proekta-unity

## 23. Поддержка

- Канал обновлений: https://t.me/pluginYG2
- Чат (вопросы, баги): https://t.me/pluginYG
- FAQ плагина: https://max-games.ru/plugin-yg/doc/faq/
