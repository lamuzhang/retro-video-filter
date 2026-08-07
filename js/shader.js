/* =========================================================================
 * shader.js — GLSL 源码(WebGL2 / GLSL ES 3.00)
 * 所有调色运算均在 fragment shader 中完成,每个算法块附算法说明。
 * uniform 命名与 params.js 的 uniform 字段一一对应。
 * ========================================================================= */

'use strict';

const VERT_SRC = `#version 300 es
layout(location=0) in vec2 a_pos;
out vec2 v_uv;
void main(){
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG_SRC = `#version 300 es
precision highp float;

uniform sampler2D u_tex;
uniform vec2  u_res;        // 画布分辨率(px),用于像素级采样与宽高比校正
uniform float u_time;       // 帧序号,作为胶片颗粒的时间随机种子
uniform float u_bypass;     // >0.5 时直通原片(「对比原片」按住查看)

uniform float u_exposure;   // -3..3 (EV 档)
uniform float u_contrast;   // -1..1
uniform float u_highlights; // -1..1
uniform float u_shadows;    // -1..1
uniform float u_whites;     // -1..1
uniform float u_blacks;     // -1..1
uniform float u_temperature;// -1..1
uniform float u_tint;       // -1..1
uniform float u_saturation; // -1..1
uniform float u_vibrance;   // -1..1
uniform float u_hue;        // -0.5..0.5 (色轮圈数)
uniform float u_clarity;    // -1..1
uniform float u_sharpen;    //  0..1
uniform float u_grain;      //  0..1
uniform float u_fade;       //  0..1
uniform float u_vig_amount; //  0..1
uniform float u_vig_round;  //  0..1 (0=方形 1=圆形)
uniform float u_st_sh_hue;  //  0..1 (色轮圈数)
uniform float u_st_sh_sat;  //  0..1
uniform float u_st_hi_hue;  //  0..1
uniform float u_st_hi_sat;  //  0..1

in vec2 v_uv;
out vec4 outColor;

/* Rec.709 亮度权重:人眼对绿最敏感,调色中所有「亮度」均以此为准 */
float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

