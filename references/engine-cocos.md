# Yandex Games SDK для Cocos Creator

Источник: раздел «Cocos Creator» официальной документации Яндекс Игр (плагин `yandex-games-sdk`, репозиторий https://github.com/yandex-games-plugins/cocos).

## Содержание
1. Установка плагина
2. Настройка шаблонов сборки (обязательно)
3. API: объект `ysdk`
4. Реклама (пример rewarded-кнопки)
5. Локализация: редактор, `l10n.t()`, компонент `L10nLabel`
6. Тестирование: сборка и запуск с локального сервера
7. Подводные камни
8. Поддержка

---

## 1. Установка плагина

Два способа:

| Способ | Откуда |
|---|---|
| Cocos Store | https://store.cocos.com/app/en/detail/5341 |
| Из репозитория (zip) | https://github.com/yandex-games-plugins/cocos/releases/latest |

Установка zip-файла вручную:
1. Скачать плагин из Releases.
2. Открыть проект в Cocos Creator (или создать новый).
3. Верхняя панель → **Extension** (Расширения) → **Extension Manager** (Менеджер расширений).
4. В окне Extension Manager нажать иконку **Import Extension File (.zip)** (Импортировать файл расширения) и выбрать скачанный архив.

После установки в верхней панели появляется новый раздел меню **Yandex.Games SDK**.

## 2. Настройка шаблонов сборки (обязательно)

Сразу после установки в консоли Cocos Creator, скорее всего, появятся предупреждения:

```text
[yandex-games-sdk] Failed to find build-templates/web-desktop template!
[yandex-games-sdk] Failed to find build-templates/web-mobile template!
[yandex-games-sdk] Failed to find preview-template template!
```

Причина: SDK Яндекс Игр должен быть подключён напрямую в файлы, которые появляются после компиляции (например, `index.html`), поэтому плагину нужны кастомные шаблоны сборки и превью.

Решение: открыть раздел меню **Yandex.Games SDK** и выбрать опцию **генерации шаблонов** — плагин создаст `build-templates/web-desktop`, `build-templates/web-mobile` и `preview-template` сам. Шаблоны можно написать и вручную.

Признак успеха в консоли:

```text
[yandex-games-sdk] Templates looks fine!
```

Документация Cocos по шаблонам сборки и веб-превью: https://docs.cocos.com/creator/manual/en/editor/preview/browser.html

## 3. API: объект `ysdk`

После установки доступен объект `ysdk` — **типизированный (TypeScript) эквивалент одноимённого объекта из SDK Яндекс Игр** (https://yandex.ru/dev/games/sdk/sdk-game-events.md). Через него доступны все методы SDK; имена и сигнатуры совпадают с HTML5 SDK (`ysdk.adv`, `ysdk.player`, `ysdk.leaderboards`, `ysdk.payments`, `ysdk.environment` и т. д.).

Импорт:

```ts
import { ysdk } from 'db://yandex-games-sdk/ysdk';
```

Пример — переменные окружения (https://yandex.ru/dev/games/sdk/sdk-environment.md):

```tsx
import { _decorator, Component } from 'cc';
import { ysdk } from 'db://yandex-games-sdk/ysdk';
const { ccclass, property } = _decorator;

@ccclass('YourGameComponent')
export class YourGameComponent extends Component {
    start() {
        console.debug(`App ID: ${ysdk.environment.app.id}`);
        console.debug(`User Language: ${ysdk.environment.i18n.lang}`);
        console.debug(`URL Payload: ${ysdk.environment.payload}`);
    }

    update(deltaTime: number) {}
}
```

(В оригинале документации в первой строке импортируется только `Component`, а `_decorator` не импортирован — это ошибка примера; импортируйте `_decorator` из `'cc'`, как выше.)

## 4. Реклама (пример rewarded-кнопки)

Компонент кнопки, показывающий видео с вознаграждением. Награда выдаётся в колбэке `onRewarded`, переданном в `ysdk.adv.showRewardedVideo({ callbacks })`:

```tsx
import { _decorator, Button, Component } from 'cc';
import { ysdk } from 'db://yandex-games-sdk/ysdk';
const { ccclass, property, requireComponent } = _decorator;

@ccclass('RewardADButton')
@requireComponent(Button)
export class RewardADButton extends Component {
    start() {
        this.node.on('click', this.onClick.bind(this));
    }

    onClick() {
        const callbacks = {
            onRewarded: this.onReward.bind(this)
        };

        ysdk.adv.showRewardedVideo({ callbacks });
    }

    onReward() {
        // Наградить пользователя.
    }
}
```

Полноэкранная реклама и стики-баннер вызываются теми же методами, что в HTML5 SDK: `ysdk.adv.showFullscreenAdv({ callbacks })`, `ysdk.adv.showBannerAdv()` / `hideBannerAdv()` / `getBannerAdvStatus()` (см. справочник HTML5 SDK). На платформе Яндекс Игр реклама реально показывается; для отладки см. раздел 6.

## 5. Локализация

Переводы хранятся в формате **JSON внутри проекта**; редактировать их рекомендуется встроенным редактором.

### Редактор локализаций
1. Меню **Yandex.Games SDK** → **Localization Editor** (Редактор локализации).
2. Слева вверху кнопка **+ New** (Создать) → в модальном окне выбрать язык (список по ISO-кодам, например _English (en)_) → **Create JSON file!**.
3. Ввести JSON с ключами, например:

```json
{
    "title": "best game in the world 2"
}
```

4. Нажать **Save** (Сохранить). Кнопка **Open** открывает существующий файл. Список языков (например, `EN`) — в оглавлении слева.

### Способ 1: метод `l10n.t()`

```tsx
import { _decorator, Component, Label } from 'cc';
import { l10n } from 'db://yandex-games-sdk/ysdk';
const { ccclass, requireComponent } = _decorator;

@ccclass('ButtonLocalizationTest') // Название компонента.
@requireComponent(Label) // Зависимость от компонента Label.
export class ButtonLocalizationTest extends Component {
    onLoad() {
        const label = this.getComponent(Label); // Получаем компонент Label.
        label.string = l10n.t('title'); // Устанавливаем текст Label по ключу.
    }
}
```

Создайте узел с `Label` на сцене и перетащите компонент на узел. При запуске (Play) текст заменится на локализованное значение.

### Способ 2: готовый компонент `L10nLabel`
- **Add Component** на нужном узле → группа **YandexGamesSDK** → **L10nLabel**.
- В поле **Key** (Ключ) указать ключ перевода.
- Значение отображается **прямо в редакторе** и обновляется автоматически при сохранении в редакторе переводов — пересобирать проект не нужно.

Язык выбирается плагином по языку платформы (`ysdk.environment.i18n.lang`).

## 6. Тестирование: сборка и запуск с локального сервера

Игру можно запускать на платформе с локального сервера. Нужен **черновик игры** в Консоли Яндекс Игр: https://yandex.ru/dev/games/console/add-new-game.md

### Сборка
1. **Project** → **Build** (Проект → Сборка).
2. **New Build Task** (Новая задача сборки) → настроить параметры. Рекомендуется включить **Source Maps** и **Debug**.
3. Нажать **Build**. Результат:

```text
Project name/
└── build/
    └── debug/
        ├── ...
        └── index.html
```

### Локальный сервер
Подробно: https://yandex.ru/dev/games/concepts/local-launch.md (HTTPS-сервер, раздающий папку сборки на порту 6577).

### Запуск
Открыть, где `XXXXXX` — код черновика:

```text
https://yandex.ru/games/app/XXXXXX?draft=true&game_url=https://localhost:6577
```

Чтобы проверить новую версию: снова нажать **Build** в той же задаче (параметры не менять) и после `Build success` обновить страницу.

## 7. Подводные камни

- Без сгенерированных шаблонов (`build-templates/web-desktop`, `build-templates/web-mobile`, `preview-template`) SDK не подключится в `index.html` — `ysdk` будет недоступен в сборке и превью.
- Путь импорта именно `db://yandex-games-sdk/ysdk` (и для `ysdk`, и для `l10n`), а не `cc` или относительный путь.
- `ysdk` — тот же объект, что в HTML5 SDK: методы camelCase (`showRewardedVideo`, `getPlayer`, `setScore`), не snake_case.
- Пример в документации с `_decorator` без импорта не компилируется — см. замечание в разделе 3.
- Платформенная реклама/покупки/лидерборды работают только при запуске через `yandex.ru/games/app/...?draft=true&game_url=...`, не в чистом превью Cocos.

## 8. Поддержка

- Репозиторий: https://github.com/yandex-games-plugins/cocos
- Сообщество в Телеграме: https://t.me/yagamedev/1476038
- Сообщество ВКонтакте: https://vk.ru/yandexgmsdev
