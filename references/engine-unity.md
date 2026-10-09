# Yandex Games SDK для Unity — Plugin Your Games 2.0 (PluginYG2)

Источник: раздел «Unity» официальной документации Яндекс Игр (видеокурс из 10 уроков). Эти страницы — указатель на документацию **стороннего** плагина Plugin Your Games 2.0; весь C#-API, шаги установки и настройки WebGL-билда живут в документации плагина на max-games.ru (ссылки ниже). Факты, которых нет в исходных страницах, здесь не додуманы — см. раздел 14 «Чего нет в этих страницах».

## Содержание
1. Что это за плагин
2. Установка и карта модулей
3. Реклама
4. Переменные окружения, авторизация, локализация
5. Облачные сохранения и данные игрока
6. Лидерборды
7. Инап-покупки
8. Метрики
9. Серверное время, оценка игры, ярлык на рабочий стол
10. Флаги (Remote Config) и ссылки на другие игры
11. Оптимизация и настройка билда
12. Требования к игре, на которые ссылаются страницы
13. Видеоуроки (ссылки)
14. Чего нет в этих страницах / где искать
15. Поддержка

---

## 1. Что это за плагин

- Название: **Plugin Your Games 2.0** (PluginYG2, «Plugin YG»). Это плагин сообщества (max-games), а не пакет от Яндекса. Официальные страницы Яндекс Игр для Unity — это видеокурс со ссылками на его документацию.
- Документация плагина: https://max-games.ru/plugin-yg/doc/
- Бесплатный, с открытым исходным кодом.
- **Модульная архитектура**: каждая функция (реклама, авторизация, лидерборды и т. д.) упакована в отдельный модуль; код неиспользуемых модулей не попадает в билд. Импортировать нужно только нужные модули.
- Заявлено, что интегрировать плагин в движок можно без написания кода (компоненты/префабы); C#-API описан в документации плагина.
- Плагин позволяет:
  - подключить лидерборды;
  - добавить рекламную монетизацию и инап-покупки;
  - включить облачные сохранения;
  - **протестировать проект в редакторе так, как если бы он был подключён к SDK Яндекс Игр** (эмуляция SDK без сборки WebGL).

## 2. Установка и карта модулей

Страницы Яндекса не описывают шаги установки (поддерживаемые версии Unity, способ импорта, WebGL-шаблон). Начинать с https://max-games.ru/plugin-yg/doc/ .

Карта модулей → документация модуля:

| Модуль / функция | Документация модуля |
|---|---|
| Полноэкранная реклама (interstitial) | https://max-games.ru/plugin-yg/doc/inter-ad/ |
| Видео за вознаграждение (rewarded) | https://max-games.ru/plugin-yg/doc/reward-ad/ |
| Стики-баннер (sticky) | https://max-games.ru/plugin-yg/doc/sticky-adv/ |
| Переменные окружения (Environment) | https://max-games.ru/plugin-yg/doc/envir/ |
| Авторизация (Authorization) | https://max-games.ru/plugin-yg/doc/auth/ |
| Языки / локализация игры (Lang) | https://max-games.ru/plugin-yg/doc/lang/ |
| Автоматический перевод (Google Переводчик) | https://max-games.ru/plugin-yg/doc/lang/#Auto_Translate_Langs |
| Сохранение прогресса (Storage) | https://max-games.ru/plugin-yg/doc/storage/ |
| Player Stats (численные данные игрока) | https://max-games.ru/plugin-yg/doc/storage/#Player_Stats |
| Лидерборды (Leaderboards) | https://max-games.ru/plugin-yg/doc/lb/ |
| Инап-покупки (Payments) | https://max-games.ru/plugin-yg/doc/pay/ |
| Яндекс Метрика (Metrica) | https://max-games.ru/plugin-yg/doc/metrica/ |
| Серверное время | https://max-games.ru/plugin-yg/doc/server-time/ |
| Оценка игры (Review) | https://max-games.ru/plugin-yg/doc/review/ |
| Ярлык на рабочий стол (Game Label) | https://max-games.ru/plugin-yg/doc/game-label/ |
| Флаги / Remote Config (Flags) | https://max-games.ru/plugin-yg/doc/flags/ |
| Ссылки на другие игры (Open URL) | https://max-games.ru/plugin-yg/doc/open-url/ |

