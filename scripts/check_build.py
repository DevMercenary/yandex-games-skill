#!/usr/bin/env python3
"""Проверка билда для Яндекс Игр и упаковка в ZIP.

    python check_build.py <build_dir>              # только проверка
    python check_build.py <build_dir> --zip game.zip   # проверка + архив
    python check_build.py --selftest

Проверяет требования к архиву (п. 1.21, 1.22) и типовые причины отказа модерации по исходникам.
Коды выхода: 0 — ок (возможны WARN), 1 — есть ERROR.
"""
import os
import re
import sys
import zipfile
import tempfile

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

MAX_UNPACKED = 100 * 1024 * 1024  # п. 1.21
TEXT_EXT = {'.html', '.htm', '.js', '.mjs', '.ts', '.json', '.css'}
SKIP_DIRS = {'.git', 'node_modules', '__pycache__'}

# ponytail: regex-эвристики по исходникам, не парсер. Ловят типовые ошибки, не доказывают корректность.
CHECKS = [
    # (regex, уровень, сообщение, "должно быть найдено"?)
    (r'YaGames\.init\(', 'ERROR', 'нет YaGames.init() — SDK не инициализируется (п. 1.1)', True),
    (r'LoadingAPI\??\.ready\(', 'ERROR', 'нет LoadingAPI.ready() — Game Ready обязателен (п. 1.19.2)', True),
    (r'i18n\??\.lang', 'ERROR', 'нет ysdk.environment.i18n.lang — автоопределение языка обязательно (п. 2.14)', True),
    (r'game_api_pause', 'WARN', 'нет подписки на game_api_pause — звук/геймплей не встанут на паузу при рекламе и потере фокуса (п. 1.3, 4.7)', True),
    (r'GameplayAPI\??\.start\(', 'WARN', 'нет GameplayAPI.start()/stop() — разметка геймплея не обязательна, но улучшает рекомендации; если есть — её проверяют (п. 1.19.3)', True),
    (r'<audio[\s>]|<video[\s>]|new\s+Audio\(', 'WARN', '<audio>/<video>/new Audio() вызывают системный плеер браузера — используйте Web Audio API (п. 1.6.1.6)', False),
    (r'youtube\.com|youtu\.be', 'ERROR', 'интеграция YouTube запрещена (п. 3.9)', False),
    (r'https?://[a-z0-9.-]*s3\.yandex\.net/(?!sdk\.js)', 'WARN', 'абсолютные URL на S3 Яндекса запрещены (п. 1.7)', False),
    (r'window\.open\(|target=["\']_blank', 'WARN', 'внешние ссылки запрещены (п. 8.4.2); ссылки на свои игры — только через GamesAPI', False),
    (r'setInterval\([\s\S]{0,120}?showFullscreenAdv', 'ERROR', 'реклама по setInterval — фрод-паттерн, отказ (п. 4.4)', False),
    (r'["\'](demo|beta|в разработке|trial version|coming soon)["\']', 'WARN', 'следы незавершённости в строках (п. 1.15)', False),
    (r'debugger;|console\.log\(', 'INFO', 'отладочный вывод в билде (п. 6.4 рекомендует чистую консоль)', False),
]


def iter_files(root):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for f in filenames:
            yield os.path.join(dirpath, f)


