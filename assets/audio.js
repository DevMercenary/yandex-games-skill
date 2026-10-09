/* audio.js — звук через Web Audio API. <audio>/<video>/new Audio() запрещены:
 * они регистрируют медиасессию и браузер показывает системный плеер (п. 1.6.1.6 / 1.6.2.5). */
window.GameAudio = (() => {
    // Контекст создаётся лениво: иначе Chrome пишет предупреждение до первого жеста пользователя.
    let ctx = null, master = null, muted = false;
    const buffers = {};
    let music = null;
    function ensure() {
        if (ctx) return ctx;
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain();
        master.gain.value = muted ? 0 : 1;
        master.connect(ctx.destination);
        return ctx;
    }

    async function load(name, url) {
        const res = await fetch(url);
        buffers[name] = await ensure().decodeAudioData(await res.arrayBuffer());
    }
    function play(name, { loop = false, volume = 1 } = {}) {
        const buf = buffers[name];
        if (!buf) return null;
        ensure();
        const src = ctx.createBufferSource();
        const gain = ctx.createGain();
        src.buffer = buf; src.loop = loop; gain.gain.value = volume;
        src.connect(gain).connect(master);
        src.start();
        return src;
    }
    function playMusic(name) { stopMusic(); music = play(name, { loop: true, volume: 0.5 }); }
    function stopMusic() { if (music) { try { music.stop(); } catch (e) {} music = null; } }
    // Для game_api_pause / game_api_resume: suspend/resume останавливает ВСЁ (п. 1.3, 4.7)
    function pause() { if (ctx && ctx.state === 'running') ctx.suspend(); }
    function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }
    // Вызывать по первому клику/тапу: браузеры стартуют AudioContext только после жеста пользователя
    function unlock() { if (ensure().state === 'suspended') ctx.resume(); }
    function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 1; }

    return { load, play, playMusic, stopMusic, pause, resume, unlock, setMuted, get ctx() { return ctx; } };
})();
