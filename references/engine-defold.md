# Yandex Games SDK для Defold (Lua)

Источник: раздел «Defold» официальной документации Яндекс Игр. Репозиторий плагина: https://github.com/yandex-games-plugins/defold. API — Lua-обёртка над HTML5 SDK: те же объекты (`adv`, `player`, `leaderboards`, `payments`, `feedback`, `shortcut`, `environment`, `screen`, `clipboard`, `device_info`), но имена методов в **snake_case**, а результаты приходят в **callback** вида `function(self, ...)`.

## Содержание
1. Установка
2. Старт игры (`loading_api.ready`)
3. Переменные окружения
4. Локализация (`ysdk.i18n`)
5. Реклама
6. Данные игрока и авторизация
7. Лидерборды
8. Инап-покупки
9. Оценка игры
10. Ярлык на рабочий стол
11. События (`HISTORY_BACK`, `EXIT`)
12. Другие объекты: `screen`, `clipboard`, `device_info`
13. Подводные камни и неточности документации
14. Поддержка

---

## 1. Установка

1. Открыть Releases: https://github.com/yandex-games-plugins/defold/releases/
2. Скопировать ссылку на архив **Source code (.zip)** нужного релиза (ПКМ → Copy link URL). Формат ссылки: `https://github.com/yandex-games-plugins/defold/archive/refs/tags/<tag>.zip`.
3. В `game.project` → список **Dependencies** → добавить скопированную ссылку.
4. **Project** → **Fetch Libraries** — плагин подтянется из GitHub.

В проекте появляется папка `ysdk`. В примерах документации объект `ysdk` используется напрямую (глобально); модуль локализации подключается явно: `local i18n = require('ysdk.i18n')`.

## 2. Старт игры (`loading_api.ready`)

Сообщает платформе, что игра загрузила все ресурсы и готова к взаимодействию (нужно для статистики загрузки и общих загрузочных экранов):

```lua
function init(self)
    ysdk.features.loading_api.ready()
end
```

Вызывать в момент, когда:
- все элементы готовы к взаимодействию с игроком;
- нет экранов загрузки.

## 3. Переменные окружения

Объект `ysdk.environment`:

```lua
{
    app = { id = string },
    i18n = { lang = string },
    payload = string|nil
}
```

