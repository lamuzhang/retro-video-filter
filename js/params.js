/* =========================================================================
 * params.js — 调色参数的「单一事实来源」(single source of truth)
 *
 * 所有可调参数、分组、范围、默认值、uniform 名、预设值全部集中在此文件。
 * UI 滑杆、WebGL uniform 上传、预设替换逻辑均由本表驱动，禁止在别处硬编码。
 *
 * 字段说明:
 *   id      : 参数唯一键,同时是 state.values 的键
 *   uniform : fragment shader 中的 uniform 名(u_ 前缀)
 *   norm    : 上传 GPU 前的归一化除数 (uniform 值 = slider 值 / norm)
 *   group   : 所属分组 id(见 GROUPS)
 *   format  : 数值显示格式化 (decimals)
 * ========================================================================= */

'use strict';

const PARAM_GROUPS = [
  { id: 'basic',  zh: '基础', en: 'Basic' },
  { id: 'color',  zh: '色彩', en: 'Color' },
  { id: 'texture', zh: '质感', en: 'Texture' },
  { id: 'atmos',  zh: '氛围', en: 'Atmosphere' },
];

const PARAMS = [
  /* ---------------- 基础 Basic ---------------- */
  { id: 'exposure',   zh: '曝光',     en: 'Exposure',   group: 'basic',
    min: -3,   max: 3,   step: 0.01, def: 0, decimals: 2, uniform: 'u_exposure',   norm: 1 },
  { id: 'contrast',   zh: '对比度',   en: 'Contrast',   group: 'basic',
    min: -100, max: 100, step: 1,    def: 0, decimals: 0, uniform: 'u_contrast',   norm: 100 },
  { id: 'highlights', zh: '高光',     en: 'Highlights', group: 'basic',
    min: -100, max: 100, step: 1,    def: 0, decimals: 0, uniform: 'u_highlights', norm: 100 },
  { id: 'shadows',    zh: '阴影',     en: 'Shadows',    group: 'basic',
    min: -100, max: 100, step: 1,    def: 0, decimals: 0, uniform: 'u_shadows',    norm: 100 },
  { id: 'whites',     zh: '白色色阶', en: 'Whites',     group: 'basic',
    min: -100, max: 100, step: 1,    def: 0, decimals: 0, uniform: 'u_whites',     norm: 100 },
  { id: 'blacks',     zh: '黑色色阶', en: 'Blacks',     group: 'basic',
    min: -100, max: 100, step: 1,    def: 0, decimals: 0, uniform: 'u_blacks',     norm: 100 },

  /* ---------------- 色彩 Color ---------------- */
  { id: 'temperature', zh: '色温',       en: 'Temperature', group: 'color',
    min: -100, max: 100, step: 1, def: 0, decimals: 0, uniform: 'u_temperature', norm: 100 },
  { id: 'tint',        zh: '色调',       en: 'Tint',        group: 'color',
    min: -100, max: 100, step: 1, def: 0, decimals: 0, uniform: 'u_tint',        norm: 100 },
  { id: 'saturation',  zh: '饱和度',     en: 'Saturation',  group: 'color',
    min: -100, max: 100, step: 1, def: 0, decimals: 0, uniform: 'u_saturation',  norm: 100 },
  { id: 'vibrance',    zh: '自然饱和度', en: 'Vibrance',    group: 'color',
    min: -100, max: 100, step: 1, def: 0, decimals: 0, uniform: 'u_vibrance',    norm: 100 },
  { id: 'hue',         zh: '色相',       en: 'Hue',         group: 'color',
    min: -180, max: 180, step: 1, def: 0, decimals: 0, uniform: 'u_hue',         norm: 360 },

  /* ---------------- 质感 Texture ---------------- */
  { id: 'clarity', zh: '清晰度',   en: 'Clarity', group: 'texture',
    min: -100, max: 100, step: 1, def: 0, decimals: 0, uniform: 'u_clarity', norm: 100 },
  { id: 'sharpen', zh: '锐化',     en: 'Sharpen', group: 'texture',
    min: 0, max: 100, step: 1, def: 0, decimals: 0, uniform: 'u_sharpen', norm: 100 },
  { id: 'grain',   zh: '颗粒/噪点', en: 'Grain',   group: 'texture',
    min: 0, max: 100, step: 1, def: 0, decimals: 0, uniform: 'u_grain', norm: 100 },
  { id: 'fade',    zh: '褪色',     en: 'Fade',    group: 'texture',
    min: 0, max: 100, step: 1, def: 0, decimals: 0, uniform: 'u_fade', norm: 100 },

  /* ---------------- 氛围 Atmosphere ---------------- */
  { id: 'vignetteAmount',   zh: '暗角强度',   en: 'Vignette',  group: 'atmos',
    min: 0, max: 100, step: 1, def: 0, decimals: 0, uniform: 'u_vig_amount', norm: 100 },
  { id: 'vignetteRoundness', zh: '暗角圆度',  en: 'Roundness', group: 'atmos',
    min: 0, max: 100, step: 1, def: 50, decimals: 0, uniform: 'u_vig_round', norm: 100 },
  { id: 'stShadowHue',    zh: '阴影色相',     en: 'Shadow Hue',    group: 'atmos',
    min: 0, max: 360, step: 1, def: 0, decimals: 0, uniform: 'u_st_sh_hue', norm: 360 },
  { id: 'stShadowSat',    zh: '阴影饱和度',   en: 'Shadow Sat',    group: 'atmos',
    min: 0, max: 100, step: 1, def: 0, decimals: 0, uniform: 'u_st_sh_sat', norm: 100 },
  { id: 'stHighlightHue', zh: '高光色相',     en: 'Highlight Hue', group: 'atmos',
    min: 0, max: 360, step: 1, def: 0, decimals: 0, uniform: 'u_st_hi_hue', norm: 360 },
  { id: 'stHighlightSat', zh: '高光饱和度',   en: 'Highlight Sat', group: 'atmos',
    min: 0, max: 100, step: 1, def: 0, decimals: 0, uniform: 'u_st_hi_sat', norm: 100 },
];