Зависимости между модулями, указанные в страницах:

| Что хотите | Какие модули нужны |
|---|---|
| Лидерборды | **Leaderboards** + **Authorization** |
| Инап-покупки | **Payments** + **Authorization** + настроенное сохранение (рекомендуется **Player Stats**) |
| Данные пользователя (ник, аватар) | **Authorization** |

## 3. Реклама

Общая статья по монетизации: https://yandex.ru/dev/games/console/adv-monetization.md

Плагин поддерживает три вида рекламы:

| Вид | Когда показывать | Статья Яндекса | Модуль плагина |
|---|---|---|---|
| Полноэкранная (interstitial) | В логических паузах (переход между уровнями, выход в меню) | https://yandex.ru/dev/games/console/adv-monetization.md#interstitial | https://max-games.ru/plugin-yg/doc/inter-ad/ |
| Видео за вознаграждение (rewarded) | По явному действию игрока; ему должно быть понятно, что он смотрит рекламу и что получит взамен | https://yandex.ru/dev/games/console/adv-monetization.md#rewarded | https://max-games.ru/plugin-yg/doc/reward-ad/ |
| Стики-баннер | По краям экрана в течение игры | https://yandex.ru/dev/games/console/adv-monetization.md#sticky | https://max-games.ru/plugin-yg/doc/sticky-adv/ |

Правила:
- Подключение рекламной монетизации **обязательно** — пункт 1.12 Требований: https://yandex.ru/dev/games/concepts/requirements.md#1-12
- **Нельзя** подключать стороннюю рекламу — пункт 1.16: https://yandex.ru/dev/games/concepts/requirements.md#1-16
- Показ рекламы регламентирован разделом 4 Требований: https://yandex.ru/dev/games/concepts/requirements.md#4
- После настройки рекламу можно протестировать средствами плагина (эмуляция в редакторе).

## 4. Переменные окружения, авторизация, локализация

Три отдельных модуля:

