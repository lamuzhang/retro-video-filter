/* =========================================================================
 * exporter.js — 导出管线
 * 首选: WebCodecs + mediabunny(解封装 → 逐帧调色 → CanvasSource 内部走
 *        VideoEncoder 硬件编码 H.264 → MP4 封装),音频尝试 AAC/Opus 重编码。
 * 降级: MediaRecorder 录制 canvas.captureStream + video.captureStream 音轨
 *        (WebM,需完整播放一遍)。
 * ========================================================================= */

'use strict';

const MEDIABUNNY_URL = 'https://cdn.jsdelivr.net/npm/mediabunny@1/+esm';

const ExportSupport = (() => {
  const webcodecs = typeof VideoEncoder !== 'undefined';
  const mediarecorder = typeof MediaRecorder !== 'undefined';
  return { webcodecs, mediarecorder, any: webcodecs || mediarecorder };
})();

function suggestBitrate(w, h, fps) {
  return Math.max(1_000_000, Math.min(45_000_000, Math.round(w * h * fps * 0.15)));
}

/* WebCodecs 路径:离线逐帧解码,速度快于实时播放 */
async function exportWebCodecs(file, values, graderFactory, onProgress, isCancelled) {
  const mb = await import(MEDIABUNNY_URL);

  const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
  const vTrack = await input.getPrimaryVideoTrack();
  if (!vTrack || !(await vTrack.canDecode())) throw new Error('video track not decodable');

  const duration = await vTrack.computeDuration();
  let fps = 30;
  try {
    const stats = await vTrack.computePacketStats();
    if (stats.averagePacketRate > 1 && stats.averagePacketRate < 240) fps = stats.averagePacketRate;
  } catch (e) { /* 帧率估计失败时用 30fps 估算码率,不影响正确性 */ }

  const srcW = vTrack.displayWidth, srcH = vTrack.displayHeight;
  const w = srcW - (srcW % 2), h = srcH - (srcH % 2); // H.264 yuv420 要求偶数尺寸

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const grader = graderFactory(canvas, w, h);

  const output = new mb.Output({
    format: new mb.Mp4OutputFormat({ fastStart: 'in-memory' }),
    target: new mb.BufferTarget(),
  });
  const vSource = new mb.CanvasSource(canvas, {
    codec: 'avc',
    bitrate: suggestBitrate(w, h, fps),
  });
  output.addVideoTrack(vSource, { frameRate: fps });

  /* 音频:优先 AAC(MP4 通用),退 Opus;都不可编码则导出无声并告知 UI */
  let aSource = null, aSink = null, audioIncluded = false;
  const aTrack = await input.getPrimaryAudioTrack();
  if (aTrack && (await aTrack.canDecode())) {
    const codec = await mb.getFirstEncodableAudioCodec(['aac', 'opus'], {
      numberOfChannels: aTrack.numberOfChannels,
      sampleRate: aTrack.sampleRate,
      bitrate: 192_000,
    });
    if (codec) {
      aSource = new mb.AudioBufferSource({ codec, bitrate: 192_000 });
      output.addAudioTrack(aSource);
      aSink = new mb.AudioBufferSink(aTrack);
      audioIncluded = true;
    }
  }

  await output.start();

  /* CanvasSink 默认应用旋转元数据,并直接按偶数尺寸出帧;
     wrapped.canvas 作为 texImage2D 源直接送入调色,无需中间 2D 拷贝 */
  const sink = new mb.CanvasSink(vTrack, { alpha: false, width: w, height: h, fit: 'fill', poolSize: 4 });
  for await (const wrapped of sink.canvases()) {
    if (isCancelled()) { await output.cancel(); throw new ExportCancelled(); }
    grader.render(wrapped.canvas, values, false);
    await vSource.add(wrapped.timestamp, wrapped.duration);
    onProgress(Math.min(1, (wrapped.timestamp + wrapped.duration) / duration));
  }
  vSource.close();

  if (aSource && aSink) {
    for await (const wrapped of aSink.buffers()) {
      if (isCancelled()) { await output.cancel(); throw new ExportCancelled(); }
      await aSource.add(wrapped.buffer);
    }
    aSource.close();
  }

  await output.finalize();
  const buf = output.target.buffer;
  return { blob: new Blob([buf], { type: 'video/mp4' }), ext: 'mp4', mode: 'webcodecs', audioIncluded };
}

class ExportCancelled extends Error {
  constructor() { super('export cancelled'); this.name = 'ExportCancelled'; }
}

/* MediaRecorder 降级路径:实时播放并录制,WebM 容器 */
function exportMediaRecorder(videoEl, grader, canvas, values, onProgress, isCancelled) {
  return new Promise((resolve, reject) => {
    const fps = 30;
    const stream = canvas.captureStream(fps);
    let audioIncluded = false;
    const vStream = videoEl.captureStream ? videoEl.captureStream() : null;
    if (vStream) {
      for (const t of vStream.getAudioTracks()) { stream.addTrack(t); audioIncluded = true; }
    }

    const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp9',
                  'video/webm;codecs=vp8,opus', 'video/webm']
      .find((m) => MediaRecorder.isTypeSupported(m)) || '';
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 12_000_000 } : undefined);
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    rec.onerror = () => { cleanup(); reject(rec.error || new Error('MediaRecorder error')); };

    let rafId = 0;
    const draw = () => {
      if (isCancelled()) { cleanup(); rec.stop(); reject(new ExportCancelled()); return; }
      grader.render(videoEl, values, false);
      onProgress(videoEl.duration ? videoEl.currentTime / videoEl.duration : 0);
      rafId = requestAnimationFrame(draw);
    };
    const onEnded = () => { cleanup(); rec.stop(); };
    const cleanup = () => {
      cancelAnimationFrame(rafId);
      videoEl.removeEventListener('ended', onEnded);
    };
    rec.onstop = () => {
      resolve({ blob: new Blob(chunks, { type: 'video/webm' }), ext: 'webm', mode: 'mediarecorder', audioIncluded });
    };

    videoEl.addEventListener('ended', onEnded);
    videoEl.loop = false;
    videoEl.currentTime = 0;
    rec.start(500);
    draw();
    videoEl.play().catch((e) => { cleanup(); rec.stop(); reject(e); });
  });
}

async function exportVideo(opts) {
  const { file, videoEl, values, graderFactory, onProgress, isCancelled } = opts;
  if (ExportSupport.webcodecs) {
    try {
      return await exportWebCodecs(file, values, graderFactory, onProgress, isCancelled);
    } catch (e) {
      if (e instanceof ExportCancelled) throw e;
      if (!ExportSupport.mediarecorder) throw e;
      onProgress(-1); // 通知 UI 切换到降级模式并重置进度
    }
  }
  const canvas = document.createElement('canvas');
  const w = videoEl.videoWidth, h = videoEl.videoHeight;
  canvas.width = w - (w % 2); canvas.height = h - (h % 2);
  const grader = graderFactory(canvas, canvas.width, canvas.height);
  return exportMediaRecorder(videoEl, grader, canvas, values, onProgress, isCancelled);
}
