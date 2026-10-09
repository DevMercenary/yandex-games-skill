# yandex-games — Claude Code skill для публикации игр на Яндекс Играх

Скилл для [Claude Code](https://claude.com/claude-code) (и любых агентов, поддерживающих формат [Agent Skills](https://agentskills.io)), который даёт агенту **полные требования и инструкции Яндекс Игр**: интеграция SDK, модерация, сборка архива, Консоль разработчика, локальный запуск, плагины для Unity / Cocos Creator / Construct 3 / Defold, LiveOps и аналитика.

Собран из официальной документации https://yandex.ru/dev/games/doc/ru/ (все 129 страниц, состояние на октябрь 2026) и сконденсирован так, чтобы агент делал всё правильно с первого раза, а не после отказа модерации.

## Что внутри

```
yandex-games/
├── SKILL.md                      # рабочий процесс + 12 обязательных требований + типовые ошибки
├── references/
│   ├── sdk-api.md                # полный справочник JS SDK (ysdk.*): сигнатуры, лимиты, ошибки
│   ├── requirements-details.md   # что именно проверяет модератор по каждому пункту требований
│   ├── console-publishing.md     # аккаунт, договор (ЕЛС/РСЯ), поля черновика с лимитами, модерация
│   ├── testing-debug.md          # sdk-dev-proxy, режим черновика, debug-панель, Performance
│   ├── engine-unity.md           # плагин и настройки WebGL для Unity
│   ├── engine-cocos.md           # Cocos Creator
│   ├── engine-construct3.md      # Construct 3
│   ├── engine-defold.md          # Defold
│   └── liveops-analytics.md      # метрики, Яндекс Метрика, A/B, флаги, эксперименты, промо
├── assets/
│   ├── index.html                # шаблон страницы: CSS под требования, порядок загрузки SDK
│   ├── yg.js                     # обёртка SDK: пауза/резюм, реклама, сохранения, покупки
│   └── audio.js                  # звук через Web Audio API (без системного плеера)
└── scripts/
    └── check_build.py            # проверка билда по требованиям + упаковка в ZIP
```

## Установка

**Claude Code (пользовательский скилл):**

```bash
git clone https://github.com/DevMercenary/yandex-games-skill ~/.claude/skills/yandex-games
```

Windows:

```powershell
git clone https://github.com/DevMercenary/yandex-games-skill "$env:USERPROFILE\.claude\skills\yandex-games"
```

**В проект** (скилл только для этого репозитория): клонируйте в `.claude/skills/yandex-games`.

После этого Claude Code сам подхватит скилл, когда речь зайдёт о Яндекс Играх, ysdk, sdk.js, модерации и т. п. Вызвать явно: `/yandex-games`.

## Использование

```
Подготовь мою игру в папке game/ к публикации на Яндекс Играх: SDK, реклама между раундами,
облачные сохранения, автоопределение языка, zip для Консоли.
```

```
python scripts/check_build.py ./build --zip game.zip
```

## Обновление под новую версию документации

Документация Яндекса доступна в машиночитаемом виде: индекс `https://yandex.ru/dev/games/doc/ru/llms.txt`, полный дамп `https://yandex.ru/dev/games/doc/ru/llms-full.txt`. Справочники в `references/` сконденсированы из этого дампа; при изменении требований обновляйте соответствующий файл.

## Лицензия

MIT. Документация Яндекс Игр принадлежит ООО «Яндекс»; здесь она пересказана в справочных целях.
