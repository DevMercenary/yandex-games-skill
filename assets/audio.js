/* audio.js — звук через Web Audio API. <audio>/<video>/new Audio() запрещены:
 * они регистрируют медиасессию и браузер показывает системный плеер (п. 1.6.1.6 / 1.6.2.5). */
window.GameAudio = (() => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain();
    master.connect(ctx.destination);
    const buffers = {};
    let music = null;

    async function load(name, url) {
        const res = await fetch(url);
        buffers[name] = await ctx.decodeAudioData(await res.arrayBuffer());
    }
    function play(name, { loop = false, volume = 1 } = {}) {
        const buf = buffers[name];
        if (!buf) return null;
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
    function pause() { if (ctx.state === 'running') ctx.suspend(); }
    function resume() { if (ctx.state === 'suspended') ctx.resume(); }
    // Браузеры стартуют AudioContext только после жеста пользователя
    function unlock() { if (ctx.state === 'suspended') ctx.resume(); }
    function setMuted(muted) { master.gain.value = muted ? 0 : 1; }

    return { load, play, playMusic, stopMusic, pause, resume, unlock, setMuted, ctx };
})();
