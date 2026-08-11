/* renderer.js — WebGL2 调色渲染器:视频帧 → 纹理 → 调色 shader → canvas */

'use strict';

class Grader {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: true, // 导出时同帧可被编码器重复采样
      powerPreference: 'high-performance',
    });
    if (!gl) throw new Error('WebGL2 not supported');
    this.gl = gl;

    this.program = Grader.buildProgram(gl, VERT_SRC, FRAG_SRC);
    gl.useProgram(this.program);

    /* 全屏三角形 */
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    this.u = {};
    for (const p of PARAMS) this.u[p.id] = gl.getUniformLocation(this.program, p.uniform);
    this.uRes = gl.getUniformLocation(this.program, 'u_res');
    this.uTime = gl.getUniformLocation(this.program, 'u_time');
    this.uBypass = gl.getUniformLocation(this.program, 'u_bypass');
    this.uSplit = gl.getUniformLocation(this.program, 'u_split');
    this.frame = 0;
  }

  static buildProgram(gl, vsSrc, fsSrc) {
    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        throw new Error('Shader compile error: ' + gl.getShaderInfoLog(s));
      }
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsSrc));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsSrc));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error('Program link error: ' + gl.getProgramInfoLog(prog));
    }
    return prog;
  }

  resize(w, h) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  /* source: HTMLVideoElement 或 HTMLCanvasElement(导出路径)
     split: 分屏对比位置 0..1,0 = 关闭(导出路径不传) */
  render(source, values, bypass, split) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.useProgram(this.program);
    gl.uniform2f(this.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.uTime, this.frame++);
    gl.uniform1f(this.uBypass, bypass ? 1 : 0);
    gl.uniform1f(this.uSplit, split || 0);
    for (const p of PARAMS) gl.uniform1f(this.u[p.id], values[p.id] / p.norm);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
