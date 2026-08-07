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