/* 无正弦伪随机 hash —— 胶片颗粒噪点源;同一 (uv,time) 确定性输出 */
float hash12(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

/* 色轮(0..1 圈数)→ RGB,用于分离色调取色 */
vec3 hue2rgb(float h){
  vec3 p = abs(fract(vec3(h) + vec3(0.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0);
  return clamp(p - 1.0, 0.0, 1.0);
}

/* 绕灰轴 (1,1,1)/√3 的 Rodrigues 旋转 —— 整体色相偏移且亮度不变 */
vec3 hueRotate(vec3 c, float turns){
  const vec3 k = vec3(0.57735026919);
  float a = turns * 6.28318530718;
  float cs = cos(a), sn = sin(a);
  return c * cs + cross(k, c) * sn + k * dot(k, c) * (1.0 - cs);
}

void main(){
  vec3 c = texture(u_tex, v_uv).rgb;
  if (u_bypass > 0.5) { outColor = vec4(c, 1.0); return; }

  vec2 texel = 1.0 / u_res;

  /* ---- 曝光 Exposure:以 2 为底的 EV 档乘法,c *= 2^EV(摄影语义) ---- */
  c *= exp2(u_exposure);

  /* ---- 色温/色调 Temperature/Tint:von-Kries 对角白平衡近似 ----
     色温沿 蓝↔黄 轴(正=暖),色调沿 绿↔品红 轴(正=偏绿),对角矩阵缩放 */
  c *= vec3(1.0 + u_temperature * 0.12,
            1.0 + u_tint        * 0.08,
            1.0 - u_temperature * 0.12);

  /* ---- 对比度 Contrast:以 18% 中灰(0.18)为支点的 S 曲线一阶近似 ---- */
  c = (c - 0.18) * (1.0 + u_contrast) + 0.18;

  /* ---- 白色/黑色色阶 Whites/Blacks:端点重映射 ----
     Whites>0 拉伸白位(高光溢出截顶),<0 压缩白位;
     Blacks>0 抬升黑位(画面发灰),<0 下压黑位(阴影更实) */
  if (u_whites >= 0.0) c /= max(1.0 - u_whites * 0.35, 0.05);
  else                 c *= (1.0 + u_whites * 0.35);
  if (u_blacks >= 0.0) c = c * (1.0 - u_blacks * 0.25) + u_blacks * 0.25;
  else                 c = (c + u_blacks * 0.25) / (1.0 + u_blacks * 0.25);

  /* ---- 高光/阴影 Highlights/Shadows:亮度分区加权增益 ----
     高光只作用于亮部(smoothstep 软遮罩),阴影只作用于暗部,互不串扰 */
  float l0 = luma(c);
  float wHi = smoothstep(0.55, 1.0, l0);
  float wSh = 1.0 - smoothstep(0.0, 0.45, l0);
  c *= 1.0 + u_highlights * 0.5 * wHi + u_shadows * 0.5 * wSh;

  /* ---- 色相 Hue:灰轴旋转(保亮度) ---- */
  c = hueRotate(c, u_hue);

  /* ---- 饱和度 Saturation:沿 灰→原色 方向线性外推/内插 ---- */
  float l1 = luma(c);
  c = mix(vec3(l1), c, 1.0 + u_saturation);

  /* ---- 自然饱和度 Vibrance:非线性饱和度 ----
     提升量与当前饱和度 (max-min) 成反比:已饱和的像素少加、
     低饱和像素多加,从而避免肤色溢出,比线性饱和度更「自然」 */
  float mx = max(c.r, max(c.g, c.b));
  float mn = min(c.r, min(c.g, c.b));
  float satEst = mx - mn;
  float lv = luma(c);
  c = mix(vec3(lv), c, 1.0 + u_vibrance * (1.0 - satEst));

  /* ---- 清晰度 Clarity:中间调局部对比(大半径 unsharp mask)----
     8 方向大半径采样近似局部亮度场;只放大中间调的高频分量,
     权重 mw 在 luma=0.5 处为 1、黑白两端为 0,保护高光与阴影不被压出光晕 */
  vec2 r6 = texel * 6.0;
  vec3 blur =
      texture(u_tex, v_uv + vec2( r6.x,  0.0)).rgb + texture(u_tex, v_uv + vec2(-r6.x,  0.0)).rgb +
      texture(u_tex, v_uv + vec2( 0.0,  r6.y)).rgb + texture(u_tex, v_uv + vec2( 0.0, -r6.y)).rgb +
      texture(u_tex, v_uv + vec2( r6.x,  r6.y)).rgb + texture(u_tex, v_uv + vec2(-r6.x,  r6.y)).rgb +
      texture(u_tex, v_uv + vec2( r6.x, -r6.y)).rgb + texture(u_tex, v_uv + vec2(-r6.x, -r6.y)).rgb;
  blur /= 8.0;
  float mw = 1.0 - abs(luma(c) * 2.0 - 1.0);
  c += (c - blur) * u_clarity * 1.2 * mw;

  /* ---- 锐化 Sharpen:5-tap 拉普拉斯核(中心×5 - 四邻域)---- */
  vec3 shN = texture(u_tex, v_uv + vec2(0.0,  texel.y)).rgb;
  vec3 shS = texture(u_tex, v_uv + vec2(0.0, -texel.y)).rgb;
  vec3 shE = texture(u_tex, v_uv + vec2( texel.x, 0.0)).rgb;
  vec3 shW = texture(u_tex, v_uv + vec2(-texel.x, 0.0)).rgb;
  vec3 sharp = c * 5.0 - (shN + shS + shE + shW);
  c = mix(c, sharp, u_sharpen * 0.6);

  /* ---- 分离色调 Split Toning:按亮度权重混入染色向量 ----
     暗部混入阴影色、亮部混入高光色(色轮取色后以 0.5 为中心转成偏移量),
     中间调保持原色 —— 经典「阴影青、高光橙」胶片感的来源 */
  float l2 = luma(c);
  float wSh2 = 1.0 - smoothstep(0.0, 0.55, l2);
  float wHi2 = smoothstep(0.45, 1.0, l2);
  c += (hue2rgb(u_st_sh_hue) - 0.5) * u_st_sh_sat * wSh2 * 0.5;
  c += (hue2rgb(u_st_hi_hue) - 0.5) * u_st_hi_sat * wHi2 * 0.5;

  /* ---- 褪色 Fade:黑位抬升曲线 ----
     c += f·k·(1-c):暗部抬得多、白位不动,等效 lifted-black 胶片扫描曲线 */
  c += u_fade * 0.18 * (1.0 - c);

  /* ---- 颗粒 Grain:单色胶片噪点(带时间随机种子)----
     hash(uv·分辨率 + 时变偏移) 产生逐帧变化的噪点;中间调权重模拟
     胶片颗粒在中间调最可见的特性(高光/阴影区颗粒被压制) */
  float g = hash12(v_uv * u_res + vec2(fract(u_time * 0.371) * 517.0,
                                       fract(u_time * 0.733) * 913.0));
  float gw = 0.35 + 0.65 * (1.0 - abs(luma(c) * 2.0 - 1.0));
  c += (g - 0.5) * u_grain * 0.22 * gw;

  /* ---- 暗角 Vignette:强度 + 圆度 ----
     圆度在「方形距离(max)」与「圆形距离(length)」间插值,
     smoothstep 软化边缘;强度同时控制收缩起始半径与压暗深度 */
  float aspect = u_res.x / u_res.y;
  vec2 q = v_uv - 0.5;
  float dCirc = length(q * vec2(aspect, 1.0)) * 2.0;
  float dRect = max(abs(q.x), abs(q.y)) * 2.0;
  float d = mix(dRect, dCirc, u_vig_round);
  float start = mix(1.5, 0.55, u_vig_amount);
  float vig = smoothstep(start, start + 0.8, d);
  c *= 1.0 - vig * u_vig_amount * 0.9;

  outColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;