| Поле | Тип | Описание |
|---|---|---|
| `app.id` | `string` | Идентификатор игры |
| `i18n.lang` | `string` | Язык интерфейса Яндекс Игр, ISO 639-1 (например, `"tr"`). Использовать для автоопределения языка игры (пункт 2.14 требований: https://yandex.ru/dev/games/concepts/requirements.md#2-14). Список языков: https://yandex.ru/dev/games/concepts/languages-and-domains.md |
| `payload` | `string` или `nil` | Параметр `payload` из URL игры: для `https://yandex.ru/games/app/123?payload=test` → `ysdk.environment.payload == "test"` |

## 4. Локализация (`ysdk.i18n`)

### Файлы переводов
Создать папку **`i18n`** в проекте, в ней JSON-файлы по кодам языков.

`i18n/en.json`:

```json
{
    "game": { "title": "Cool Game" },
    "button": "Button"
}
```

`i18n/ru.json`:

```json
{
    "game": { "title": "Крутая игра" },
    "button": "Кнопка"
}
```

### API

| Метод | Описание |
|---|---|
| `i18n.key(key)` | Вернуть строку по ключу с точечной нотацией: `i18n.key("game.title")` → `"Cool Game"` |
| `i18n.gui(node_id, key)` | Заменить текст gui-узла: эквивалент `gui.set_text(gui.get_node(node_id), i18n.key(key))` |
| `i18n.on(fn)` / `i18n.off(fn)` | Подписка/отписка на событие локализации (вызывается при инициализации и смене языка) |
| `i18n.set_language(code)` | Сменить язык вручную (`code` — ISO 639-1) |

Модуль **сам инициализирует язык** из `ysdk.environment.i18n.lang`; `set_language` — только для ручного переключения по желанию пользователя.

### Пример gui-скрипта

```lua
local i18n = require('ysdk.i18n')

local function on_localize()
    i18n.gui("title_label", "game.title")
    i18n.gui("button_label", "button")
end

function init(self)
    i18n.on(on_localize)
end

function final(self)
    i18n.off(on_localize)
end
```

Смена языка:

```lua
function settings.change_language(code)
    i18n.set_language(code)
end
```

## 5. Реклама

Порядок: рекомендации по размещению (https://yandex.ru/dev/games/doc/sdk-adv.md#recommendations) → вызовы в SDK → включить монетизацию в Консоли (https://yandex.ru/dev/games/console/adv-monetization.md#enable-int-monetization).

### Полноэкранная реклама

```lua
ysdk.adv.show_fullscreen_adv(callbacks: table)
```

`callbacks` — опциональная таблица:

| Колбэк | Когда вызывается |
|---|---|
| `on_open(self)` | Реклама успешно открылась |
| `on_close(self, was_shown: boolean)` | Реклама закрыта, после ошибки, а также если не открылась из-за слишком частого вызова; `was_shown` — была ли показана |
| `on_error(self, error)` | Ошибка; передаётся объект ошибки |
| `on_offline(self)` | Потеря сети (офлайн-режим) |

```lua
ysdk.adv.show_fullscreen_adv({
    on_close = function (self, was_shown)
        -- Действие в случае закрытия рекламы.
    end,
    on_error = function (self, error)
        -- Действие в случае ошибки.
    end
})
```

### Видеореклама с вознаграждением

```lua
ysdk.adv.show_rewarded_video(callbacks: table)
```

| Колбэк | Когда вызывается |
|---|---|
| `on_open(self)` | Видео показано на экране |
| `on_close(self)` | Видео закрыто |
| `on_rewarded(self)` | Просмотр засчитан — **здесь выдавать награду** |
| `on_error(self, error)` | Ошибка |

```lua
ysdk.adv.show_rewarded_video({
    on_open = function (self)
        print("Video ad open")
    end,
    on_rewarded = function (self)
        -- Выдать награду.
    end,
    on_close = function (self)
        print("Video ad closed.")
    end,
    on_error = function (self, error)
        print("Error while open video ad: " .. error)
    end
})
```

### Стики-баннер
Подключение в Консоли: https://yandex.ru/dev/games/sdk/sdk-adv.md#banner-on. По умолчанию баннер показывается с запуска всю сессию. Для ручного управления: в Консоли в блоке **Sticky-баннеры** включить **Использовать API для показа sticky-баннера**, затем:

| Метод | Описание |
|---|---|
| `ysdk.adv.get_banner_adv_status(callback)` | `callback(self, sticky_adv_is_showing: boolean, reason: string or nil)`; при `false` `reason` ∈ `ADV_IS_NOT_CONNECTED` (баннеры не подключены), `UNKNOWN` (ошибка на стороне Яндекса) |
| `ysdk.adv.show_banner_adv()` | Показать баннер |
| `ysdk.adv.hide_banner_adv()` | Скрыть баннер |

```lua
ysdk.adv.get_banner_adv_status(
    function (self, sticky_adv_is_showing, reason)
        if sticky_adv_is_showing then
            -- Реклама показывается.
        elseif reason then
            -- Реклама не показывается.
            print(reason)
        else
            ysdk.adv.show_banner_adv()
        end
    end
)
```

## 6. Данные игрока и авторизация

### Информация об игроке

```lua
ysdk.player.get_info(callback, options)
-- options = { scopes = boolean|nil, signed = boolean|nil }
-- callback = function(self, player: table|nil, signature: string|nil)
```

`player`:

```lua
{
    logged_in = boolean,
    unique_id = string,
    name = string,
    photo = { small = string, medium = string, large = string }
}
```

`signature` приходит при `signed = true` (данные + подпись для проверки на сервере).

### Авторизация

```lua
ysdk.player.open_auth_dialog(callback)
-- callback = function(self, authorized: boolean)
```

Пример: получить игрока, при отсутствии — открыть диалог авторизации и запросить снова (исправленная версия примера из документации):

```lua
function display_player(player)
    if player then
        print(player.name)
    end
end

function init_player()
    ysdk.player.get_info(function(self, player)
        if player then
            display_player(player)
        else
            ysdk.player.open_auth_dialog(function(self, authorized)
                ysdk.player.get_info(function(self, p) display_player(p) end, {})
            end)
        end
    end, {})
end
```

### Внутриигровые данные (облачные сохранения)

| Метод | Описание |
|---|---|
| `ysdk.player.set_data(data: table, flush: boolean)` | Сохранить данные (пары ключ-значение). **Лимит 200 КБ.** `flush = true` — отправить немедленно; `false` (по умолчанию) — поставить в очередь. По документации возвращает Promise об успехе; при `flush = false` результат отражает только валидность данных |
| `ysdk.player.get_data(callback, keys)` | `callback(self, data: table<string, any>)`; `keys: table<number, string>` — список ключей, без него — все данные. Возвращает данные последнего `set_data`, даже если они ещё не отправлены |
| `ysdk.player.set_stats(stats: table<string, number>)` | Сохранить численные данные. **Лимит 10 КБ.** Использовать для часто меняющихся чисел (очки, опыт, валюта) вместо `set_data` |
| `ysdk.player.increment_stats(increments: table<string, number>)` | Инкремент численных данных. Лимит 10 КБ |
| `ysdk.player.get_stats(callback, keys)` | `callback(self, data: table<string, number> or nil)`; `keys: string[]`, без него — все |

### Идентификаторы пользователя в играх разработчика

```lua
ysdk.player.get_ids_per_game(callback)
-- callback = function(self, ids: { app_id: string, user_id: string }[])
```

Возвращает ID пользователя во всех играх разработчика, где получено явное согласие на передачу персональных данных.

```lua
function log_ids()
    ysdk.player.get_ids_per_game(function(self, ids)
        for _, value in ipairs(ids) do
            print(value.app_id, value.user_id)
        end
    end)
end
```

## 7. Лидерборды

Условия: SDK подключён (объект `ysdk`), лидерборд **создан в Консоли** (https://yandex.ru/dev/games/concepts/leaderboards.md). Если **Техническое название лидерборда** не совпадает — **404**.

### Описание

```lua
ysdk.leaderboards.get_description(leaderboard_name: string, callback)
-- callback = function(self, description: table|nil)
```

```lua
description = {
    app_id = string,
    default = boolean,
    invert_sort_order = boolean,
    decimal_offset = integer,
    type = string,          -- "numeric" | "time"
    name = string,
    title = { en = string, ru = string }
}
```

```lua
function display_leaderboard()
    ysdk.leaderboards.get_description("highscores",
        function (self, description)
            if description then
                print(description.name, description.title.en)
            end
        end)
end
```

### Новый результат (только авторизованным)

```lua
ysdk.leaderboards.set_score(leaderboard_name: string, score: integer, extraData: string|nil)
```

Лимит: **не чаще 1 раза в 1 секунду**, иначе ошибка.

### Рейтинг игрока (только авторизованным)

```lua
ysdk.leaderboards.get_player_entry(leaderboard_name: string, callback)
-- callback = function(self, player_entry: table|nil)
```

```lua
player_entry = {
    score = integer,
    extraData = string,
    rank = integer,
    avatar_src = { small = string, medium = string, large = string },
    avatar_srcset = { small = string, medium = string, large = string },
    lang = string,
    public_name = string,
    unique_id = string,
    formatted_score = string
}
```

```lua
function display_high_score()
    ysdk.leaderboards.get_player_entry("highscores",
        function (self, player_entry)
            if player_entry then
                print("highscore: " .. player_entry.score)
            end
        end)
end
```

### Записи лидерборда

```lua
ysdk.leaderboards.get_entries(leaderboardName: string, callback, options)
-- options = { include_user = boolean|nil, quantity_around = number|nil, quantity_top = number|nil }
-- callback = function(self, entries: table|nil)
```

```lua
entries = {
    leaderboard = { ... },            -- описание, как в get_description
    ranges = { { start = integer, size = integer }, ... },
    userRank = integer,
    entries = {
        {
            score = integer,
            extraData = string,
            rank = integer,
            avatar_src = { small = string, medium = string, large = string },
            avatar_srcset = { small = string, medium = string, large = string },
            lang = string,
            public_name = string,
            unique_id = string,
            formatted_score = string
        },
        ...
    }
}
```

## 8. Инап-покупки

Порядок: подключить покупки заранее (https://yandex.ru/dev/games/doc/sdk-purchases.md#conditions) → добавить товары в Консоли (https://yandex.ru/dev/games/console/purchases.md#add-purchases) → настроить SDK → протестировать (https://yandex.ru/dev/games/console/purchases.md#test).

### Покупка

```lua
ysdk.payments.create_purchase(callback, options)
-- options = { id = string, developer_payload = string|nil, signed = boolean|nil }
-- callback = function(self, purchase: table|nil, signature: string|nil)
```

- `options.id` — идентификатор товара из Консоли.
- `options.developer_payload` — доп. данные для своего сервера (попадут в `signature`).
- `options.signed` — подписанный ответ для защиты от накруток.
- `purchase = { product_id = string, purchase_token = string, developer_payload = string|nil }`.
- `signature` — данные покупки + подпись для проверки (https://yandex.ru/dev/games/sdk/sdk-purchases#purchase-data-example).

```lua
function buy_item(id)
    ysdk.payments.create_purchase(
        function(self, purchase, signature)
            if purchase then
                print(purchase.product_id, signature)
            end
        end,
        { id = id, signed = true }
    )
end
```

### Список купленного

```lua
ysdk.payments.get_purchases(callback, options)
-- options = { signed = boolean|nil }
-- callback = function(self, purchases: Purchase[]|nil, signature: string|nil)
-- Purchase = { product_id = string, purchase_token = string, developer_payload = string|nil }
```

```lua
function display_purchases()
    ysdk.payments.get_purchases(
        function(self, purchases)
            if purchases then
                for k, v in pairs(purchases) do print(k, v) end
            end
        end,
        { signed = false }
    )
end
```

### Каталог

```lua
ysdk.payments.get_catalog(callback)
-- callback = function(self, products: Product[]|nil)
```

```lua
products = {
    {
        id = string,
        title = string,
        description = string,
        image_uri = string,
        price = string,
        price_value = string,
        price_currency_code = string,
        price_currency_image = { small = string, medium = string, svg = string }
    },
    ...
}
```

```lua
function display_shop()
    ysdk.payments.get_catalog(function(self, products)
        if products then
            for k, v in pairs(products) do print(v.title, v.price, v.description) end
        end
    end)
end
```

### Обработка и consume

```lua
ysdk.payments.consume_purchase(purchase_token: string)
```

- **Постоянные** покупки (отключение рекламы): проверять через `get_purchases()`, `consume_purchase()` **не вызывать**.
- **Используемые** (валюта): начислить → сохранить (`ysdk.player.set_stats()` / `increment_stats()`) → затем `consume_purchase(purchase_token)`. После consume покупка удаляется **без возможности восстановления**.
- Ограничение плагина: текущая версия **не передаёт в Lua результат сохранения**, поэтому строгий порядок «consume только после подтверждённого сохранения» через API плагина реализовать нельзя — вызывайте consume сразу после `set_stats`/`increment_stats`.
- При повторной обработке (например, на старте по `get_purchases`) проверяйте `purchase_token`, чтобы не начислить дважды.

## 9. Оценка игры

Подробно: https://yandex.ru/dev/games/console/reviews.md. Окно оценки показывается только авторизованному пользователю, который ещё не оценивал игру. **Запросить оценку можно один раз за сессию**; перед запросом обязательно `can_review()`.

```lua
ysdk.feedback.can_review(callback)
-- callback = function(self, can_review: boolean, reason: string|nil)
```

| `reason` | Значение |
|---|---|
| `NO_AUTH` | Пользователь не авторизован |
| `GAME_RATED` | Уже оценивал |
| `REVIEW_ALREADY_REQUESTED` | Запрос уже отправлен, ждём действия пользователя |
| `REVIEW_WAS_REQUESTED` | Запрос уже был в этой сессии (оценил или закрыл) |
| `UNKNOWN` | Ошибка на стороне Яндекса |

```lua
ysdk.feedback.request_review(callback)
-- callback = function(self, feedback_sent: boolean)  -- true: оценил, false: закрыл окно
```

```lua
ysdk.feedback.can_review(function (self, can_review, reason)
    if can_review then
        ysdk.feedback.request_review(function (self, feedback_sent)
            if feedback_sent then
                print("Reward")
            end
        end)
    else
        print(reason)
    end
end)
```

## 10. Ярлык на рабочий стол

Доступность зависит от устройства, браузера и платформы — сначала проверить:

```lua
ysdk.shortcut.can_show_prompt(function (self, can_show)
    if can_show then
        -- Здесь можно показать кнопку для добавления ярлыка.
    end
end)
```

Показать нативный диалог (по нажатию кнопки):

```lua
ysdk.shortcut.show_prompt(function (self, accepted)
    if accepted then
        -- Начислить награду за добавление ярлыка.
    end
end)
```

При первом вызове создаётся ярлык каталога Яндекс Игр; если он уже есть — ярлык на саму игру.

## 11. События (`HISTORY_BACK`, `EXIT`)

```lua
ysdk.on_event(eventName: "EXIT" | "HISTORY_BACK", listener: function)
ysdk.dispatch_event(eventName: "EXIT" | "HISTORY_BACK", detail: table|nil)
```

`HISTORY_BACK` — **только при запуске на телевизоре** (кнопка Back пульта):

```lua
ysdk.on_event("HISTORY_BACK", function (self)
    -- Показ кастомного диалога: подтвердить выход, открыть настройки/магазин и т. п.
end)
```

Если пользователь подтвердил выход в этом диалоге — отправить:

```lua
ysdk.dispatch_event("EXIT")
```

## 12. Другие объекты: `screen`, `clipboard`, `device_info`

### `ysdk.screen`

```lua
{
    fullscreen = {
        status = function(): "on"|"off",
        request = function(): nil,
        exit = function(): nil
    },
    orientation = {
        get = function(): "portrait"|"landscape",
        set = function(value: "portrait"|"landscape")
    }
}
```

Яндекс Игры могут запускаться в полноэкранном режиме автоматически, но браузеры запрещают переключать режим без действия пользователя. Кнопка полноэкранного режима уже есть в правом верхнем углу платформы; `screen.fullscreen` — для собственных кнопок в игре.

### `ysdk.clipboard`

```lua
ysdk.clipboard.write_text(text: string)
```

### `ysdk.device_info()`

```lua
{
    type = "mobile"|"desktop"|"tablet"|"tv",
    isMobile = boolean,
    isDesktop = boolean,
    isTablet = boolean,
    isTV = boolean
}
```

## 13. Подводные камни и неточности документации

- Все колбэки принимают первым аргументом `self`: `function(self, ...)`.
- Имена методов snake_case (`show_rewarded_video`, `get_player_entry`), но ряд полей ответов остаётся в camelCase, как в JS: `extraData`, `userRank`, `isMobile`, параметр `leaderboardName` у `get_entries`. Поля игрока/покупок — snake_case: `unique_id`, `logged_in`, `product_id`, `purchase_token`, `avatar_src`.
- `get_ids_per_game`: аннотация в документации указывает `{appID, userID}`, но реальные поля — `app_id`, `user_id` (пример использует их).
- Пример rewarded-рекламы в документации перепутал тексты `on_close`/`on_rewarded`; награду выдавать **только в `on_rewarded`**.
- Пример `display_player` в документации объявлен с одним параметром, но вызывается как `display_player(self, player)` и печатает неопределённую `signature` — в разделе 6 дан исправленный вариант.
- `set_data` лимит 200 КБ, `set_stats`/`increment_stats` — 10 КБ.
- Лидерборды: `set_score` и `get_player_entry` только авторизованным; 1 запрос/сек; 404 при неверном имени.
- `consume_purchase` необратим; результат сохранения в Lua не приходит.
- `request_review` — один раз за сессию, только после `can_review`.
- `HISTORY_BACK` приходит только на ТВ.
- Документация Defold не описывает `GameplayAPI.start()/stop()`, серверное время и remote config — при необходимости смотрите исходники плагина (https://github.com/yandex-games-plugins/defold) и справочник HTML5 SDK.

## 14. Поддержка

- Репозиторий: https://github.com/yandex-games-plugins/defold
- Телеграм: https://t.me/yagamedev/1233731
- ВКонтакте: https://vk.ru/yandexgmsdev
