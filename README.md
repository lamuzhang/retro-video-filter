# RetroGrade · 复古视频调色

**在线使用:https://rabbitrogi.github.io/retro-video-filter/**

纯静态单页视频调色工具:上传视频 → 自动套用「复古·清晰·鲜明」预设 → WebGL 实时调色 →
WebCodecs 硬件加速导出 MP4。零构建、零 npm、零后端,视频全程不出浏览器。

## 运行

```bash
python3 -m http.server 8000
# 打开 http://localhost:8000
```

直接双击 `index.html`(file://)也可用;导出走 WebCodecs 时需从 CDN 动态加载
mediabunny(jsdelivr,`Access-Control-Allow-Origin: *`,file:// 下亦可),若加载失败
自动降级 MediaRecorder。推荐用 http.server 以获得完全一致的行为。

## 文件结构

```
index.html      页面骨架
css/style.css   深色专业工具主题(DaVinci/Lightroom 风格),移动端上下布局
js/params.js    参数配置表(单一事实来源)+ 4 个预设
js/shader.js    GLSL ES 3.00 调色 shader(全部算法带注释)
js/renderer.js  WebGL2 渲染器(视频帧纹理 → 调色 → canvas)
js/exporter.js  导出管线(WebCodecs + mediabunny / MediaRecorder 降级)
js/main.js      UI 装配与交互
```

## CDN 依赖

| 依赖 | 地址 | 用途 |
|---|---|---|
| mediabunny | `https://cdn.jsdelivr.net/npm/mediabunny@1/+esm`(动态 import) | 解封装(demux)+ MP4 封装(mux)+ CanvasSource 内部驱动 VideoEncoder |
| Google Fonts | Sora / IBM Plex Mono / Noto Sans SC | 字体(可选,断网时回退系统字体) |

## 导出管线与取舍

1. **首选 WebCodecs 路径**:mediabunny 解封装源文件 → `CanvasSink` 逐帧吐 canvas →
   经 WebGL 调色 shader 渲染 → `CanvasSource`(内部 `VideoEncoder` 硬件编码 H.264)→
   `Mp4OutputFormat` 封装 MP4。音频轨道尝试 AAC(退 Opus)重编码;浏览器不支持音频
   编码时导出无声并在 UI 明示。离线逐帧处理,**速度快于实时播放**。
2. **降级 MediaRecorder 路径**:`canvas.captureStream(30)` + `video.captureStream()`
   音轨 → WebM 实时录制,需完整播放一遍。UI 明确标注「已降级」。

**取舍说明**:选择 mediabunny 单库而非 mp4box.js + mp4-muxer 组合——前者一个
ESM 同时搞定 demux 与 mux,且 `CanvasSink/CanvasSource` 原生处理时间戳、帧率、
旋转元数据,避免手写 AVCC extradata 与 seek 逻辑。备选方案(自写最简 WebM muxer)
未采用:无法产出 H.264,不符合「MP4 导出」的核心目标。

## 调色参数(全部在 fragment shader 实现)

- 基础:曝光 / 对比度 / 高光 / 阴影 / 白色色阶 / 黑色色阶
- 色彩:色温 / 色调 / 饱和度 / 自然饱和度 / 色相
- 质感:清晰度(中间调局部对比)/ 锐化 / 颗粒(时间随机种子)/ 褪色(黑位抬升)
- 氛围:暗角(强度+圆度)/ 分离色调(阴影、高光 各自色相+饱和度)

预设:复古鲜明(默认)/ 日系清新 / 胶片褪色 / 黑白电影 /
奶油柔光 / 蜜桃肤色 / 法式珍珠 / 城市霓虹 / 海岛晴蓝 / 落日金光 / 抹茶森系。

## 预设参考

7 个网红风格预设的参数并非凭空捏造,而是调研了小红书/醒图/iPhone 原相机/Lightroom
圈流传的公开调色配方(奶油肌、蜜桃肌、法式珠光、赛博夜景、海岛通透蓝、黄金时刻、
森系抹茶),提取其共性方向(如「奶油=低对比+压高光+降饱和」「珠光=大幅压高光」
「黄金时刻=暖高光+冷阴影的冷暖分割」)后翻译到本工具的 21 参数空间。
配方来源与研究笔记见 commit 历史与 params.js 注释。

## 已知限制

- MOV/部分编码能否导入取决于浏览器解码能力(Chrome 对 H.264/H.265/VP9/AV1 支持较好)。
- MediaRecorder 降级路径输出 WebM 且时长 = 实时播放时长。
- 超大文件(>500MB)仅提示警告不阻止,实际受设备内存限制。