/* -------------------------------------------------------------------------
 * 预设: values 只需覆盖与中性值不同的参数;未列出的参数回退到 def。
 * presetDefaults(id) 返回某预设的完整参数表。
 * ------------------------------------------------------------------------- */
const PRESETS = [
  {
    id: 'retro-vivid', zh: '复古鲜明', en: 'Retro Vivid', isDefault: true,
    values: {
      exposure: 0.15, contrast: 14, highlights: -10, shadows: 12, whites: 6, blacks: -4,
      temperature: 22, tint: 4, saturation: 16, vibrance: 18, hue: 0,
      clarity: 12, sharpen: 20, grain: 22, fade: 8,
      vignetteAmount: 26, vignetteRoundness: 70,
      stShadowHue: 205, stShadowSat: 10, stHighlightHue: 40, stHighlightSat: 10,
    },
  },
  {
    id: 'japan-fresh', zh: '日系清新', en: 'Japan Fresh',
    values: {
      exposure: 0.5, contrast: -8, highlights: -20, shadows: 20, whites: 10, blacks: 8,
      temperature: -8, tint: 2, saturation: 6, vibrance: 14, hue: 0,
      clarity: 0, sharpen: 10, grain: 8, fade: 14,
      vignetteAmount: 0, vignetteRoundness: 50,
      stShadowHue: 210, stShadowSat: 6, stHighlightHue: 190, stHighlightSat: 8,
    },
  },
  {
    id: 'film-fade', zh: '胶片褪色', en: 'Film Fade',
    values: {
      exposure: 0.1, contrast: -14, highlights: -25, shadows: 8, whites: -8, blacks: 20,
      temperature: 12, tint: 6, saturation: -18, vibrance: 8, hue: 0,
      clarity: 0, sharpen: 5, grain: 38, fade: 34,
      vignetteAmount: 30, vignetteRoundness: 60,
      stShadowHue: 220, stShadowSat: 12, stHighlightHue: 45, stHighlightSat: 10,
    },
  },
  {
    id: 'bw-cinema', zh: '黑白电影', en: 'B&W Cinema',
    values: {
      exposure: 0.05, contrast: 24, highlights: -8, shadows: -6, whites: 12, blacks: -12,
      temperature: 0, tint: 0, saturation: -100, vibrance: 0, hue: 0,
      clarity: 18, sharpen: 25, grain: 30, fade: 6,
      vignetteAmount: 38, vignetteRoundness: 80,
      stShadowHue: 0, stShadowSat: 0, stHighlightHue: 0, stHighlightSat: 0,
    },
  },

  /* =============== 网红风格预设(参数配方来源见 README「预设参考」) =============== */

  /* 奶油柔光:低对比+压高光+抬黑位+降饱和=奶感底座;负清晰度=柔光;
     微暖中性色温,高光淡粉/阴影淡青绿的小剂量分离色调 */
  {
    id: 'cream-glow', zh: '奶油柔光', en: 'Cream Glow',
    values: {
      exposure: 0.4, contrast: -18, highlights: -35, shadows: 15, whites: -15, blacks: 15,
      temperature: 10, tint: 2, saturation: -12, vibrance: 8, hue: 0,
      clarity: -20, sharpen: 12, grain: 8, fade: 10,
      vignetteAmount: 8, vignetteRoundness: 60,
      stShadowHue: 190, stShadowSat: 6, stHighlightHue: 320, stHighlightSat: 6,
    },
  },
  /* 蜜桃肤色:色温色调双正(暖+粉)是蜜桃与奶油的核心区别;
     锐化偏高保「果汁感」清晰,高光染淡粉 */
  {
    id: 'peach-skin', zh: '蜜桃肤色', en: 'Peach Skin',
    values: {
      exposure: 0.3, contrast: -15, highlights: -25, shadows: 25, whites: -8, blacks: 8,
      temperature: 22, tint: 14, saturation: -6, vibrance: 12, hue: 0,
      clarity: -8, sharpen: 25, grain: 6, fade: 6,
      vignetteAmount: 6, vignetteRoundness: 60,
      stShadowHue: 200, stShadowSat: 6, stHighlightHue: 345, stHighlightSat: 8,
    },
  },
  /* 法式珍珠:大幅压高光出「发光/珠光」感,黑点微沉保质感(柔而不灰),
     冷暖分离色调比奶油明显(高光暖 40°/阴影冷 215°),颗粒模拟胶片珍珠 */
  {
    id: 'french-pearl', zh: '法式珍珠', en: 'French Pearl',
    values: {
      exposure: 0.2, contrast: -12, highlights: -45, shadows: 30, whites: -12, blacks: -4,
      temperature: 14, tint: 4, saturation: -4, vibrance: 8, hue: 0,
      clarity: -12, sharpen: 18, grain: 20, fade: 8,
      vignetteAmount: 10, vignetteRoundness: 65,
      stShadowHue: 215, stShadowSat: 14, stHighlightHue: 40, stHighlightSat: 10,
    },
  },
  /* 城市霓虹(赛博分支):冷色温+品红色调;高光压/阴影提后用清晰度找回对比;
     阴影青蓝 210° + 高光洋红 320°,暗角收拢视线 */
  {
    id: 'urban-neon', zh: '城市霓虹', en: 'Urban Neon',
    values: {
      exposure: 0.1, contrast: 8, highlights: -30, shadows: 35, whites: 4, blacks: -8,
      temperature: -18, tint: 12, saturation: 6, vibrance: 10, hue: 0,
      clarity: 18, sharpen: 20, grain: 8, fade: 6,
      vignetteAmount: 22, vignetteRoundness: 65,
      stShadowHue: 210, stShadowSat: 18, stHighlightHue: 320, stHighlightSat: 16,
    },
  },
  /* 海岛晴蓝:冷色温+清晰度(去朦胧)=通透;阴影蓝+高光微橙的冷暖对比让蓝更蓝;
     零颗粒零褪色,保持干净 */
  {
    id: 'island-blue', zh: '海岛晴蓝', en: 'Island Blue',
    values: {
      exposure: 0.25, contrast: 10, highlights: -25, shadows: 25, whites: -6, blacks: 10,
      temperature: -14, tint: 3, saturation: 10, vibrance: 14, hue: 0,
      clarity: 15, sharpen: 20, grain: 0, fade: 0,
      vignetteAmount: 6, vignetteRoundness: 60,
      stShadowHue: 215, stShadowSat: 10, stHighlightHue: 35, stHighlightSat: 6,
    },
  },
  /* 落日金光:强暖打底+微品红防「土黄」;高光橙金 42°/阴影微冷 205° 的冷暖分割
     是黄金时刻的本质;负清晰度=光雾感;降自然饱和度防「暖过头变橘」 */
  {
    id: 'golden-hour', zh: '落日金光', en: 'Golden Hour',
    values: {
      exposure: 0.25, contrast: -8, highlights: -35, shadows: 15, whites: -10, blacks: 12,
      temperature: 32, tint: 6, saturation: 4, vibrance: -4, hue: 0,
      clarity: -10, sharpen: 12, grain: 6, fade: 8,
      vignetteAmount: 14, vignetteRoundness: 70,
      stShadowHue: 205, stShadowSat: 10, stHighlightHue: 42, stHighlightSat: 18,
    },
  },
  /* 抹茶森系:中性微暖(不要冷),色调微偏绿;低饱和+柔结构(负清晰度)
     +锐化保叶缘细节;暖高光/冷阴影小剂量青橙结构;颗粒+轻暗角出氛围 */
  {
    id: 'matcha-forest', zh: '抹茶森系', en: 'Matcha Forest',
    values: {
      exposure: 0.3, contrast: -14, highlights: -30, shadows: 20, whites: -8, blacks: 8,
      temperature: 6, tint: -8, saturation: -16, vibrance: 6, hue: 0,
      clarity: -15, sharpen: 30, grain: 14, fade: 10,
      vignetteAmount: 12, vignetteRoundness: 60,
      stShadowHue: 205, stShadowSat: 7, stHighlightHue: 38, stHighlightSat: 7,
    },
  },

  /* =============== 导演风格 / 胶片模拟(配方来源见 README「预设参考」) =============== */

  /* 重庆森林(王家卫):暗部泛青绿(123°)+高光暖黄橙(41°)是杜可风暗房配光的签名;
     影调克制(黑位微抬加灰),重颗粒+中暗角出潮湿夜感——与 Lomo 的区别就在影调 */
  {
    id: 'chungking', zh: '重庆森林', en: 'Chungking',
    values: {
      exposure: -0.15, contrast: 6, highlights: -35, shadows: 30, whites: -18, blacks: 12,
      temperature: 8, tint: 6, saturation: -10, vibrance: 10, hue: 0,
      clarity: 12, sharpen: 25, grain: 35, fade: 12,
      vignetteAmount: 28, vignetteRoundness: 60,
      stShadowHue: 123, stShadowSat: 14, stHighlightHue: 41, stHighlightSat: 23,
    },
  },
  /* 动漫晴空(新海诚):对比与黑位的「平光化」做到极致(阴影/黑位大抬、对比大降)
     再拉满饱和糖果化;清晰度+锐化出壁纸通透感——与莫兰迪是光谱两端 */
  {
    id: 'anime-sky', zh: '动漫晴空', en: 'Anime Sky',
    values: {
      exposure: 0.35, contrast: -55, highlights: -40, shadows: 60, whites: 18, blacks: 55,
      temperature: -6, tint: -3, saturation: 14, vibrance: 16, hue: 0,
      clarity: 16, sharpen: 26, grain: 0, fade: 0,
      vignetteAmount: 0, vignetteRoundness: 50,
      stShadowHue: 190, stShadowSat: 5, stHighlightHue: 0, stHighlightSat: 0,
    },
  },
  /* 莫兰迪灰:减法做到极致——大幅降饱和+极低对比+黑白位双收,
     阴影极微量青;画面「蒙一层灰」但不发脏的关键是提阴影 */
  {
    id: 'morandi', zh: '莫兰迪灰', en: 'Morandi',
    values: {
      exposure: 0.1, contrast: -60, highlights: -50, shadows: 40, whites: -30, blacks: 15,
      temperature: -4, tint: 0, saturation: -55, vibrance: -10, hue: 0,
      clarity: -10, sharpen: 8, grain: 4, fade: 14,
      vignetteAmount: 0, vignetteRoundness: 50,
      stShadowHue: 190, stShadowSat: 5, stHighlightHue: 45, stHighlightSat: 3,
    },
  },
  /* Lomo 交叉冲印:与重庆森林共用「绿阴影/黄高光」撞色,但影调相反——
     对比拉满、黑位压死、清晰度暴力、全库最重暗角 */
  {
    id: 'lomo-xpro', zh: 'Lomo 交叉冲印', en: 'Lomo X-Pro',
    values: {
      exposure: 0, contrast: 45, highlights: -10, shadows: -15, whites: 8, blacks: -18,
      temperature: -8, tint: -10, saturation: -8, vibrance: 14, hue: 0,
      clarity: 40, sharpen: 30, grain: 18, fade: 0,
      vignetteAmount: 45, vignetteRoundness: 55,
      stShadowHue: 120, stShadowSat: 16, stHighlightHue: 47, stHighlightSat: 20,
    },
  },
  /* 蒸汽波:品红紫撞色(色调大正品红+阴影紫蓝 260°+高光粉 320°),
     褪色+颗粒做 VHS 复古;与城市霓虹的区别:更粉、更亮、更「塑料」 */
  {
    id: 'vaporwave', zh: '蒸汽波', en: 'Vaporwave',
    values: {
      exposure: 0, contrast: 14, highlights: -20, shadows: 10, whites: 0, blacks: 6,
      temperature: -12, tint: 22, saturation: 12, vibrance: 10, hue: 0,
      clarity: -6, sharpen: 10, grain: 16, fade: 10,
      vignetteAmount: 14, vignetteRoundness: 60,
      stShadowHue: 260, stShadowSat: 16, stHighlightHue: 320, stHighlightSat: 18,
    },
  },
  /* 富士 Velvia:反转片逻辑与负片完全相反——高对比、黑位致密不抬、
     饱和全靠自然饱和度堆(原卷饱和+20%),几乎无颗粒无分离色调 */
  {
    id: 'velvia', zh: '富士 Velvia', en: 'Fuji Velvia',
    values: {
      exposure: 0.1, contrast: 22, highlights: -30, shadows: -8, whites: 4, blacks: -12,
      temperature: -2, tint: 0, saturation: 8, vibrance: 30, hue: 0,
      clarity: 10, sharpen: 22, grain: 4, fade: 0,
      vignetteAmount: 8, vignetteRoundness: 60,
      stShadowHue: 0, stShadowSat: 0, stHighlightHue: 0, stHighlightSat: 0,
    },
  },
  /* 宝丽来:全库最重黑位抬升(低于+30 就不像宝丽来)+极低对比+暖黄偏绿偏色
     (色调负值=偏绿)+粗大颗粒+负清晰度柔焦朦胧+软暗角 */
  {
    id: 'polaroid', zh: '宝丽来', en: 'Polaroid',
    values: {
      exposure: 0.25, contrast: -30, highlights: -20, shadows: 35, whites: -22, blacks: 40,
      temperature: 18, tint: -10, saturation: -16, vibrance: -6, hue: 0,
      clarity: -18, sharpen: 8, grain: 34, fade: 22,
      vignetteAmount: 20, vignetteRoundness: 70,
      stShadowHue: 60, stShadowSat: 14, stHighlightHue: 48, stHighlightSat: 10,
    },
  },
  /* 布达佩斯粉(韦斯·安德森):粉彩=低对比+黑位抬起(无纯黑)+暖粉色调;
     颗粒+轻暗角,与蜜桃肤色的区别:更亮更平、粉色在整体而非只在高光 */
  {
    id: 'budapest-pink', zh: '布达佩斯粉', en: 'Budapest Pink',
    values: {
      exposure: 0.35, contrast: -22, highlights: -35, shadows: 32, whites: -12, blacks: 24,
      temperature: 10, tint: 12, saturation: -8, vibrance: 6, hue: 0,
      clarity: -10, sharpen: 10, grain: 18, fade: 12,
      vignetteAmount: 10, vignetteRoundness: 65,
      stShadowHue: 190, stShadowSat: 8, stHighlightHue: 350, stHighlightSat: 8,
    },
  },
];

/* 由 PARAMS 表生成某预设(或中性默认值)的完整参数对象 */
function buildValues(preset) {
  const out = {};
  for (const p of PARAMS) {
    out[p.id] = (preset && preset.values && p.id in preset.values) ? preset.values[p.id] : p.def;
  }
  return out;
}

function defaultPreset() {
  return PRESETS.find((p) => p.isDefault) || PRESETS[0];
}