- **Переменные окружения** (https://max-games.ru/plugin-yg/doc/envir/) — данные от SDK платформы об устройстве пользователя: язык, операционная система, браузер и т. п.
- **Авторизация** (https://max-games.ru/plugin-yg/doc/auth/) — нужна для лидербордов и платежей; даёт данные пользователя (ник, аватар). Модуль обязателен для модулей Leaderboards и Payments.
  - Игра **должна быть доступна и без авторизации** — пункт 1.2: https://yandex.ru/dev/games/concepts/requirements.md#1-2
- **Языки** (https://max-games.ru/plugin-yg/doc/lang/):
  - Управление локализациями игры: при определении языка платформы язык игры автоматически меняется на соответствующий.
  - Автоматический перевод через Google Переводчик: https://max-games.ru/plugin-yg/doc/lang/#Auto_Translate_Langs
  - Требования: игра должна быть переведена хотя бы на один язык, выбранный при заполнении черновика (пункт 8.2.3: https://yandex.ru/dev/games/concepts/requirements.md#8-2-3). Рекомендуется добавить локализации **ru, en, tr** (список языков: https://yandex.ru/dev/games/concepts/languages-and-domains.md#languages).
  - Если язык в игре выбирается вручную — см. пункт 6.9: https://yandex.ru/dev/games/concepts/requirements.md#6-9

## 5. Облачные сохранения и данные игрока

Модуль Storage: https://max-games.ru/plugin-yg/doc/storage/ (Player Stats: https://max-games.ru/plugin-yg/doc/storage/#Player_Stats)

- Данные о состоянии игры (пройденные уровни, опыт, инап-покупки и т. д.) можно хранить на сервере Яндекса или передавать на свой сервер.
- Можно персонализировать игру данными профиля (например, именем).
- Сохранение прогресса **обязательно**, если:
  - игрок должен продолжить игру после обновления страницы, не теряя достижения/рекорды (пояснение к 1.9: https://yandex.ru/dev/games/requirements/1/9.md);
  - в игре есть движение по сюжету, постепенное прохождение уровней или постановка рекордов;
  - игра бесконечная (пункт 1.9: https://yandex.ru/dev/games/concepts/requirements.md#1-9).
- Если используете облачные сохранения — **укажите это в черновике игры** (пункт 1.11: https://yandex.ru/dev/games/concepts/requirements.md#1-11).

## 6. Лидерборды

- Импортировать модули **Leaderboards и Authorization**: https://max-games.ru/plugin-yg/doc/lb/
- **Создать лидерборд в Консоли разработчика**: https://yandex.ru/dev/games/concepts/leaderboards.md#create — без лидерборда с совпадающим техническим названием запросы работать не будут.

## 7. Инап-покупки

- Подключить в коде игры (модуль Payments): https://max-games.ru/plugin-yg/doc/pay/
- Подключить и добавить товары в Консоли: https://yandex.ru/dev/games/console/purchases.md#connect
- Чтобы покупки работали, **настройте сохранение** — рекомендуется модуль **Player Stats** (https://max-games.ru/plugin-yg/doc/storage/#Player_Stats): начисленный товар должен сохраняться в данных игрока.

## 8. Метрики

- Что такое метрики: https://yandex.ru/dev/games/concepts/metric.md
- Метрики монетизации, конверсии и часть других показываются в Консоли Яндекс Игр: https://games.yandex.ru/console
- Для своих событий: создать счётчик в Яндекс Метрике и добавить его в игру через модуль плагина: https://max-games.ru/plugin-yg/doc/metrica/

## 9. Серверное время, оценка игры, ярлык на рабочий стол

- **Серверное время** (https://max-games.ru/plugin-yg/doc/server-time/):
  - защита от накруток — игрок не может влиять на игру, меняя время на устройстве;
  - игровые события с доверенным источником времени: ежедневные/еженедельные бонусы, сезонные события, квесты.
- **Оценка игры** (https://max-games.ru/plugin-yg/doc/review/): запрос оценки/комментария. Запрос увидят **только авторизованные пользователи, которые ещё не оценивали игру**. Перед запросом **проверьте возможность оставить оценку**.
- **Ярлык на рабочий стол** (https://max-games.ru/plugin-yg/doc/game-label/): нативный диалог добавления ярлыка (ссылки на игру). Перед показом диалога **убедитесь, что опция доступна**.

## 10. Флаги (Remote Config) и ссылки на другие игры

- **Флаги** (https://max-games.ru/plugin-yg/doc/flags/): удалённое изменение данных игры без нового билда (характеристики персонажа, стоимость улучшений, баланс).
  - Эксперименты (A/B): пользователи делятся на группы, каждая видит свой вариант — https://yandex.ru/dev/games/console/vq-test.md
- **Ссылки на другие игры** (https://max-games.ru/plugin-yg/doc/open-url/): для расширения аудитории. В плагине есть **префаб** со списком доступных игр; показ каждой игры можно включать/выключать удалённо через флаги.

## 11. Оптимизация и настройка билда

Видеоурок 10 описывает методы оптимизации Unity-игры под веб-платформы и Яндекс Игры: как настроить билд, чтобы уменьшить его размер и повысить производительность (скорость отрисовки и отклика, FPS). Текстовая страница не содержит конкретных настроек — см. видео (раздел 13) и документацию плагина.

## 12. Требования к игре, на которые ссылаются страницы

| Пункт | Суть | Ссылка |
|---|---|---|
| 1.2 | Игра доступна без авторизации | https://yandex.ru/dev/games/concepts/requirements.md#1-2 |
| 1.9 | Сохранение прогресса (в т. ч. для бесконечных игр) | https://yandex.ru/dev/games/concepts/requirements.md#1-9 |
| 1.11 | Облачные сохранения указать в черновике | https://yandex.ru/dev/games/concepts/requirements.md#1-11 |
| 1.12 | Рекламная монетизация обязательна | https://yandex.ru/dev/games/concepts/requirements.md#1-12 |
| 1.16 | Нельзя подключать стороннюю рекламу | https://yandex.ru/dev/games/concepts/requirements.md#1-16 |
| 4 | Правила показа рекламы | https://yandex.ru/dev/games/concepts/requirements.md#4 |
| 6.9 | Ручной выбор языка в игре | https://yandex.ru/dev/games/concepts/requirements.md#6-9 |
| 8.2.3 | Перевод хотя бы на один язык из черновика | https://yandex.ru/dev/games/concepts/requirements.md#8-2-3 |

## 13. Видеоуроки (ссылки)

| № | Тема | Яндекс | YouTube |
|---|---|---|---|
| 1 | Знакомство и базовая функциональность | https://runtime.strm.yandex.ru/player/video/vplvloxadcmy4f3psxrr | https://youtu.be/juGa0-EG24k |
| 2 | Реклама в играх | https://runtime.strm.yandex.ru/player/video/vplvlc4zzcshcp4ztpey | https://youtu.be/B9J2G2hoXKA |
| 3 | Получение данных, авторизация, локализация | https://runtime.strm.yandex.ru/player/video/vplviwz6uirn3yuha6kz | https://youtu.be/olyTBkJJAfY |
| 4 | Облачные сохранения и работа с данными | https://runtime.strm.yandex.ru/player/video/vplv7lqkgm4gplipbdge | https://youtu.be/QCgXHR6sBIk |
| 5 | Таблицы лидеров | https://runtime.strm.yandex.ru/player/video/vplv57bgnn5xxafyyuoo | https://youtu.be/G3xiaG-HoqM |
| 6 | Инап-покупки | https://runtime.strm.yandex.ru/player/video/vplv5oo2g4pqsnyojx4r | https://youtu.be/pOvmbZtgSBw |
| 7 | Метрики | https://runtime.strm.yandex.ru/player/video/vplvsuch6vppvbewrqjo | https://youtu.be/XdYtMTFk7jg |
| 8 | Серверное время, награда за отзыв, ярлык | https://runtime.strm.yandex.ru/player/video/vplv7xfyz76ujqgqtb5o | https://youtu.be/JxiatIGGZq0 |
| 9 | Удалённая конфигурация, ссылки на другие игры | https://runtime.strm.yandex.ru/player/video/vplvoqtalwgkjt56frvi | https://youtu.be/prpPWD7_Cmo |
| 10 | Оптимизация и настройка Unity-проекта | https://runtime.strm.yandex.ru/player/video/vplvh5yojtlrn6p432j3 | https://youtu.be/NhWP7Og8kPk |

Текстовые страницы уроков: https://yandex.ru/dev/games/doc/ru/advertisement.md, env-auth-lang.md, progress-saving.md, leaderboards.md, inaps.md, metrics.md, other.md, flags-links.md, setting-up.md (тот же префикс).

## 14. Чего нет в этих страницах / где искать

Официальные страницы Яндекс Игр для Unity **не содержат**:
- имён C#-классов, методов, событий и порядка инициализации плагина;
- названия WebGL-шаблона, настроек Player Settings (compression, memory, decompression fallback и т. п.), поддерживаемых версий Unity;
- инструкций по локальному запуску/тестированию WebGL-билда;
- кода для разметки Game Ready / Gameplay, событий паузы/резюма.

Где брать:
- C#-API, установка, шаблон, настройки билда, тестирование — документация плагина: https://max-games.ru/plugin-yg/doc/ (по модулям — таблица в разделе 2). Проверяйте актуальную версию плагина: обновления публикуются в https://t.me/pluginYG2 .
- Семантика методов (что обязан вызывать любой билд: `LoadingAPI.ready()`, `GameplayAPI.start()/stop()`, лимит счёта в лидерборд 1 запрос/сек, обработка `purchase_token`, `can_review` перед `request_review` и т. д.) одинакова для всех движков — см. справочники по HTML5 SDK в этой папке; плагин оборачивает те же методы `ysdk.*`.
- Не выдумывайте имена классов/методов плагина по памяти — у PluginYG 1.x и 2.0 они различаются; сверяйтесь с документацией нужной версии.

## 15. Поддержка

- Телеграм-канал плагина (обновления модулей): https://t.me/pluginYG2
- Чат плагина (вопросы): https://t.me/pluginYG