def check(build_dir):
    errors, warns, infos = [], [], []
    build_dir = os.path.abspath(build_dir)
    if not os.path.isdir(build_dir):
        return [f'папка не найдена: {build_dir}'], [], []

    index = os.path.join(build_dir, 'index.html')
    if not os.path.isfile(index):
        errors.append('в корне нет index.html (п. 1.22)')

    total = 0
    sources = []
    engine_build = False  # Unity/Godot и т. п.: JS лежит в .br/.gz/.wasm, по тексту не проверить
    for path in iter_files(build_dir):
        rel = os.path.relpath(path, build_dir).replace(os.sep, '/')
        total += os.path.getsize(path)
        if rel.lower().endswith(('.js.br', '.js.gz', '.wasm', '.wasm.br', '.wasm.gz', '.data', '.data.br', '.pck')):
            engine_build = True
        if ' ' in rel:
            errors.append(f'пробел в имени: {rel} (п. 1.22)')
        if re.search(r'[^\x00-\x7f]', rel):
            errors.append(f'не-ASCII символы в имени: {rel} (п. 1.22)')
        if rel.lower() in ('sdk.js',) or rel.lower().endswith('/sdk.js'):
            errors.append(f'{rel}: sdk.js нельзя класть в архив — подключайте /sdk.js с сервера Яндекса')
        if os.path.splitext(rel)[1].lower() in TEXT_EXT:
            try:
                with open(path, 'r', encoding='utf-8', errors='ignore') as fh:
                    sources.append((rel, fh.read()))
            except OSError:
                pass

    if total > MAX_UNPACKED:
        errors.append(f'размер билда {total / 1024 / 1024:.1f} МБ > 100 МБ (п. 1.21)')
    else:
        infos.append(f'размер билда {total / 1024 / 1024:.1f} МБ')

    html = [s for s in sources if s[0].lower().endswith(('.html', '.htm'))]
    index_src = next((s for s in html if s[0] == 'index.html'), None)
    if index_src:
        src = index_src[1]
        if re.search(r'<script[^>]+src=["\']/sdk\.js["\']', src):
            pass
        elif re.search(r'sdk\.games\.s3\.yandex\.net/sdk\.js', src):
            warns.append('index.html: абсолютный путь к SDK — допустим только при размещении на своём домене; для архива нужен "/sdk.js"')
        elif re.search(r'sdk\.js', '\n'.join(s[1] for s in sources)):
            warns.append('SDK подключается динамически — убедитесь, что src = "/sdk.js" и init вызывается после onload')
        else:
            errors.append('index.html: нет <script src="/sdk.js"> (п. 1.1)')
        if not re.search(r'<meta[^>]+name=["\']viewport["\']', src, re.I):
            warns.append('index.html: нет <meta name="viewport"> — на мобильных будет зум и скролл (п. 1.10.2)')
        tag = re.search(r'<script[^>]+src=["\']/sdk\.js["\'][^>]*onload=["\'](\w+)', src)
        if tag:
            decl = re.search(r'function\s+' + tag.group(1) + r'\b|(const|let|var)\s+' + tag.group(1) + r'\b', src)
            if decl and decl.start() > tag.start():
                warns.append(f'index.html: тег /sdk.js с onload="{tag.group(1)}()" стоит раньше объявления {tag.group(1)} — '
                             'кешированный sdk.js вызовет ReferenceError; перенесите тег SDK в конец <body>')

    def strip_comments(src):  # комментарии не считаем: иначе ложные срабатывания на пояснениях
        src = re.sub(r'<!--[\s\S]*?-->', '', src)
        src = re.sub(r'/\*[\s\S]*?\*/', '', src)
        return re.sub(r'(?m)^\s*//.*$', '', src)
    sources = [(rel, strip_comments(s)) for rel, s in sources]
    all_src = '\n'.join(s[1] for s in sources)
    if engine_build:
        infos.append('билд движка (сжатые .br/.gz/.wasm): вызовы SDK внутри не проверяются — подтвердите Game Ready, 文 и ▶️ на debug-панели')
    for rx, level, msg, must in CHECKS:
        found = re.search(rx, all_src, re.I)
        if must and not found:
            if engine_build:
                continue
            {'ERROR': errors, 'WARN': warns, 'INFO': infos}[level].append(msg)
        elif not must and found:
            where = next(rel for rel, s in sources if re.search(rx, s, re.I))
            {'ERROR': errors, 'WARN': warns, 'INFO': infos}[level].append(f'{msg} [{where}]')

    if re.search(r'localStorage', all_src) and not re.search(r'setData\(|setStats\(', all_src):
        warns.append('прогресс только в localStorage: допустимо без инап-покупок; с покупками обязательны облачные сохранения (п. 1.13.3)')
    if re.search(r'showRewardedVideo', all_src) and not re.search(r'onRewarded', all_src):
        errors.append('showRewardedVideo без onRewarded — награда должна начисляться только в onRewarded')
    return errors, warns, infos


def make_zip(build_dir, out):
    build_dir = os.path.abspath(build_dir)
    out = os.path.abspath(out)
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for path in iter_files(build_dir):
            if path == out:  # архив лежит внутри билда — себя не упаковываем
                continue
            z.write(path, os.path.relpath(path, build_dir).replace(os.sep, '/'))
    return os.path.getsize(out)


def selftest():
    with tempfile.TemporaryDirectory() as d:
        bad = os.path.join(d, 'bad'); os.makedirs(bad)
        with open(os.path.join(bad, 'my game.js'), 'w') as f:
            f.write('setInterval(() => ysdk.adv.showFullscreenAdv(), 1000)')
        e, w, i = check(bad)
        assert any('index.html' in x for x in e), e
        assert any('пробел' in x for x in e), e
        assert any('setInterval' in x for x in e), e

        good = os.path.join(d, 'good'); os.makedirs(good)
        with open(os.path.join(good, 'index.html'), 'w', encoding='utf-8') as f:
            f.write('<meta name="viewport" content="width=device-width"><script src="/sdk.js"></script>'
                    '<script>YaGames.init().then(ysdk=>{ysdk.environment.i18n.lang;'
                    'ysdk.on("game_api_pause",()=>{});ysdk.features.LoadingAPI.ready();})</script>')
        e, w, i = check(good)
        assert not e, e
        out = os.path.join(d, 'g.zip'); make_zip(good, out)
        assert zipfile.ZipFile(out).namelist() == ['index.html']

        assert main([good, '--zip']) == 2, '--zip без имени файла должен давать код 2, а не падать'
        inside = os.path.join(good, 'g.zip')  # архив внутри билда не должен упаковывать сам себя
        for _ in range(2):                    # второй прогон — поверх уже существующего архива
            make_zip(good, inside)
            assert zipfile.ZipFile(inside).namelist() == ['index.html'], zipfile.ZipFile(inside).namelist()
    print('selftest ok')


def main(argv):
    if '--selftest' in argv:
        return selftest()
    if not argv or argv[0].startswith('-'):
        print(__doc__); return 2
    build_dir = argv[0]
    if '--zip' in argv and argv.index('--zip') + 1 >= len(argv):
        print('после --zip нужно имя архива: check_build.py <build_dir> --zip game.zip'); return 2
    errors, warns, infos = check(build_dir)
    for x in infos: print('INFO ', x)
    for x in warns: print('WARN ', x)
    for x in errors: print('ERROR', x)
    if errors:
        print(f'\n{len(errors)} ошибок — билд не готов к загрузке'); return 1
    if '--zip' in argv:
        out = argv[argv.index('--zip') + 1]
        size = make_zip(build_dir, out)
        print(f'OK    архив {out} ({size / 1024 / 1024:.1f} МБ)')
    else:
        print('OK    билд проходит проверки')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]) or 0)
