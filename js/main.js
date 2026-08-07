/* main.js — UI 装配与交互:上传 / 预览 / 参数面板 / 预设 / 导出 */

'use strict';

(function () {
  const $ = (id) => document.getElementById(id);
  const video = $('src-video');
  const canvas = $('preview-canvas');
  const dropzone = $('dropzone');
  const fileInput = $('file-input');

  const state = {
    values: buildValues(defaultPreset()),
    bypass: false,
    exporting: false,
    cancelled: false,
    file: null,
    fileName: 'video',
  };

  let grader = null;
  try {
    grader = new Grader(canvas);
  } catch (e) {
    $('engine-badge').textContent = '需要支持 WebGL2 的浏览器(推荐 Chrome)';
    $('engine-badge').style.color = 'var(--danger)';
    return;
  }

  /* ---------- 预览渲染循环 ---------- */
  function renderOnce() {
    if (!state.file || video.readyState < 2) return;
    grader.render(video, state.values, state.bypass);
  }

  const hasRVFC = 'requestVideoFrameCallback' in HTMLVideoElement.prototype;
  function startLoop() {
    if (hasRVFC) {
      const onFrame = () => {
        renderOnce();
        video.requestVideoFrameCallback(onFrame);
      };
      video.requestVideoFrameCallback(onFrame);
    } else {
      const tick = () => {
        if (!video.paused) renderOnce();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      video.addEventListener('seeked', renderOnce);
    }
  }

  function fitCanvas() {
    if (!video.videoWidth) return;
    const stage = $('stage');
    const box = stage.getBoundingClientRect();
    const scale = Math.min(box.width / video.videoWidth, box.height / video.videoHeight);
    const w = Math.max(2, Math.floor(video.videoWidth * scale));
    const h = Math.max(2, Math.floor(video.videoHeight * scale));
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    grader.resize(w, h);
    renderOnce();
  }

  /* ---------- 文件加载 ---------- */
  function loadFile(file) {
    if (!file) return;
    if (file.size > 500 * 1024 * 1024) {
      $('stage-hint').textContent = '注意:文件超过 500MB,解码与导出可能较慢或受内存限制。';
    } else {
      $('stage-hint').textContent = '';
    }
    state.file = file;
    state.fileName = file.name.replace(/\.[^.]+$/, '') || 'video';
    video.src = URL.createObjectURL(file);
    video.loop = true;
    video.muted = false;
  }

  video.addEventListener('loadedmetadata', () => {
    dropzone.hidden = true;
    $('controls').hidden = false;
    $('panel').hidden = false;
    $('btn-export').disabled = !ExportSupport.any;
    $('time-dur').textContent = fmtTime(video.duration);
    fitCanvas();
    video.play().catch(() => { /* 自动播放被拒时保持暂停,用户手动点播放 */ });
    syncPlayIcon();
  });

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); });
  fileInput.addEventListener('change', () => loadFile(fileInput.files[0]));
  ['dragenter', 'dragover'].forEach((ev) => dropzone.addEventListener(ev, (e) => {
    e.preventDefault(); dropzone.classList.add('dragover');
  }));
  ['dragleave', 'drop'].forEach((ev) => dropzone.addEventListener(ev, (e) => {
    e.preventDefault(); dropzone.classList.remove('dragover');
  }));
  dropzone.addEventListener('drop', (e) => {
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    loadFile(f);
  });
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => e.preventDefault());
  window.addEventListener('resize', fitCanvas);

  /* ---------- 播放控制 ---------- */
  function syncPlayIcon() {
    $('icon-play').hidden = !video.paused;
    $('icon-pause').hidden = video.paused;
  }
  $('btn-play').addEventListener('click', () => {
    if (video.paused) video.play(); else video.pause();
  });
  video.addEventListener('play', syncPlayIcon);
  video.addEventListener('pause', syncPlayIcon);

  const seek = $('seek');
  let scrubbing = false;
  video.addEventListener('timeupdate', () => {
    $('time-cur').textContent = fmtTime(video.currentTime);
    if (!scrubbing && video.duration) {
      setRangeFill(seek, (video.currentTime / video.duration) * 100);
      seek.value = Math.round((video.currentTime / video.duration) * 1000);
    }
  });
  seek.addEventListener('input', () => {
    scrubbing = true;
    if (video.duration) video.currentTime = (seek.value / 1000) * video.duration;
    setRangeFill(seek, seek.value / 10);
  });
  seek.addEventListener('change', () => { scrubbing = false; });

  function fmtTime(s) {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60), ss = Math.floor(s % 60);
    return m + ':' + String(ss).padStart(2, '0');
  }

  function setRangeFill(input, pct) {
    input.style.setProperty('--fill', Math.max(0, Math.min(100, pct)) + '%');
  }

  /* ---------- 对比原片(按住) ---------- */
  const btnCompare = $('btn-compare');
  const setBypass = (on) => { state.bypass = on; renderOnce(); };
  btnCompare.addEventListener('pointerdown', () => setBypass(true));
  btnCompare.addEventListener('pointerup', () => setBypass(false));
  btnCompare.addEventListener('pointerleave', () => setBypass(false));

  /* ---------- 参数面板(由 params.js 配置表驱动) ---------- */
  const sliderRefs = {};
  function buildPanel() {
    const host = $('param-groups');
    for (const g of PARAM_GROUPS) {
      const sec = document.createElement('div');
      sec.className = 'param-group panel-section';
      const head = document.createElement('div');
      head.className = 'panel-section-head';
      const h2 = document.createElement('h2');
      h2.innerHTML = g.zh + ' <span class="en">' + g.en + '</span>';
      head.appendChild(h2);
      sec.appendChild(head);

      for (const p of PARAMS.filter((x) => x.group === g.id)) {
        const row = document.createElement('div');
        row.className = 'slider-row';

        const label = document.createElement('label');
        label.innerHTML = p.zh + '<span class="en">' + p.en + '</span>';

        const input = document.createElement('input');
        input.type = 'range';
        input.min = p.min; input.max = p.max; input.step = p.step;
        input.value = state.values[p.id];
        input.setAttribute('aria-label', p.zh + ' ' + p.en);

        const val = document.createElement('span');
        val.className = 'val';

        input.addEventListener('input', () => {
          state.values[p.id] = parseFloat(input.value);
          updateSliderUI(p, input, val);
          renderOnce();
        });
        input.addEventListener('dblclick', () => {
          state.values[p.id] = p.def;
          input.value = p.def;
          updateSliderUI(p, input, val);
          renderOnce();
        });

        row.appendChild(label); row.appendChild(input); row.appendChild(val);
        sec.appendChild(row);
        sliderRefs[p.id] = { input, val, p };
        updateSliderUI(p, input, val);
      }
      host.appendChild(sec);
    }
  }

  function updateSliderUI(p, input, val) {
    val.textContent = Number(state.values[p.id]).toFixed(p.decimals);
    setRangeFill(input, ((state.values[p.id] - p.min) / (p.max - p.min)) * 100);
  }

  function refreshAllSliders() {
    for (const id in sliderRefs) {
      const r = sliderRefs[id];
      r.input.value = state.values[id];
      updateSliderUI(r.p, r.input, r.val);
    }
  }

  /* ---------- 预设 ---------- */
  function buildPresets() {
    const grid = $('preset-grid');
    for (const preset of PRESETS) {
      const b = document.createElement('button');
      b.className = 'preset-btn' + (preset.isDefault ? ' active' : '');
      b.dataset.preset = preset.id;
      b.innerHTML = '<span class="zh">' + preset.zh + '</span><span class="en">' + preset.en + '</span>';
      b.addEventListener('click', () => {
        state.values = buildValues(preset);
        refreshAllSliders();
        renderOnce();
        grid.querySelectorAll('.preset-btn').forEach((x) => x.classList.toggle('active', x === b));
      });
      grid.appendChild(b);
    }
  }

  $('btn-reset').addEventListener('click', () => {
    const preset = defaultPreset();
    state.values = buildValues(preset);
    refreshAllSliders();
    renderOnce();
    document.querySelectorAll('.preset-btn').forEach((x) =>
      x.classList.toggle('active', x.dataset.preset === preset.id));
  });

  /* ---------- 导出 ---------- */
  const overlay = $('export-overlay');
  function setProgress(frac, startedAt) {
    const pct = Math.max(0, Math.min(100, Math.round(frac * 100)));
    $('export-fill').style.width = pct + '%';
    $('export-pct').textContent = pct + '%';
    if (frac > 0.02 && frac < 1) {
      const elapsed = (performance.now() - startedAt) / 1000;
      const eta = elapsed / frac - elapsed;
      $('export-eta').textContent = '预计剩余 ' + fmtTime(eta);
    } else {
      $('export-eta').textContent = '';
    }
  }

  function graderFactory(c, w, h) {
    const g = new Grader(c);
    g.gl.viewport(0, 0, w, h);
    return g;
  }

  $('btn-export').addEventListener('click', async () => {
    if (state.exporting || !state.file) return;
    state.exporting = true;
    state.cancelled = false;
    video.pause();

    const wasWebCodecs = ExportSupport.webcodecs;
    $('export-title').textContent = '正在导出…';
    $('export-mode').textContent = wasWebCodecs
      ? '管线:WebCodecs 硬件编码 → MP4 (H.264)'
      : '管线:MediaRecorder 实时录制 → WebM(已降级:此浏览器不支持 WebCodecs,需完整播放一遍)';
    $('export-note').textContent = '';
    $('export-note').className = 'export-note';
    $('download-link').hidden = true;
    $('btn-cancel-export').hidden = false;
    overlay.hidden = false;
    const startedAt = performance.now();
    setProgress(0, startedAt);

    try {
      const result = await exportVideo({
        file: state.file,
        videoEl: video,
        values: state.values,
        graderFactory,
        isCancelled: () => state.cancelled,
        onProgress: (f) => {
          if (f < 0) {
            $('export-mode').textContent = '管线:MediaRecorder 实时录制 → WebM(WebCodecs 编码失败,已自动降级,需完整播放一遍)';
            setProgress(0, performance.now());
            return;
          }
          setProgress(f, startedAt);
        },
      });

      setProgress(1, startedAt);
      const url = URL.createObjectURL(result.blob);
      const link = $('download-link');
      link.href = url;
      link.download = state.fileName + '-graded.' + result.ext;
      link.textContent = '下载 ' + link.download + ' (' + (result.blob.size / 1048576).toFixed(1) + ' MB)';
      link.hidden = false;
      $('btn-cancel-export').hidden = true;
      $('export-title').textContent = '导出完成';
      const notes = [];
      if (result.mode === 'mediarecorder') notes.push('已使用 MediaRecorder 降级管线,输出为 WebM。');
      if (!result.audioIncluded) notes.push('浏览器不支持音频重编码,成片为无声。');
      $('export-note').textContent = notes.join(' ');
      $('export-note').className = 'export-note' + (notes.length ? ' warn' : '');
    } catch (e) {
      if (e && e.name === 'ExportCancelled') {
        overlay.hidden = true;
      } else {
        $('export-title').textContent = '导出失败';
        $('export-note').textContent = String((e && e.message) || e);
        $('export-note').className = 'export-note warn';
        $('btn-cancel-export').hidden = true;
      }
    } finally {
      state.exporting = false;
      video.loop = true;
    }
  });

  $('btn-cancel-export').addEventListener('click', () => { state.cancelled = true; });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay && !state.exporting) overlay.hidden = true;
  });

  /* ---------- 启动 ---------- */
  if (!ExportSupport.webcodecs) {
    $('engine-badge').textContent = 'WebCodecs 不可用 · 导出将降级为 WebM 录制';
  }
  buildPanel();
  buildPresets();
  startLoop();
  window.__dbg = { state, grader, video, renderOnce };
})();
