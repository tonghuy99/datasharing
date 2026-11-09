/* AANG vs KORRA — phim 3D ngắn. three.js (global THREE) + Web Audio tổng hợp. */
(() => {
'use strict';
const T = THREE, V3 = T.Vector3, PI = Math.PI, TAU = PI * 2;
const v = (x, y, z) => new V3(x, y, z);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, u) => a + (b - a) * u;
const sstep = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
const EASE = { lin: u => u, s: u => u * u * (3 - 2 * u), out: u => 1 - (1 - u) * (1 - u), in: u => u * u };
const rnd = (a, b) => a + Math.random() * (b - a);
const rs = (s = 1) => (Math.random() * 2 - 1) * s;
const $ = id => document.getElementById(id);
const DUR = 84;

/* ───────────────────────── Renderer / scene ───────────────────────── */
const canvas = $('c');
const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
const scene = new T.Scene();
scene.fog = new T.FogExp2(0x4b3a5c, 0.009);
const camera = new T.PerspectiveCamera(40, 16 / 9, 0.1, 500);
let aspect = 16 / 9;

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t;
}
const lam = (c, o) => new T.MeshLambertMaterial(Object.assign({ color: c }, o || {}));

/* Bầu trời hoàng hôn */
{
  const sky = new T.Mesh(new T.SphereGeometry(300, 24, 16), new T.MeshBasicMaterial({
    side: T.BackSide, fog: false, map: canvasTex(16, 256, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#070a22'); gr.addColorStop(.3, '#1c1a46'); gr.addColorStop(.43, '#5a3566');
      gr.addColorStop(.49, '#d8685a'); gr.addColorStop(.515, '#ffb469'); gr.addColorStop(.56, '#3a2a48'); gr.addColorStop(1, '#15101f');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    })
  }));
  scene.add(sky);
  const sp = new Float32Array(900);
  for (let i = 0; i < 300; i++) { const a = rnd(0, TAU), e = rnd(.25, 1.5); sp[i * 3] = 280 * Math.cos(e) * Math.cos(a); sp[i * 3 + 1] = 280 * Math.sin(e); sp[i * 3 + 2] = 280 * Math.cos(e) * Math.sin(a); }
  const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.BufferAttribute(sp, 3));
  scene.add(new T.Points(sg, new T.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: .8 })));
  const glow = canvasTex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,240,200,1)'); r.addColorStop(.18, 'rgba(255,190,110,.9)'); r.addColorStop(.5, 'rgba(255,120,70,.25)'); r.addColorStop(1, 'rgba(255,90,60,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });
  const sun = new T.Sprite(new T.SpriteMaterial({ map: glow, fog: false, blending: T.AdditiveBlending, depthWrite: false }));
  sun.position.set(40, 20, -270); sun.scale.set(80, 80, 1); scene.add(sun);
}
/* Đấu trường */
const ARENA_R = 11;
{
  const top = canvasTex(1024, 1024, (g, w) => {
    const c = w / 2; g.fillStyle = '#6b665f'; g.fillRect(0, 0, w, w);
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '0,0,0' : '255,255,255'},${rnd(.02, .07)})`; g.fillRect(rnd(0, w), rnd(0, w), rnd(1, 5), rnd(1, 5)); }
    g.strokeStyle = 'rgba(30,25,22,.55)';
    [500, 400, 300, 200, 110].forEach((r, i) => { g.lineWidth = i ? 4 : 10; g.beginPath(); g.arc(c, c, r, 0, TAU); g.stroke(); });
    g.lineWidth = 3;
    for (let k = 0; k < 5; k++) { const r0 = [110, 200, 300, 400, 500][k], r1 = k ? [110, 200, 300, 400][k - 1] : 0, n = 6 + k * 6; if (!k) continue; for (let i = 0; i < n; i++) { const a = i / n * TAU + k * .3; g.beginPath(); g.moveTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1); g.lineTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); g.stroke(); } }
    ['#ffd27a', '#6cc4ff', '#8fd08a', '#ff7a45'].forEach((col, i) => { g.fillStyle = col; g.globalAlpha = .28; g.beginPath(); g.moveTo(c, c); g.arc(c, c, 104, i * PI / 2, (i + 1) * PI / 2); g.fill(); });
    g.globalAlpha = 1;
  });
  const side = lam(0x4f4a46);
  const arena = new T.Mesh(new T.CylinderGeometry(ARENA_R, ARENA_R + .6, 1.4, 64), [side, new T.MeshLambertMaterial({ map: top }), side]);
  arena.position.y = -.7; arena.receiveShadow = true; scene.add(arena);
  const water = new T.Mesh(new T.CircleGeometry(260, 48), new T.MeshPhongMaterial({ color: 0x143a56, shininess: 90, specular: 0xffb07a }));
  water.rotation.x = -PI / 2; water.position.y = -.75; scene.add(water);
  const mm = new T.MeshBasicMaterial({ color: 0x241d33 });
  for (let i = 0; i < 18; i++) { const a = i / 18 * TAU + rs(.1), r = rnd(80, 130), h = rnd(22, 55); const m = new T.Mesh(new T.ConeGeometry(rnd(22, 40), h, 6), mm); m.position.set(Math.cos(a) * r, h / 2 - 1.5, Math.sin(a) * r); m.rotation.y = rnd(0, 3); scene.add(m); }
}
const torches = [];
{
  const pm = lam(0x5a544f), bm = lam(0x2b2622), fm = new T.MeshBasicMaterial({ color: 0xffb040 });
  for (let i = 0; i < 8; i++) {
    const a = PI / 8 + i * PI / 4, x = Math.cos(a) * 10.2, z = Math.sin(a) * 10.2;
    const p = new T.Mesh(new T.CylinderGeometry(.28, .36, 3.4, 8), pm); p.position.set(x, 1.7, z); p.castShadow = true; scene.add(p);
    const b = new T.Mesh(new T.CylinderGeometry(.5, .3, .3, 8), bm); b.position.set(x, 3.5, z); scene.add(b);
    const f = new T.Mesh(new T.SphereGeometry(.22, 8, 6), fm); f.position.set(x, 3.8, z); scene.add(f);
    torches.push(f);
  }
}
/* Ánh sáng */
scene.add(new T.HemisphereLight(0x8ea4ff, 0x4a3324, 1.7));
const key = new T.DirectionalLight(0xffc08a, 2.4); key.position.set(-10, 13, 12); key.castShadow = true;
key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 1, far: 50 }); key.shadow.bias = -.002;
scene.add(key);
const rim = new T.DirectionalLight(0xff8a50, 1.6); rim.position.set(6, 5, -14); scene.add(rim);
const fxL = [0xff8a30, 0xbfe6ff, 0xbfe6ff].map(c => { const l = new T.PointLight(c, 0, 30, 1.6); scene.add(l); return l; });

/* ───────────────────────── Hạt (particles) ───────────────────────── */
class PS {
  constructor(n, add) {
    this.n = n; this.i = 0;
    this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 4); this.size = new Float32Array(n);
    this.vel = new Float32Array(n * 3); this.life = new Float32Array(n); this.max = new Float32Array(n);
    this.s0 = new Float32Array(n); this.s1 = new Float32Array(n); this.c0 = new Float32Array(n * 3); this.c1 = new Float32Array(n * 3);
    this.al = new Float32Array(n); this.g = new Float32Array(n); this.dr = new Float32Array(n);
    const g = this.geo = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(this.pos, 3));
    g.setAttribute('aCol', new T.BufferAttribute(this.col, 4));
    g.setAttribute('aSize', new T.BufferAttribute(this.size, 1));
    this.mat = new T.ShaderMaterial({
      uniforms: { uS: { value: 500 } }, transparent: true, depthWrite: false, blending: add ? T.AdditiveBlending : T.NormalBlending,
      vertexShader: 'attribute float aSize;attribute vec4 aCol;varying vec4 vC;uniform float uS;void main(){vC=aCol;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=aSize*uS/max(.1,-mv.z);gl_Position=projectionMatrix*mv;}',
      fragmentShader: 'varying vec4 vC;void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,.08,d);if(a<.01)discard;gl_FragColor=vec4(vC.rgb,vC.a*a);}'
    });
    this.pts = new T.Points(g, this.mat); this.pts.frustumCulled = false; this.pts.renderOrder = add ? 3 : 2; scene.add(this.pts);
  }
  emit(x, y, z, vx, vy, vz, life, s0, s1, c0, c1, a, g, dr) {
    const i = this.i; this.i = (i + 1) % this.n; const j = i * 3;
    this.pos[j] = x; this.pos[j + 1] = y; this.pos[j + 2] = z; this.vel[j] = vx; this.vel[j + 1] = vy; this.vel[j + 2] = vz;
    this.life[i] = this.max[i] = life; this.s0[i] = s0; this.s1[i] = s1; this.al[i] = a; this.g[i] = g; this.dr[i] = dr;
    this.c0[j] = c0[0]; this.c0[j + 1] = c0[1]; this.c0[j + 2] = c0[2]; this.c1[j] = c1[0]; this.c1[j + 1] = c1[1]; this.c1[j + 2] = c1[2];
  }
  update(dt) {
    const { n, pos, vel, life, max, size, col } = this;
    for (let i = 0; i < n; i++) {
      if (life[i] <= 0) continue;
      life[i] -= dt; if (life[i] <= 0) { size[i] = 0; continue; }
      const u = 1 - life[i] / max[i], j = i * 3, k = Math.max(0, 1 - this.dr[i] * dt);
      vel[j] *= k; vel[j + 1] = vel[j + 1] * k + this.g[i] * dt; vel[j + 2] *= k;
      pos[j] += vel[j] * dt; pos[j + 1] += vel[j + 1] * dt; pos[j + 2] += vel[j + 2] * dt;
      if (this.g[i] < 0 && pos[j + 1] < .03 && pos[j] * pos[j] + pos[j + 2] * pos[j + 2] < 125) { pos[j + 1] = .03; vel[j + 1] *= -.3; vel[j] *= .6; vel[j + 2] *= .6; }
      size[i] = lerp(this.s0[i], this.s1[i], u);
      col[i * 4] = lerp(this.c0[j], this.c1[j], u); col[i * 4 + 1] = lerp(this.c0[j + 1], this.c1[j + 1], u); col[i * 4 + 2] = lerp(this.c0[j + 2], this.c1[j + 2], u);
      col[i * 4 + 3] = this.al[i] * Math.min(1, (1 - u) * 2.5) * Math.min(1, u * 10 + .25);
    }
    const a = this.geo.attributes; a.position.needsUpdate = a.aCol.needsUpdate = a.aSize.needsUpdate = true;
  }
  clear() { this.life.fill(0); this.size.fill(0); this.geo.attributes.aSize.needsUpdate = true; }
}
const ADD = new PS(4500, true), NRM = new PS(2200, false);
const cnt = x => Math.floor(x + Math.random());
const C = {
  f0: [1, .74, .25], f1: [.95, .13, 0], fa0: [1, .9, .45], fa1: [1, .3, .02], fk0: [1, .6, .2], fk1: [.85, .05, .02],
  a0: [.8, .93, 1], a1: [.55, .75, 1], w0: [.4, .75, 1], w1: [.08, .3, .9], ww: [.9, .97, 1],
  d0: [.62, .54, .44], d1: [.5, .45, .4], r0: [.3, .27, .24], st: [.92, .95, 1], g0: [.75, .95, 1], g1: [.4, .7, 1], sp: [1, .9, .6]
};
const pFire = (p, vx, vy, vz, sc = 1, sp = 1, c0 = C.f0, c1 = C.f1) => ADD.emit(p.x + rs(.12 * sc), p.y + rs(.12 * sc), p.z + rs(.12 * sc), vx + rs(sp), vy + rs(sp), vz + rs(sp), rnd(.3, .65), .6 * sc, .08 * sc, c0, c1, .5, 2.5, 1.2);
const pAir = (p, vx, vy, vz, sc = 1, sp = .6) => ADD.emit(p.x + rs(.1), p.y + rs(.1), p.z + rs(.1), vx + rs(sp), vy + rs(sp), vz + rs(sp), rnd(.35, .8), .22 * sc, .7 * sc, C.a0, C.a1, .22, 0, 1.5);
const pWater = (p, j = .1, life = .26) => { ADD.emit(p.x + rs(j), p.y + rs(j), p.z + rs(j), rs(.4), rs(.4), rs(.4), rnd(life * .7, life * 1.2), .36, .12, Math.random() < .15 ? C.ww : C.w0, C.w1, .55, -1.5, 0); };
const pSplash = (p, n, sp = 4) => { for (let i = 0; i < n; i++) ADD.emit(p.x + rs(.2), p.y + rs(.2), p.z + rs(.2), rs(sp), rnd(0, sp), rs(sp), rnd(.4, .9), .22, .06, C.w0, C.w1, .6, -9, .4); };
const pDust = (p, n, sp = 2, sc = 1) => { for (let i = 0; i < n; i++) NRM.emit(p.x + rs(.4 * sc), p.y + rnd(0, .3), p.z + rs(.4 * sc), rs(sp), rnd(.2, sp * .6), rs(sp), rnd(.9, 2.2), .5 * sc, 1.9 * sc, C.d0, C.d1, .42, .25, 1.8); };
const pDebris = (p, n, sp = 6) => { for (let i = 0; i < n; i++) NRM.emit(p.x + rs(.4), p.y + rs(.4), p.z + rs(.4), rs(sp), rnd(1, sp), rs(sp), rnd(.8, 1.6), rnd(.1, .26), .08, C.r0, C.r0, 1, -14, .2); };
const pSteam = (p, n) => { for (let i = 0; i < n; i++) NRM.emit(p.x + rs(.3), p.y + rs(.3), p.z + rs(.3), rs(1.2), rnd(.4, 2), rs(1.2), rnd(.9, 1.9), .4, 1.7, C.st, C.st, .34, .5, 1.6); };
const pSpark = (p, n, sp = 8, c = C.sp) => { for (let i = 0; i < n; i++) ADD.emit(p.x, p.y, p.z, rs(sp), rs(sp), rs(sp), rnd(.25, .7), .16, .03, c, C.f1, .9, -5, .6); };
const pGlow = (p, j, sc = 1) => ADD.emit(p.x + rs(j), p.y + rs(j), p.z + rs(j), rs(.5), rnd(.2, 1.4), rs(.5), rnd(.4, .9), .3 * sc, .04, C.g0, C.g1, .5, 0, .5);

/* ───────────────────────── Nhân vật ───────────────────────── */
const JN = ['hips', 'spine', 'chest', 'head', 'armL', 'foreL', 'armR', 'foreR', 'legL', 'shinL', 'legR', 'shinR'];
const Z3 = [0, 0, 0];
function mirror(p) {
  const o = {};
  for (const k in p) { const a = p[k]; const n = k.endsWith('L') ? k.slice(0, -1) + 'R' : k.endsWith('R') ? k.slice(0, -1) + 'L' : k; o[n] = [a[0], -a[1], -a[2]]; }
  return o;
}
const HL = { legL: [-.95, 0, .6], shinL: [1.15, 0, -.35], legR: [-.95, 0, -.6], shinR: [1.15, 0, .35] };
const P = {
  stand: { armL: [.05, 0, .1], armR: [.05, 0, -.1], foreL: [-.2, 0, 0], foreR: [-.2, 0, 0] },
  bow: { spine: [.4, 0, 0], chest: [.15, 0, 0], head: [.2, 0, 0], armL: [-.7, -1, .15], foreL: [-1.7, 0, 0], armR: [-.7, 1, -.15], foreR: [-1.7, 0, 0] },
  // Bát Quái Chưởng: thân nghiêng, chưởng trước mở, tay sau thủ dưới khuỷu
  bagua: { hips: [0, -.55, 0], chest: [0, .2, 0], head: [0, .35, 0], armL: [-1.25, 0, .5], foreL: [-.4, 0, 0], armR: [-.45, .9, -.1], foreR: [-1.5, 0, 0], legL: [-.5, 0, .12], shinL: [.65, 0, 0], legR: [.1, 0, -.15], shinR: [.55, 0, 0] },
  jump: { spine: [.2, 0, 0], armL: [-.4, 0, 1.1], armR: [-.4, 0, -1.1], foreL: [-.6, 0, 0], foreR: [-.6, 0, 0], legL: [-1.3, 0, .1], shinL: [1.7, 0, 0], legR: [-.9, 0, -.1], shinR: [1.5, 0, 0] },
  // Thái Cực: "bằng" (ward-off), trọng tâm dồn chân sau
  ward: { hips: [0, -.4, 0], head: [0, .4, 0], spine: [.05, 0, 0], armL: [-.95, -.5, .25], foreL: [-1, 0, 0], armR: [-.5, .7, -.2], foreR: [-1.2, 0, 0], legL: [-.45, 0, .15], shinL: [.3, 0, 0], legR: [0, 0, -.2], shinR: [.75, 0, 0] },
  palm: { hips: [0, .4, 0], head: [0, -.35, 0], spine: [.18, 0, 0], armR: [-1.5, 0, -.15], foreR: [-.08, 0, 0], armL: [.35, 0, .3], foreL: [-1.3, 0, 0], legL: [-.8, 0, .1], shinL: [.9, 0, 0], legR: [.45, 0, -.1], shinR: [.15, 0, 0] },
  push: { spine: [.2, 0, 0], armL: [-1.45, 0, -.1], armR: [-1.45, 0, .1], foreL: [-.1, 0, 0], foreR: [-.1, 0, 0], legL: [-.8, 0, .1], shinL: [.9, 0, 0], legR: [.45, 0, -.12], shinR: [.15, 0, 0] },
  sweepL: { hips: [0, .5, 0], head: [0, -.4, 0], armL: [-1.2, 0, 1], foreL: [-.3, 0, 0], armR: [-1.35, 0, .55], foreR: [-.5, 0, 0], legL: [-.3, 0, .3], shinL: [.6, 0, 0], legR: [-.15, 0, -.3], shinR: [.5, 0, 0] },
  raise: { spine: [-.1, 0, 0], head: [-.15, 0, 0], armL: [-2.5, 0, .35], armR: [-2.5, 0, -.35], foreL: [-.3, 0, 0], foreR: [-.3, 0, 0], legL: [-.2, 0, .2], shinL: [.4, 0, 0], legR: [-.2, 0, -.2], shinR: [.4, 0, 0] },
  pullLow: { spine: [.45, 0, 0], armL: [-.5, 0, .5], armR: [-.5, 0, -.5], foreL: [-.3, 0, 0], foreR: [-.3, 0, 0], legL: [-.9, 0, .35], shinL: [1.2, 0, 0], legR: [-.9, 0, -.35], shinR: [1.2, 0, 0] },
  // Hồng Gia: mã bộ (tấn ngựa)
  horse: Object.assign({ spine: [.05, 0, 0], armL: [-.3, 0, .5], foreL: [-1.6, 0, 0], armR: [-.3, 0, -.5], foreR: [-1.6, 0, 0] }, HL),
  horseFists: Object.assign({ armL: [.35, 0, .15], foreL: [-1.75, 0, 0], armR: [.35, 0, -.15], foreR: [-1.75, 0, 0] }, HL),
  horsePunchR: Object.assign({ chest: [0, .3, 0], armR: [-1.5, 0, -.05], foreR: [0, 0, 0], armL: [.35, 0, .15], foreL: [-1.75, 0, 0] }, HL),
  horseRaise: Object.assign({ armL: [-2, 0, .4], armR: [-2, 0, -.4], foreL: [-.9, 0, 0], foreR: [-.9, 0, 0] }, HL),
  stompUp: { spine: [.1, 0, 0], armL: [-.4, 0, .9], foreL: [-1.9, 0, 0], armR: [-.4, 0, -.9], foreR: [-1.9, 0, 0], legR: [-1.6, 0, -.25], shinR: [1.7, 0, 0], legL: [-.1, 0, .1], shinL: [.2, 0, 0] },
  brace: { spine: [.25, 0, 0], head: [.15, 0, 0], armL: [-1.35, -.9, .1], foreL: [-1.9, 0, 0], armR: [-1.35, .9, -.1], foreR: [-1.9, 0, 0], legL: [-.9, 0, .15], shinL: [1, 0, 0], legR: [.5, 0, -.2], shinR: [.5, 0, 0] },
  land: { spine: [.75, 0, 0], head: [-.5, 0, 0], armR: [-.75, 0, -.1], foreR: [-.1, 0, 0], armL: [.6, 0, .6], foreL: [-.5, 0, 0], legL: [-1.75, 0, .25], shinL: [2.3, 0, 0], legR: [-.35, 0, -.2], shinR: [2, 0, 0] },
  dive: { spine: [.5, 0, 0], head: [-.4, 0, 0], armR: [-2.7, 0, -.1], foreR: [-.1, 0, 0], armL: [.3, 0, .5], foreL: [-.8, 0, 0], legL: [-.3, 0, .1], shinL: [1.4, 0, 0], legR: [.3, 0, -.1], shinR: [.9, 0, 0] },
  hit: { spine: [-.4, 0, 0], chest: [-.2, 0, 0], head: [-.35, 0, 0], armL: [-.7, 0, 1.2], foreL: [-.5, 0, 0], armR: [-.4, 0, -1.3], foreR: [-.6, 0, 0], legL: [-.7, 0, .2], shinL: [.9, 0, 0], legR: [-.2, 0, -.2], shinR: [.8, 0, 0] },
  kneel: { spine: [.5, 0, 0], head: [.25, 0, 0], armL: [-1, 0, .1], foreL: [-.5, 0, 0], armR: [-.3, 0, -.25], foreR: [-.15, 0, 0], legL: [-1.5, 0, .1], shinL: [1.55, 0, 0], legR: [.05, 0, -.05], shinR: [1.6, 0, 0] },
  float: { spine: [-.12, 0, 0], head: [-.15, 0, 0], armL: [-.25, 0, .75], foreL: [-.35, 0, 0], armR: [-.25, 0, -.75], foreR: [-.35, 0, 0], legL: [-.1, 0, .08], shinL: [.3, 0, 0], legR: [-.45, 0, -.05], shinR: [.8, 0, 0] },
  charge: { hips: [.55, 0, 0], head: [-.5, 0, 0], armR: [-2.5, 0, -.1], foreR: [-.1, 0, 0], armL: [.4, 0, .4], foreL: [-.9, 0, 0], legL: [.2, 0, .1], shinL: [.5, 0, 0], legR: [-.3, 0, -.1], shinR: [1.1, 0, 0] },
  // Bắc Thiếu Lâm / quyền thủ: thủ thế, đấm thẳng tay dài, đá cao
  box: { hips: [0, -.4, 0], head: [0, .4, 0], spine: [.12, 0, 0], armL: [-.95, -.3, .15], foreL: [-2, 0, 0], armR: [-.55, .4, -.3], foreR: [-2.15, 0, 0], legL: [-.4, 0, .12], shinL: [.55, 0, 0], legR: [.15, 0, -.18], shinR: [.5, 0, 0] },
  jab: { hips: [0, -.6, 0], head: [0, .6, 0], spine: [.15, 0, 0], armL: [-1.5, 0, .55], foreL: [-.05, 0, 0], armR: [-.55, .4, -.3], foreR: [-2.15, 0, 0], legL: [-.6, 0, .12], shinL: [.7, 0, 0], legR: [.3, 0, -.18], shinR: [.4, 0, 0] },
  cross: { hips: [0, .5, 0], head: [0, -.5, 0], spine: [.2, 0, 0], armR: [-1.5, 0, -.45], foreR: [-.05, 0, 0], armL: [-.8, -.3, .2], foreL: [-2.1, 0, 0], legL: [-.7, 0, .12], shinL: [.8, 0, 0], legR: [.45, 0, -.15], shinR: [.35, 0, 0] },
  kick: { spine: [-.3, 0, 0], head: [.2, 0, 0], armL: [-.9, -.3, .3], foreL: [-1.8, 0, 0], armR: [.4, 0, -.7], foreR: [-.7, 0, 0], legR: [-1.65, 0, -.05], shinR: [.05, 0, 0], legL: [.08, 0, .08], shinL: [.2, 0, 0] },
  flyKick: { spine: [-.35, 0, 0], head: [.3, 0, 0], armL: [.5, 0, .8], foreL: [-.6, 0, 0], armR: [.5, 0, -.8], foreR: [-.6, 0, 0], legR: [-1.3, 0, 0], shinR: [0, 0, 0], legL: [-1.2, 0, .1], shinL: [2, 0, 0] },
  walkA: { armL: [.4, 0, .1], armR: [-.4, 0, -.1], foreL: [-.3, 0, 0], foreR: [-.3, 0, 0], legL: [-.45, 0, 0], shinL: [.25, 0, 0], legR: [.35, 0, 0], shinR: [.5, 0, 0] }
};
P.kneelUp = Object.assign({}, P.kneel, { spine: [.2, 0, 0], head: [-.3, 0, 0] });
P.baguaB = mirror(P.bagua); P.sweepR = mirror(P.sweepL); P.horsePunchL = mirror(P.horsePunchR); P.walkB = mirror(P.walkA);

function capsule(r, len, m) {
  const g = new T.CapsuleGeometry(r, Math.max(.001, len - 2 * r), 4, 10); g.translate(0, -len / 2, 0);
  const me = new T.Mesh(g, m); me.castShadow = true; return me;
}
function mesh(g, m, x = 0, y = 0, z = 0) { const me = new T.Mesh(g, m); me.position.set(x, y, z); me.castShadow = true; return me; }

function headTextures(c) {
  const W = 512, H = 256, fx = 128;
  const paint = (g, em) => {
    g.fillStyle = em ? '#000' : c.skinCss; g.fillRect(0, 0, W, H);
    if (c.hairCss && !em) { // tóc vẽ thẳng lên da đầu
      g.fillStyle = c.hairCss;
      for (let x = 0; x < W; x++) { let d = Math.abs(x - fx); if (d > 256) d = 512 - d; const yh = 84 + sstep(34, 112, d) * 96 - 10 * Math.exp(-d * d / 300); g.fillRect(x, 0, 1, yh); }
    }
    if (c.arrow) { // mũi tên Khí Tông: từ gáy qua đỉnh đầu xuống trán
      g.fillStyle = em ? '#fff' : '#4aa9dc';
      for (let y = 0; y < H; y++) {
        const s = Math.max(.06, Math.sin(PI * (y + .5) / H));
        if (y < 98) { const hw = Math.min(128, 15 / s); g.fillRect(fx - hw, y, hw * 2, 1); }
        const hb = Math.min(128, 13 / s); g.fillRect(384 - hb, y, hb * 2, 1);
      }
      g.beginPath(); g.moveTo(fx - 33, 90); g.lineTo(fx + 33, 90); g.lineTo(fx, 124); g.closePath(); g.fill();
    }
    for (const s of [-1, 1]) { // mắt
      const ex = fx + s * 27, ey = 137;
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(ex, ey, 13, c.eyeH, 0, 0, TAU); g.fill();
      if (!em) {
        g.fillStyle = c.iris; g.beginPath(); g.arc(ex, ey + 1, 7, 0, TAU); g.fill();
        g.fillStyle = '#111'; g.beginPath(); g.arc(ex, ey + 1, 3.4, 0, TAU); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(ex + 2.5, ey - 2, 1.8, 0, TAU); g.fill();
        g.strokeStyle = '#1c1210'; g.lineWidth = c.lash; g.beginPath(); g.ellipse(ex, ey, 13.5, c.eyeH + .5, 0, PI * 1.05, PI * 1.95); g.stroke();
        g.strokeStyle = c.brow; g.lineWidth = c.browW; g.lineCap = 'round'; g.beginPath(); g.moveTo(ex - s * 13, ey - 17); g.quadraticCurveTo(ex + s * 2, ey - 23, ex + s * 15, ey - 16); g.stroke();
      }
    }
    if (!em) {
      g.strokeStyle = 'rgba(60,30,20,.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(fx - 3, 155); g.lineTo(fx + 3, 155); g.stroke();
      g.strokeStyle = c.mouth; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.arc(fx, 164, 11, .2 * PI, .8 * PI); g.stroke();
    }
  };
  const map = canvasTex(W, H, g => paint(g, false)), em = canvasTex(W, H, g => paint(g, true));
  return { map, em };
}

class Fighter {
  constructor(c) {
    this.c = c; this.scale = c.scale; this.glowMats = [];
    const J = this.J = {}, g = n => (J[n] = new T.Group());
    const root = this.root = new T.Group(); root.scale.setScalar(c.scale); scene.add(root);
    const hips = g('hips'); root.add(hips);
    const spine = g('spine'); spine.position.y = .06; hips.add(spine);
    const chest = g('chest'); chest.position.y = .2; spine.add(chest);
    const head = g('head'); head.position.y = .27; chest.add(head);
    const M = c.mats;
    hips.add(mesh(new T.SphereGeometry(.165, 14, 10), M.pants).translateY(-.02)); hips.children[hips.children.length - 1].scale.set(1.12, .8, .85);
    const ab = mesh(new T.CylinderGeometry(.155, .145, .26, 14), M.top, 0, .1, 0); ab.scale.z = .8; spine.add(ab);
    const ch = mesh(new T.CylinderGeometry(.2, .155, .27, 14), M.top, 0, .1, 0); ch.scale.z = .72; chest.add(ch);
    chest.add(mesh(new T.CylinderGeometry(.05, .055, .1, 10), M.skin, 0, .27, 0));
    const tex = headTextures(c);
    this.headMat = new T.MeshLambertMaterial({ map: tex.map, emissiveMap: tex.em, emissive: 0xbfeaff, emissiveIntensity: 0 });
    const hm = mesh(new T.SphereGeometry(.15, 28, 20), this.headMat, 0, .14, 0); hm.scale.set(.95, 1.08, 1); head.add(hm);
    for (const [s, sx] of [['L', 1], ['R', -1]]) {
      const arm = g('arm' + s); arm.position.set(sx * .215, .2, 0); chest.add(arm);
      const fore = g('fore' + s); fore.position.y = -.27; arm.add(fore);
      const hand = g('hand' + s); hand.position.y = -.26; fore.add(hand);
      const leg = g('leg' + s); leg.position.set(sx * .1, 0, 0); hips.add(leg);
      const shin = g('shin' + s); shin.position.y = -.43; leg.add(shin);
      const foot = g('foot' + s); foot.position.y = -.43; shin.add(foot);
      chest.add(mesh(new T.SphereGeometry(.078, 10, 8), M.sleeve, sx * .215, .2, 0));
      arm.add(capsule(.06, .31, M.sleeve)); fore.add(capsule(.05, .29, M.fore));
      hand.add(mesh(new T.SphereGeometry(.058, 10, 8), M.skin, 0, -.02, 0));
      leg.add(capsule(.09, .47, M.pants)); shin.add(capsule(.072, .46, M.boot));
      foot.add(mesh(new T.BoxGeometry(.11, .07, .24), M.shoe, 0, -.03, .06));
    }
    c.dress(this, J, M);
    this.pose = P.stand;
  }
  applyPose(a, b, u, t) {
    const J = this.J;
    for (const n of JN) { const x = a[n] || Z3, y = b[n] || Z3; J[n].rotation.set(lerp(x[0], y[0], u), lerp(x[1], y[1], u), lerp(x[2], y[2], u)); }
    J.chest.rotation.x += Math.sin(t * 2.2 + this.scale * 9) * .02;
    const h = J.hips, s = this.scale; h.position.y = .92; this.root.updateMatrixWorld(true);
    let m = 1e9;
    for (const n of ['footL', 'footR']) m = Math.min(m, J[n].matrixWorld.elements[13] - .065 * s);
    for (const n of ['shinL', 'shinR']) m = Math.min(m, J[n].matrixWorld.elements[13] - .075 * s);
    h.position.y += (this.root.position.y - m) / s; this.root.updateMatrixWorld(true);
  }
  wp(n, o) { return (o || new V3()).setFromMatrixPosition(this.J[n].matrixWorld); }
  hand(s) { return this.wp('hand' + s); }
  hands() { return this.wp('handL').add(this.wp('handR')).multiplyScalar(.5); }
  chestP() { return this.wp('chest').add(v(0, .1 * this.scale, 0)); }
  headP() { return this.wp('head').add(v(0, .13 * this.scale, 0)); }
  setGlow(x) { this.headMat.emissiveIntensity = x * 3; for (const m of this.glowMats) m.emissiveIntensity = x * 2.5; }
}

const aang = new Fighter({
  scale: .9, skinCss: '#f0c8a2', iris: '#7d8790', eyeH: 10.5, lash: 2, brow: '#3a2a22', browW: 3.5, mouth: 'rgba(120,50,40,.8)', arrow: true,
  mats: { skin: lam(0xf0c8a2), top: lam(0xe9b23c), sleeve: lam(0xe9b23c), fore: lam(0xf0c8a2), pants: lam(0xdca335), boot: lam(0xb85a20), shoe: lam(0x8f4318) },
  dress(f, J, M) {
    const or = lam(0xe0602a, { side: T.DoubleSide }), red = lam(0xc2401f), blue = new T.MeshLambertMaterial({ color: 0x4aa9dc, emissive: 0xbfeaff, emissiveIntensity: 0 });
    f.glowMats.push(blue);
    J.chest.add(mesh(new T.CylinderGeometry(.085, .31, .27, 16, 1, true), or, 0, .165, 0));       // khăn choàng cam
    const flap = mesh(new T.CylinderGeometry(.2, .26, .34, 12, 1, true, PI * .55, PI * .9), or, 0, -.08, -.02); J.chest.add(flap);
    const belt = mesh(new T.TorusGeometry(.158, .032, 8, 18), red, 0, .06, 0); belt.rotation.x = PI / 2; belt.scale.y = .82; J.hips.add(belt);
    J.hips.add(mesh(new T.CylinderGeometry(.165, .21, .17, 14, 1, true), new T.MeshLambertMaterial({ color: 0xe9b23c, side: T.DoubleSide }), 0, -.05, 0));
    for (const s of ['L', 'R']) {
      J['hand' + s].add(mesh(new T.BoxGeometry(.05, .075, .04), blue, 0, -.015, .045));
      J['fore' + s].add(mesh(new T.BoxGeometry(.03, .2, .02), blue, 0, -.14, .042));
      J.head.add(mesh(new T.SphereGeometry(.035, 8, 6), M.skin, (s === 'L' ? 1 : -1) * .14, .13, 0));
    }
  }
});
const korra = new Fighter({
  scale: 1, skinCss: '#a8714c', iris: '#49b7e8', eyeH: 9.5, lash: 3.4, brow: '#2a1a12', browW: 3, mouth: 'rgba(110,40,45,.85)', hairCss: '#35211a',
  mats: { skin: lam(0xa8714c), top: lam(0x79bfe2), sleeve: lam(0xa8714c), fore: lam(0x2c4f86), pants: lam(0x2c4a7c), boot: lam(0x6b4a33), shoe: lam(0x553826) },
  dress(f, J, M) {
    const hair = lam(0x35211a), band = lam(0x8fd0ee), pelt = lam(0x7a5236, { side: T.DoubleSide }), fur = lam(0xe8dcc6), navy = lam(0x23406f);
    const tail = new T.Group(); tail.position.set(0, .25, -.1); tail.rotation.x = 1.95; J.head.add(tail);
    tail.add(capsule(.05, .2, hair)); tail.add(mesh(new T.CylinderGeometry(.052, .052, .05, 10), band, 0, -.05, 0));
    const t2 = new T.Group(); t2.position.y = -.19; t2.rotation.x = -1.25; tail.add(t2); t2.add(capsule(.045, .26, hair));
    const cap = mesh(new T.SphereGeometry(.158, 20, 12, 0, TAU, 0, PI * .5), hair, 0, .145, -.012); cap.rotation.x = -.5; cap.scale.set(.97, 1.06, 1.02); J.head.add(cap);
    for (const sx of [-1, 1]) {
      const st = new T.Group(); st.position.set(sx * .135, .13, .05); J.head.add(st);
      st.add(capsule(.03, .22, hair)); st.add(mesh(new T.CylinderGeometry(.034, .034, .07, 8), band, 0, -.09, 0));
    }
    const collar = mesh(new T.TorusGeometry(.075, .022, 6, 14), fur, 0, .25, 0); collar.rotation.x = PI / 2; J.chest.add(collar);
    const trimC = mesh(new T.CylinderGeometry(.203, .19, .04, 14), navy, 0, .0, 0); trimC.scale.z = .72; J.chest.add(trimC);
    J.hips.add(mesh(new T.CylinderGeometry(.19, .27, .3, 14, 1, true, PI * .2, PI * 1.6), pelt, 0, -.1, 0));
    const ft = mesh(new T.TorusGeometry(.265, .03, 6, 18, PI * 1.6), fur, 0, -.25, 0); ft.rotation.x = PI / 2; ft.rotation.z = -PI * .3; J.hips.add(ft);
    const belt = mesh(new T.TorusGeometry(.165, .03, 8, 18), navy, 0, .05, 0); belt.rotation.x = PI / 2; belt.scale.y = .82; J.hips.add(belt);
    for (const s of ['L', 'R']) {
      J['arm' + s].add(mesh(new T.CylinderGeometry(.066, .066, .06, 10), navy, 0, -.13, 0));
      const tr = mesh(new T.TorusGeometry(.078, .024, 6, 12), fur, 0, -.03, 0); tr.rotation.x = PI / 2; J['shin' + s].add(tr);
    }
  }
});

/* ───────────────────────── Đạo cụ ───────────────────────── */
const rockMat = new T.MeshLambertMaterial({ color: 0x6d655c, flatShading: true });
const rocks = [0, 1, 2].map(() => { const m = mesh(new T.DodecahedronGeometry(.55, 0), rockMat); m.visible = false; scene.add(m); return m; });
const slabs = [-1.15, 0, 1.15].map(z => { const m = mesh(new T.BoxGeometry(.55, 2.6, 1.12), rockMat, -2.4, -1.4, z); m.rotation.y = rs(.06); m.visible = false; scene.add(m); return m; });
const pillar = mesh(new T.CylinderGeometry(.75, .95, 3.4, 7), rockMat, 5, -1.8, 0); pillar.visible = false; scene.add(pillar);
const iceMat = new T.MeshLambertMaterial({ color: 0xbfeaff, emissive: 0x4aa0d8, emissiveIntensity: .6, transparent: true, opacity: .9, flatShading: true });
const shards = [0, 1, 2, 3, 4].map(() => { const m = mesh(new T.ConeGeometry(.11, .8, 5), iceMat); m.visible = false; scene.add(m); return m; });
const chunks = Array.from({ length: 18 }, () => { const m = mesh(new T.DodecahedronGeometry(.2, 0), rockMat); m.visible = false; scene.add(m); return { m, vel: v(0, 0, 0), life: 0, spin: v(0, 0, 0) }; });
const orbitRocks = Array.from({ length: 8 }, () => { const m = mesh(new T.DodecahedronGeometry(.17, 0), rockMat); m.visible = false; scene.add(m); return m; });
const ringGeo = new T.RingGeometry(.82, 1, 48);
const rings = [0, 1, 2, 3].map(() => { const m = new T.Mesh(ringGeo, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide })); m.visible = false; scene.add(m); return { m, t0: -9, d: 1, r: 8 }; });
const auraMat = () => new T.MeshBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false });
const auras = [0, 1].map(() => { const m = new T.Mesh(new T.SphereGeometry(1.5, 20, 14), auraMat()); m.visible = false; scene.add(m); return m; });
const crater = new T.Mesh(new T.CircleGeometry(4, 40), new T.MeshBasicMaterial({
  transparent: true, depthWrite: false, map: canvasTex(512, 512, (g) => {
    const r = g.createRadialGradient(256, 256, 0, 256, 256, 256); r.addColorStop(0, 'rgba(8,6,5,.9)'); r.addColorStop(.45, 'rgba(15,12,10,.6)'); r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r; g.fillRect(0, 0, 512, 512); g.strokeStyle = 'rgba(0,0,0,.8)'; g.lineWidth = 3;
    for (let i = 0; i < 16; i++) { let a = i / 16 * TAU + rs(.2), x = 256, y = 256; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { a += rs(.35); x += Math.cos(a) * rnd(25, 48); y += Math.sin(a) * rnd(25, 48); g.lineTo(x, y); } g.stroke(); }
  })
}));
crater.rotation.x = -PI / 2; crater.position.y = .02; crater.visible = false; scene.add(crater);

function spawnChunks(p, n, sp) {
  let k = 0;
  for (const c of chunks) { if (k >= n) break; if (c.life > 0) continue; k++; c.life = rnd(1.4, 2.4); c.m.visible = true; c.m.position.copy(p).add(v(rs(.5), rs(.5), rs(.5))); c.m.scale.setScalar(rnd(.6, 1.6)); c.vel.set(rs(sp), rnd(2, sp), rs(sp)); c.spin.set(rs(8), rs(8), rs(8)); }
}
function ring(p, r, d, col, flat = true) {
  const g = rings.reduce((a, b) => a.t0 < b.t0 ? a : b);
  g.t0 = filmT; g.d = d; g.r = r; g.m.position.copy(p); g.m.material.color.set(col); g.m.rotation.set(flat ? -PI / 2 : 0, flat ? 0 : PI / 2, 0); g.m.visible = true;
}
let shake = 0, lightA = 0; const lightAPos = v(0, 2, 0);
function flashLight(p, i) { lightAPos.copy(p); lightA = Math.max(lightA, i); }
function explode(p, sc = 1, fire = true) {
  const n = 70 * sc;
  if (fire) for (let i = 0; i < n; i++) { const d = v(rs(1), rnd(-.2, 1), rs(1)).normalize().multiplyScalar(rnd(2, 9) * Math.sqrt(sc)); ADD.emit(p.x, p.y, p.z, d.x, d.y, d.z, rnd(.4, 1), 1 * sc, .1, C.fa0, C.f1, .55, 1.5, 1.8); }
  pSpark(p, 30 * sc, 10); pDust(v(p.x, 0, p.z), 18 * sc, 3.5, 1.2);
  flashLight(v(p.x, p.y + .6, p.z), 260 * sc); shake = Math.max(shake, .35 * sc);
  ring(v(p.x, .06, p.z), 5 * sc, .6, 0xffc890);
}

/* ───────────────────────── Âm thanh (Web Audio, mở khóa cho iPhone) ───────────────────────── */
const AU = { ctx: null, master: null, bus: null, noise: null, muted: false, drone: null, silent: null };
function audioUnlock() { // PHẢI gọi đồng bộ trong sự kiện chạm
  try {
    // iOS 16.4+: cho Web Audio phát cả khi gạt nút im lặng
    if (navigator.audioSession) navigator.audioSession.type = 'playback';
  } catch (e) { }
  try {
    if (!AU.silent) { // iOS cũ: một thẻ <audio> im lặng lặp lại sẽ chuyển Web Audio sang kênh "media"
      const sr = 8000, n = sr / 2, b = new Uint8Array(44 + n), dv = new DataView(b.buffer);
      const w = (o, s) => { for (let i = 0; i < s.length; i++) b[o + i] = s.charCodeAt(i); };
      w(0, 'RIFF'); dv.setUint32(4, 36 + n, true); w(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
      dv.setUint32(24, sr, true); dv.setUint32(28, sr, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true); w(36, 'data'); dv.setUint32(40, n, true); b.fill(128, 44);
      let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
      const el = AU.silent = document.createElement('audio');
      el.setAttribute('playsinline', ''); el.setAttribute('webkit-playsinline', ''); el.setAttribute('x-webkit-airplay', 'deny');
      el.preload = 'auto'; el.loop = true; el.src = 'data:audio/wav;base64,' + btoa(s);
    }
    const pr = AU.silent.play(); if (pr && pr.catch) pr.catch(() => { });
  } catch (e) { }
  try {
    if (!AU.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      const ctx = AU.ctx = new AC();
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 5; comp.attack.value = .004; comp.release.value = .2;
      AU.master = ctx.createGain(); AU.master.gain.value = AU.muted ? 0 : .9; AU.master.connect(comp); comp.connect(ctx.destination);
      AU.bus = ctx.createGain(); AU.bus.connect(AU.master);
      const dl = ctx.createDelay(1); dl.delayTime.value = .27; const fb = ctx.createGain(); fb.gain.value = .33; const wet = ctx.createGain(); wet.gain.value = .28;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
      AU.send = ctx.createGain(); AU.send.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(wet); wet.connect(AU.master);
      const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      AU.noise = nb;
      const dg = ctx.createGain(); dg.gain.value = 0; const df = ctx.createBiquadFilter(); df.type = 'lowpass'; df.frequency.value = 260; df.connect(dg); dg.connect(AU.master);
      for (const [f, ty] of [[73.42, 'sawtooth'], [73.9, 'sawtooth'], [110, 'triangle'], [36.71, 'sine']]) { const o = ctx.createOscillator(); o.type = ty; o.frequency.value = f; o.connect(df); o.start(); }
      AU.drone = dg;
      ctx.onstatechange = () => { };
    }
    const ctx = AU.ctx;
    if (ctx.state !== 'running') ctx.resume();
    const s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, 22050); s.connect(ctx.destination); s.start(0);
  } catch (e) { }
}
const now = () => AU.ctx ? AU.ctx.currentTime : 0;
function envGain(at, a, s, d, peak, dest) {
  const g = AU.ctx.createGain(); g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(peak, at + a);
  g.gain.setValueAtTime(peak, at + a + s); g.gain.setTargetAtTime(0, at + a + s, d / 3.5); g.connect(dest || AU.bus); return g;
}
function tone(at, o) { // {f,f1,type,a,s,d,vol,dest,send,vib}
  if (!AU.ctx || quiet) return; at = at || now();
  const a = o.a || .005, s = o.s || 0, d = o.d || .3, end = at + a + s + d * 1.6;
  const g = envGain(at, a, s, d, o.vol || .2, o.dest), os = AU.ctx.createOscillator(); os.type = o.type || 'sine';
  os.frequency.setValueAtTime(o.f, at); if (o.f1) os.frequency.exponentialRampToValueAtTime(o.f1, at + (o.ft || (a + s + d)));
  if (o.vib) { const l = AU.ctx.createOscillator(), lg = AU.ctx.createGain(); l.frequency.value = 5.3; lg.gain.value = o.f * o.vib; l.connect(lg); lg.connect(os.frequency); l.start(at); l.stop(end); }
  let out = os; if (o.lp) { const f = AU.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; os.connect(f); out = f; }
  out.connect(g); if (o.send) { const sg = AU.ctx.createGain(); sg.gain.value = o.send; g.connect(sg); sg.connect(AU.send); }
  os.start(at); os.stop(end);
}
function noise(at, o) { // {ft:'lowpass',f,f1,q,a,s,d,vol,trem}
  if (!AU.ctx || quiet) return; at = at || now();
  const a = o.a || .005, s = o.s || 0, d = o.d || .3, end = at + a + s + d * 1.6;
  const src = AU.ctx.createBufferSource(); src.buffer = AU.noise; src.loop = true;
  const f = AU.ctx.createBiquadFilter(); f.type = o.ft || 'lowpass'; f.Q.value = o.q || .7; f.frequency.setValueAtTime(o.f, at);
  if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, at + (o.fd || (a + s + d)));
  const g = envGain(at, a, s, d, o.vol || .2); src.connect(f);
  if (o.trem) { const tg = AU.ctx.createGain(); tg.gain.value = .6; const l = AU.ctx.createOscillator(), lg = AU.ctx.createGain(); l.type = 'sawtooth'; l.frequency.value = o.trem; lg.gain.value = .4; l.connect(lg); lg.connect(tg.gain); l.start(at); l.stop(end); f.connect(tg); tg.connect(g); } else f.connect(g);
  if (o.send) { const sg = AU.ctx.createGain(); sg.gain.value = o.send; g.connect(sg); sg.connect(AU.send); }
  src.start(at, Math.random()); src.stop(end);
}
const S = {
  gong(at, v = 1) { for (const [f, k] of [[82, 1], [131, .7], [197, .5], [263, .4], [341, .3], [455, .2], [612, .12]]) tone(at, { f, f1: f * .985, a: .01, d: 4.5, vol: .16 * k * v, send: .5 }); noise(at, { ft: 'bandpass', f: 900, q: .5, a: .005, d: .5, vol: .12 * v }); },
  taiko(at, v = 1) { tone(at, { f: 125, f1: 46, ft: .22, a: .004, d: .32, vol: .7 * v }); noise(at, { f: 500, a: .002, d: .08, vol: .3 * v }); },
  click(at, v = 1) { noise(at, { ft: 'bandpass', f: 2100, q: 3, a: .001, d: .035, vol: .22 * v }); },
  pluck(at, f, v = 1) { tone(at, { f, type: 'sawtooth', lp: 1800, a: .004, d: .38, vol: .12 * v, send: .4 }); tone(at, { f: f * 2, type: 'triangle', a: .003, d: .2, vol: .05 * v }); },
  flute(at, f, dur, v = 1) { tone(at, { f, a: .08, s: dur, d: .3, vol: .13 * v, vib: .007, send: .7 }); tone(at, { f: f * 2, type: 'triangle', a: .1, s: dur, d: .25, vol: .025 * v }); noise(at, { ft: 'bandpass', f: f * 2, q: 2, a: .05, s: dur, d: .2, vol: .02 * v }); },
  pad(at, dur, v = 1) { for (const f of [146.83, 220, 293.66, 349.23, 440, 587.33]) { tone(at, { f, type: 'sawtooth', lp: 1200, a: dur * .7, s: dur * .25, d: .8, vol: .035 * v, send: .5, vib: .003 }); } },
  riser(at, dur) { tone(at, { f: 80, f1: 720, type: 'sawtooth', lp: 1500, a: dur * .9, s: dur * .1, d: .1, vol: .07 }); noise(at, { ft: 'bandpass', f: 300, f1: 5000, q: 1.2, a: dur * .9, s: dur * .1, d: .1, vol: .1 }); },
  whoosh(v = 1, d = .5) { noise(0, { ft: 'bandpass', f: 500, f1: 2600, q: 1.1, a: d * .4, d: d * .6, vol: .4 * v }); },
  air(v = 1) { noise(0, { ft: 'bandpass', f: 1800, f1: 400, q: .8, a: .05, d: .7, vol: .5 * v }); tone(0, { f: 300, f1: 90, a: .02, d: .4, vol: .15 * v }); },
  fire(v = 1) { noise(0, { f: 1500, f1: 250, a: .02, d: .55, vol: .5 * v, trem: 28 }); tone(0, { f: 150, f1: 60, a: .01, d: .3, vol: .25 * v }); },
  fireStream(d) { noise(0, { f: 900, a: .25, s: d, d: .5, vol: .34, trem: 23 }); noise(0, { ft: 'bandpass', f: 2600, q: .6, a: .3, s: d, d: .4, vol: .09, trem: 37 }); tone(0, { f: 62, type: 'sawtooth', lp: 200, a: .3, s: d, d: .4, vol: .2 }); },
  boom(v = 1) { tone(0, { f: 110, f1: 32, a: .004, d: .9 * v, vol: .8 }); noise(0, { f: 2400, f1: 120, a: .004, d: .9 * v, vol: .6, send: .3 }); },
  water(d) { noise(0, { ft: 'bandpass', f: 700, f1: 1700, q: 1.6, a: .2, s: d, d: .4, vol: .26, trem: 9 }); noise(0, { ft: 'highpass', f: 3500, a: .3, s: d, d: .4, vol: .05 }); },
  splash(v = 1) { noise(0, { ft: 'highpass', f: 1400, a: .004, d: .5, vol: .4 * v }); noise(0, { ft: 'bandpass', f: 500, q: 1, a: .004, d: .25, vol: .3 * v }); },
  ice() { for (let i = 0; i < 7; i++) tone(now() + i * .045, { f: rnd(2200, 5200), a: .002, d: .16, vol: .09, send: .5 }); noise(0, { ft: 'highpass', f: 5000, a: .01, d: .4, vol: .15 }); },
  steam() { noise(0, { ft: 'highpass', f: 2800, a: .01, d: .9, vol: .2 }); },
  rumble(d) { noise(0, { f: 130, a: .1, s: d, d: .4, vol: .9, trem: 17 }); tone(0, { f: 48, f1: 38, a: .1, s: d, d: .3, vol: .4 }); },
  stomp() { tone(0, { f: 90, f1: 35, a: .003, d: .4, vol: .9 }); noise(0, { f: 700, f1: 100, a: .003, d: .3, vol: .5 }); },
  rockHit() { tone(0, { f: 140, f1: 45, a: .002, d: .3, vol: .7 }); noise(0, { ft: 'bandpass', f: 1300, q: .6, a: .002, d: .28, vol: .55 }); },
  shimmer() { for (const f of [587, 880, 1175, 1760, 2349]) tone(0, { f, f1: f * 1.02, a: .7, s: .6, d: 1.6, vol: .04, send: .8, vib: .004 }); },
  wind(d) { noise(0, { ft: 'bandpass', f: 350, f1: 1500, q: 1.4, a: d * .8, s: d * .2, d: .3, vol: .32, trem: 5 }); },
  bigBoom() { tone(0, { f: 95, f1: 22, ft: 2.2, a: .005, d: 3.2, vol: 1 }); noise(0, { f: 5000, f1: 70, fd: 2.6, a: .005, d: 3.4, vol: .9, send: .5 }); noise(0, { ft: 'highpass', f: 3000, a: .002, d: .5, vol: .4 }); }
};
const NT = { D3: 146.83, F3: 174.61, G3: 196, A3: 220, C4: 261.63, D4: 293.66, F4: 349.23, G4: 392, A4: 440, C5: 523.25, D5: 587.33, F5: 698.46, G5: 783.99, A5: 880 };
const MUSIC = [];
{
  const add = (t, fn) => MUSIC.push({ t, fn });
  add(.4, at => S.gong(at, 1));
  [[2, 'D5', 1.1], [3.2, 'F5', .5], [3.8, 'G5', .5], [4.4, 'A5', 1.5], [6.1, 'G5', .5], [6.7, 'F5', .5], [7.3, 'D5', 1.6], [9.2, 'A4', .9], [10.2, 'C5', .7], [11, 'D5', 1.1]].forEach(([t, n, d]) => add(t, at => S.flute(at, NT[n], d)));
  for (let s = 0; 12 + s * .25 < 50; s++) {
    const t = 12 + s * .25, b = s % 8, bar = Math.floor(s / 8), root = [NT.D3, NT.D3, NT.F3, 130.81][bar % 4], hot = t >= 43;
    if (b === 0 || b === 3 || b === 5) add(t, at => S.taiko(at, b ? .7 : 1));
    if (b === 6 && bar % 2) add(t, at => S.taiko(at, .55));
    if (b % 2 || hot) add(t, at => S.click(at, b % 2 ? 1 : .5));
    const mul = [1, 1.498, 2, 1.498, 1.335, 1.498, 2.378, 1.498][b];
    add(t, at => S.pluck(at, root * mul, hot ? 1.1 : .85));
    if ((bar % 4 === 3 || hot) && b >= 6) { add(t + .125, at => S.taiko(at, .5)); }
  }
  for (const t0 of [21.5, 32.5, 42.5]) for (let i = 0; i < 4; i++) add(t0 + i * .125, at => S.taiko(at, .5 + i * .15));
  for (let t = 50; t < 54.4; t += 1) { add(t, at => S.taiko(at, .55)); add(t + .22, at => S.taiko(at, .35)); }
  add(50.5, at => S.pad(at, 10.6, 1)); add(54.6, at => S.riser(at, 6.5));
  for (let t = 54.5, iv = .5; t < 61.1; t += iv, iv = Math.max(.09, iv * .93)) { const tt = t; add(tt, at => S.taiko(at, .45 + (tt - 54.5) * .08)); }
  add(61.25, at => S.gong(at, 1.2));
  [[66.5, 'A4', 1], [67.6, 'C5', .5], [68.2, 'D5', 1.4], [69.9, 'F5', .5], [70.5, 'G5', .5], [71.1, 'A5', 1.8], [73.2, 'G5', .5], [73.8, 'F5', .5], [74.4, 'D5', 2.6]].forEach(([t, n, d]) => add(t, at => S.flute(at, NT[n], d)));
  for (let t = 66.5; t < 76; t += 1) { const k = Math.round(t - 66.5) % 4; add(t, at => S.pluck(at, [NT.D3, NT.A3, NT.F3, NT.A3][k], .7)); }
  add(77, at => S.gong(at, .7));
  MUSIC.sort((a, b) => a.t - b.t);
}

/* ───────────────────────── Kịch bản: chuyển động nhân vật ───────────────────────── */
const H = PI / 2, G = -PI / 2;
function track(list) {
  let p = [0, 0, 0], ry = 0;
  return list.map(([t, pose, o]) => { o = o || {}; if (o.p) p = o.p; if (o.ry !== undefined) ry = o.ry; return { t, pose: P[pose], p, ry, e: EASE[o.e || 's'] }; });
}
const walk = (t0, t1, x0, x1, ry) => { const a = [], n = Math.round((t1 - t0) / .4); for (let i = 1; i <= n; i++) a.push([t0 + (t1 - t0) * i / n, i === n ? 'stand' : i % 2 ? 'walkA' : 'walkB', { p: [lerp(x0, x1, i / n), 0, 0], ry, e: 'lin' }]); return a; };
const TR_A = track([
  [0, 'stand', { p: [-4, 0, 0], ry: H }], [8.2, 'stand'], [8.8, 'bow'], [9.4, 'bow'], [10, 'stand'], [12.2, 'stand'], [13.2, 'bagua'],
  [14.55, 'bagua'], [15.15, 'baguaB', { p: [-3.6, 0, 1.8], ry: H + TAU }], [15.45, 'bagua'], [16.05, 'baguaB', { p: [-3.4, 0, -1.4], ry: H + 2 * TAU }], [16.55, 'bagua'],
  [16.95, 'jump', { p: [-3.7, 1.7, -.7], ry: H + 2.5 * TAU, e: 'out' }], [17.4, 'bagua', { p: [-4, 0, 0], ry: H + 3 * TAU, e: 'in' }],
  [18, 'ward'], [18.45, 'palm'], [19.3, 'palm'], [20, 'bagua'],
  [26.4, 'bagua'], [27, 'ward'], [27.7, 'sweepL'], [28.4, 'sweepR'], [29.1, 'sweepL'], [29.6, 'raise'], [29.85, 'push'], [30.9, 'push'], [31.6, 'bagua'],
  [34.3, 'bagua'], [34.75, 'stompUp'], [35, 'horseRaise'], [37.1, 'horseRaise'], [37.35, 'brace', { p: [-4.6, 0, 0] }], [37.8, 'land', { p: [-5, 0, 0] }],
  [38, 'land'], [38.6, 'jump', { p: [-2.8, 4.6, 0], e: 'out' }], [38.85, 'dive', { p: [-2, 4.4, 0] }], [39.2, 'land', { p: [-.6, 0, 0], e: 'in' }],
  [39.8, 'land'], [40.3, 'bagua'], [40.75, 'bagua'], [41.25, 'brace', { p: [-4.6, 0, 0], e: 'out' }], [42.2, 'bagua', { p: [-4.3, 0, 0] }],
  [43.3, 'ward'], [44, 'push'], [48.45, 'push'],
  [48.9, 'hit', { p: [-5.5, 1.1, 0], e: 'out' }], [49.4, 'land', { p: [-6.5, 0, 0], e: 'in' }], [50.2, 'kneel'], [51.3, 'kneel'], [51.9, 'kneelUp'], [52.5, 'kneelUp'], [53.4, 'stand'], [54.5, 'stand'],
  [58, 'float', { p: [-6, 3.2, 0] }], [60, 'float'], [60.35, 'charge'], [61.2, 'charge', { p: [-.8, 3.2, 0], e: 'in' }],
  [61.9, 'hit', { p: [-3.6, 2.2, 0], e: 'out' }], [62.7, 'land', { p: [-5, 0, 0], e: 'in' }], [63.6, 'kneel'], [65.8, 'kneel'], [66.8, 'stand'], [67.5, 'stand'],
  ...walk(67.5, 70.3, -5, -1.5, H + 3 * TAU), [70.6, 'stand'], [71.3, 'bow'], [72.7, 'bow'], [73.5, 'stand'], [DUR + 1, 'stand']
]);
const TR_K = track([
  [0, 'stand', { p: [4, 0, 0], ry: G }], [10.7, 'stand'], [11.2, 'bow'], [11.7, 'bow'], [12.2, 'stand'], [13.2, 'box'],
  [14.3, 'box'], [14.6, 'jab'], [14.85, 'box'], [15.2, 'box'], [15.5, 'cross'], [15.8, 'box'], [16.25, 'box'], [16.6, 'kick'], [16.9, 'kick'], [17.3, 'box'],
  [18.6, 'box'], [18.95, 'brace'], [19.9, 'brace', { p: [6.5, 0, 0], e: 'out' }], [20.6, 'box'],
  [21, 'box'], [21.8, 'ward', { p: [5, 0, 0] }], [22.8, 'pullLow'], [24.2, 'raise'], [24.9, 'sweepL'], [25.6, 'sweepR'], [26.2, 'sweepL'], [26.5, 'palm'], [27.2, 'palm'], [27.9, 'box'],
  [30, 'box'], [30.2, 'jab'], [30.4, 'box'], [30.55, 'cross'], [30.75, 'box'], [30.95, 'kick'], [31.25, 'kick'], [31.7, 'box'],
  [32.8, 'box'], [33.2, 'stompUp'], [33.5, 'horse'], [34, 'horseFists'], [34.8, 'horseRaise'], [35.2, 'horseFists'], [35.5, 'horsePunchR'], [35.85, 'horseFists'], [36.1, 'horsePunchL'], [36.45, 'horseFists'], [36.7, 'horsePunchR'], [37.3, 'horsePunchR'], [38, 'box'],
  [39.3, 'box'], [39.42, 'hit'], [40.3, 'jump', { p: [4.4, 5.4, 0], e: 'out' }], [40.65, 'flyKick', { p: [3.6, 5.2, 0] }], [41.3, 'flyKick', { p: [-.4, .3, 0], e: 'in' }], [41.5, 'land', { p: [-.4, 0, 0] }], [42, 'land'],
  [42.4, 'jump', { p: [1, 1.2, 0], e: 'out' }], [42.8, 'box', { p: [2.3, 0, 0], e: 'in' }],
  [43.3, 'ward'], [44, 'push'], [48.45, 'push'],
  [48.9, 'hit', { p: [4.5, 1.1, 0], e: 'out' }], [49.4, 'land', { p: [6.5, 0, 0], e: 'in' }], [50.2, 'kneel'], [53.1, 'kneel'], [53.6, 'kneelUp'], [54, 'kneelUp'], [54.5, 'stand'],
  [58, 'float', { p: [6, 3.2, 0] }], [60, 'float'], [60.35, 'charge'], [61.2, 'charge', { p: [.8, 3.2, 0], e: 'in' }],
  [61.9, 'hit', { p: [3.6, 2.2, 0], e: 'out' }], [62.7, 'land', { p: [5, 0, 0], e: 'in' }], [63.6, 'kneel'], [65.8, 'kneel'], [66.8, 'stand'], [67.5, 'stand'],
  ...walk(67.5, 70.3, 5, 1.5, G), [70.6, 'stand'], [71.3, 'bow'], [72.7, 'bow'], [73.5, 'stand'], [DUR + 1, 'stand']
]);
function sample(f, tr, t) {
  let i = 0; while (i < tr.length - 2 && tr[i + 1].t <= t) i++;
  const a = tr[i], b = tr[i + 1], u = b.e(clamp((t - a.t) / (b.t - a.t), 0, 1));
  f.root.position.set(lerp(a.p[0], b.p[0], u), lerp(a.p[1], b.p[1], u), lerp(a.p[2], b.p[2], u));
  f.root.rotation.y = lerp(a.ry, b.ry, u);
  f.applyPose(a.pose, b.pose, u, t);
}

/* ───────────────────────── Kịch bản: sự kiện & hiệu ứng ───────────────────────── */
const EV = [], DU = [], projs = [];
const E = (t, fn) => EV.push({ t, fn }), D = (t0, t1, fn) => DU.push({ t0, t1, fn });
let filmT = 0, quiet = false;
const tmp = v(0, 0, 0), tmp2 = v(0, 0, 0);
const bez = (a, b, c, u, o) => { const k = 1 - u; return o.set(k * k * a.x + 2 * k * u * b.x + u * u * c.x, k * k * a.y + 2 * k * u * b.y + u * u * c.y, k * k * a.z + 2 * k * u * b.z + u * u * c.z); };
function shoot(kind, a, b, d, o) { projs.push(Object.assign({ kind, a: a.clone(), b: b.clone(), t0: filmT, d, arc: 0 }, o || {})); }
function waterRing(f, t, n, r = 1.15) { const c = f.chestP(); for (let k = 0; k < n; k++) { const a = t * 6.5 - Math.random() * 2.2 + (k % 2) * PI; tmp.set(c.x + Math.cos(a) * r, c.y + .28 * Math.sin(a * 2 + t * 3), c.z + Math.sin(a) * r); pWater(tmp, .07); } }

// — Hiệp 1: Hỏa (Korra) đối Khí (Aang)
const fireShot = (t, hand) => E(t, () => { const a = korra.hand(hand), c = aang.chestP(), dir = c.clone().sub(a).setY(0).normalize(); shoot('fire', a, v(c.x + dir.x * 3, .2, c.z + dir.z * 3), .7, { sc: 1 }); S.fire(); pFire(a, 0, 0, 0, 1.2, 3); });
fireShot(14.62, 'L'); fireShot(15.52, 'R');
E(16.6, () => { shoot('crescent', v(3, .95, 0), v(-8, .95, 0), .62); S.fire(1.2); S.whoosh(.6, .4); });
[14.7, 15.6].forEach(t => E(t, () => S.whoosh(.5, .5)));
D(14.55, 17.4, (t, dt) => { const p = aang.root.position; for (let i = cnt(90 * dt); i--;) { const a = rnd(0, TAU); tmp.set(p.x + Math.cos(a) * .7, rnd(.1, 1.5), p.z + Math.sin(a) * .7); pAir(tmp, -Math.sin(a) * 3, .4, Math.cos(a) * 3, .8, .3); } });
E(18.45, () => { const a = aang.hand('R'); shoot('air', a, korra.chestP(), .45); S.air(1.1); });
D(18.95, 19.9, (t, dt) => { tmp.copy(korra.root.position); pDust(tmp, cnt(60 * dt), 1.2, .7); });
// — Hiệp 2: Thủy
const W0 = v(6.5, -.7, 11.4), W1 = v(8.5, 6.5, 5.5);
E(22.8, () => { S.water(3.6); S.splash(.7); pSplash(v(6.5, -.5, 11.4), 40, 5); });
D(22.8, 24.9, (t, dt) => { const hd = sstep(22.8, 24, t), tl = sstep(24.2, 24.9, t), e = korra.hands(); for (let i = cnt(900 * dt * Math.max(.05, hd - tl)); i--;) pWater(bez(W0, W1, e, rnd(tl, hd), tmp), .13); });
D(24.1, 26.5, (t, dt) => waterRing(korra, t, cnt(420 * dt)));
E(26.5, () => { S.whoosh(.8, .6); S.splash(.6); });
D(26.5, 27.3, (t, dt) => { const a = korra.hand('R'), c = aang.chestP(), m = a.clone().lerp(c, .5); m.y += 1.6; m.z += 2.2; const hd = sstep(26.5, 27, t), tl = sstep(26.8, 27.3, t); for (let i = cnt(1000 * dt * Math.max(.05, hd - tl)); i--;) pWater(bez(a, m, c, rnd(tl, hd), tmp), .1); });
E(27, () => S.water(2.2));
D(27, 29.4, (t, dt) => waterRing(aang, t, cnt(440 * dt), 1.05));
E(29.4, () => { S.ice(); const c = aang.chestP(); for (let i = 0; i < 60; i++) pGlow(tmp.set(c.x + rs(1.1), c.y + rs(.6), c.z + rs(1.1)), 0, 1); shards.forEach((s, i) => { s.visible = true; s.position.set(c.x + .5, c.y + .75 + Math.abs(i - 2) * -.14, c.z + (i - 2) * .42); s.rotation.set(0, 0, -PI / 2); s.userData.fly = false; }); });
shards.forEach((s, i) => E(29.86 + i * .15, () => { s.userData.fly = true; const kp = korra.chestP(); shoot('ice', s.position, v(kp.x - 1.5, kp.y + rs(.3), kp.z + (i - 2) * .22), .42, { m: s }); S.whoosh(.35, .3); }));
[[30.2, 'L'], [30.55, 'R']].forEach(([t, h]) => E(t, () => { const a = korra.hand(h); for (let i = 0; i < 40; i++) pFire(a, rnd(-9, -3), rs(1.5), rs(2.5), 1.3, 1); S.fire(.9); flashLight(a, 120); }));
E(30.95, () => { const a = korra.wp('footR'); for (let i = 0; i < 70; i++) pFire(a, rnd(-10, -3), rnd(-1, 3), rs(4), 1.4, 1); S.fire(1.1); flashLight(a, 160); });
// — Hiệp 3: Thổ
E(33.5, () => { S.stomp(); shake = .25; pDust(korra.root.position, 22, 3, 1); ring(v(5, .05, 0), 4, .5, 0xd8c0a0); });
const RZ = [-1.3, 0, 1.3];
E(34, () => { S.rumble(.8); rocks.forEach((r, i) => { r.visible = true; r.position.set(3.7, -.6, RZ[i]); r.rotation.set(rs(3), rs(3), rs(3)); r.userData.fly = false; }); });
D(34, 34.8, (t, dt) => { const u = EASE.out((t - 34) / .8); rocks.forEach((r, i) => { r.position.y = lerp(-.6, 1.25, u); r.rotation.y += dt * 2; pDust(tmp.set(3.7, 0, RZ[i]), cnt(40 * dt), 1.5, .6); }); shake = Math.max(shake, .06); });
D(34.8, 36.7, (t) => rocks.forEach((r, i) => { if (!r.userData.fly && r.visible) r.position.y = 1.25 + Math.sin(t * 5 + i) * .05; }));
[35.5, 36.1, 36.7].forEach((t, i) => E(t, () => {
  const r = rocks[i]; r.userData.fly = true; S.rockHit(); S.whoosh(.5, .4); pDust(r.position, 8, 2, .6);
  shoot('rock', r.position, v(-2.05, 1.15, RZ[i] * .8), .44, { m: r, last: i === 2 });
}));
E(34.78, () => { S.stomp(); shake = .2; });
E(35, () => { S.rumble(.6); slabs.forEach(s => { s.visible = true; s.position.y = -1.4; }); });
D(35, 35.5, (t, dt) => { const u = EASE.out((t - 35) / .5); slabs.forEach(s => { s.position.y = lerp(-1.4, 1.25, u); pDust(tmp.set(-2.4, 0, s.position.z), cnt(50 * dt), 1.5, .7); }); shake = Math.max(shake, .08); });
E(38, () => { S.air(.9); for (let i = 0; i < 50; i++) { const a = rnd(0, TAU); pAir(tmp.set(-5 + Math.cos(a) * .5, .2, Math.sin(a) * .5), Math.cos(a) * 4, 1.5, Math.sin(a) * 4, 1.2); } });
D(38, 39.2, (t, dt) => { tmp.copy(aang.root.position); for (let i = cnt(80 * dt); i--;) pAir(tmp, rs(1), -2, rs(1), .9); });
E(39.2, () => { S.stomp(); S.boom(.7); shake = .5; pDust(v(-.6, 0, 0), 40, 5, 1.3); ring(v(-.6, .05, 0), 8, .6, 0xe8d8c0); });
E(39.32, () => { S.rumble(.5); pillar.visible = true; pillar.position.y = -1.8; });
D(39.32, 39.62, (t, dt) => { pillar.position.y = lerp(-1.8, 1.6, EASE.out((t - 39.32) / .3)); pDust(v(5, 0, 0), cnt(200 * dt), 3, .9); pDebris(v(5, .3, 0), cnt(120 * dt), 5); });
D(42.2, 43.2, (t) => { pillar.position.y = lerp(1.6, -1.9, EASE.in((t - 42.2))); });
E(43.2, () => { pillar.visible = false; });
// — Hiệp 4: Hỏa đối Hỏa
D(40.6, 41.3, (t, dt) => { const a = korra.wp('footR'); for (let i = cnt(260 * dt); i--;) pFire(a, rs(1), 1, rs(1), 1.4, 1.2); flashLight(a, 90); });
E(40.6, () => S.fire(1)); E(40.9, () => S.air(.8));
D(40.75, 41.25, (t, dt) => { tmp.copy(aang.root.position); tmp.y = .15; for (let i = cnt(120 * dt); i--;) pAir(tmp, 5, .3, rs(2), 1.1); });
E(41.3, () => { explode(v(-.7, .3, 0), 1.6); S.boom(1); });
E(42.4, () => S.whoosh(.4, .4));
const clashP = (t, o) => o.set(-1 + 1.25 * Math.sin((t - 44) * 1.35), 1.25, 0);
E(44, () => { S.fireStream(4.3); S.fire(1.2); });
D(44, 48.45, (t, dt) => {
  const m = clashP(t, tmp2), grow = sstep(44, 44.35, t);
  for (const [f, c0, c1] of [[aang, C.fa0, C.fa1], [korra, C.fk0, C.fk1]]) {
    const a = f.hands(), dir = m.clone().sub(a), len = dir.length() * grow; dir.normalize(); const sp = 15, life = len / sp;
    for (let i = cnt(330 * dt); i--;) { const o = rnd(0, .5); ADD.emit(a.x + dir.x * o + rs(.07), a.y + dir.y * o + rs(.07), a.z + rs(.07), dir.x * sp + rs(.9), dir.y * sp + rs(.9), rs(.9), life * rnd(.8, 1.05), .32, .85, c0, c1, .5, 0, 0); }
  }
  if (grow > .95) { for (let i = cnt(240 * dt); i--;) { const a = rnd(0, TAU), s = rnd(2, 7); ADD.emit(m.x, m.y, m.z, rs(1), Math.sin(a) * s, Math.cos(a) * s, rnd(.25, .6), .8, .1, C.fa0, C.f1, .55, 1, 1.5); } pSpark(m, cnt(50 * dt), 9); flashLight(m, 150 + rs(40)); shake = Math.max(shake, .05); }
});
E(48.45, () => { explode(clashP(48.45, v(0, 0, 0)), 2.2); S.boom(1.3); });
// — Trạng thái Avatar
E(51.5, () => S.shimmer()); E(53.3, () => S.shimmer());
E(54.5, () => { S.wind(6.6); auras.forEach(a => a.visible = true); orbitRocks.forEach(r => r.visible = true); });
D(51.5, 54.5, (t, dt) => { for (const [f, t0] of [[aang, 51.5], [korra, 53.3]]) if (t > t0) for (let i = cnt(50 * dt); i--;) pGlow(f.chestP(), .5); });
D(54.5, 61.2, (t, dt) => {
  const k = sstep(54.5, 58, t);
  [aang, korra].forEach((f, fi) => {
    const c = f.chestP(), s = fi ? -1 : 1;
    auras[fi].position.copy(c); auras[fi].scale.setScalar(.9 + .12 * Math.sin(t * 9 + fi) + k * .25); auras[fi].material.opacity = .06 + .07 * k;
    fxL[1 + fi].position.copy(c); fxL[1 + fi].intensity = 22 * k + 10;
    for (let i = cnt(170 * dt); i--;) { const a = rnd(0, TAU), y = rnd(-1.6, 1.6), r = 1.5 * Math.sqrt(Math.max(.05, 1 - y * y / 2.9)); pAir(tmp.set(c.x + Math.cos(a) * r, c.y + y, c.z + Math.sin(a) * r), -Math.sin(a) * 6 * s, .8, Math.cos(a) * 6 * s, .8, .2); }
    for (let i = cnt(150 * dt * k); i--;) { const a = t * 4 * s - Math.random() * 1.4; tmp.set(Math.cos(a) * 1.9, Math.sin(a) * 1.9 * .45, Math.sin(a) * 1.9); pWater(tmp.set(c.x + tmp.x, c.y + tmp.y, c.z + tmp.z), .06, .3); }
    for (let i = cnt(110 * dt * k); i--;) { const a = -t * 5 * s + Math.random() * 1.2; pFire(tmp.set(c.x + Math.cos(a) * 2.15, c.y - Math.sin(a) * .9, c.z + Math.sin(a) * 2.15), 0, 0, 0, .75, .25); }
    for (let i = 0; i < 4; i++) { const r = orbitRocks[fi * 4 + i], a = t * 2.6 * s + i * H; r.position.set(c.x + Math.cos(a) * 2.4, c.y + Math.sin(t * 2 + i * 2) * .6 - .3 + (1 - k) * -2.5, c.z + Math.sin(a) * 2.4); r.rotation.x += dt * 3; r.rotation.y += dt * 2; }
    for (let i = cnt(40 * dt); i--;) { pGlow(c, .8); NRM.emit(c.x + rs(2), .05, c.z + rs(2), 0, rnd(1, 3), 0, 1.4, .2, .6, C.d0, C.d1, .3, .5, .3); }
  });
  shake = Math.max(shake, .02 + .05 * sstep(59, 61.2, t));
});
E(60, () => { S.whoosh(1, 1.2); });
E(61.2, () => {
  S.bigBoom(); shake = 1.6; const p = v(0, 3.2, 0);
  explode(p, 3, true); spawnChunks(v(0, .5, 0), 16, 11); crater.visible = true;
  auras.forEach(a => a.visible = false); orbitRocks.forEach(r => r.visible = false); fxL[1].intensity = fxL[2].intensity = 0;
  for (let i = 0; i < 260; i++) { const d = v(rs(1), rs(1), rs(1)).normalize().multiplyScalar(rnd(4, 22)); const c = [C.a0, C.w0, C.fa0, C.g0][i % 4]; ADD.emit(p.x, p.y, p.z, d.x, d.y, d.z, rnd(.6, 1.7), 1.1, .1, c, c, .6, 0, 1.6); }
  for (let i = 0; i < 160; i++) { const a = rnd(0, TAU), s = rnd(5, 13); NRM.emit(Math.cos(a) * .5, .15, Math.sin(a) * .5, Math.cos(a) * s, rnd(.2, 2), Math.sin(a) * s, rnd(1.6, 3.4), .9, 3, C.d0, C.d1, .45, .15, 1.1); }
  pDebris(v(0, .5, 0), 80, 11);
  ring(v(0, .08, 0), 22, 1.3, 0xffffff); ring(p, 14, .8, 0xbfe6ff, false);
});
E(61.5, () => ring(v(0, .08, 0), 16, 1.6, 0xffd9a0));
D(61.5, 68, (t, dt) => { const k = 1 - sstep(61.5, 68, t); for (let i = cnt(26 * dt * k); i--;) NRM.emit(rs(8), rnd(.1, 3), rs(8), rs(.3), rnd(-.2, .2), rs(.3), rnd(2, 3.5), 1, 2.6, C.d0, C.d1, .22, 0, .4); });
EV.sort((a, b) => a.t - b.t);

function projUpdate(t, dt) {
  for (let i = projs.length - 1; i >= 0; i--) {
    const p = projs[i], u = (t - p.t0) / p.d, pos = tmp.copy(p.a).lerp(p.b, clamp(u, 0, 1)); pos.y += Math.sin(clamp(u, 0, 1) * PI) * p.arc;
    const vx = (p.b.x - p.a.x) / p.d, vz = (p.b.z - p.a.z) / p.d;
    if (p.kind === 'fire') { for (let k = cnt(420 * dt); k--;) pFire(pos, vx * .15, 0, vz * .15, 1.15, 1); flashLight(pos, 110); }
    else if (p.kind === 'crescent') { for (let k = cnt(700 * dt); k--;) { const a = rs(1.25); tmp2.set(pos.x - (1 - Math.cos(a)) * 1.6, pos.y + rs(.1), Math.sin(a) * 2.3); pFire(tmp2, vx * .25, 0, 0, 1, .6); } flashLight(pos, 130); }
    else if (p.kind === 'air') { for (let k = cnt(520 * dt); k--;) { const a = rnd(0, TAU), r = rnd(.2, .65); tmp2.set(pos.x, pos.y + Math.cos(a) * r, pos.z + Math.sin(a) * r); pAir(tmp2, vx * .5, -Math.sin(a) * 3, Math.cos(a) * 3, 1, .2); } }
    else if (p.kind === 'rock') { p.m.position.copy(pos); p.m.rotation.x += dt * 9; p.m.rotation.z += dt * 6; pDust(pos, cnt(40 * dt), .6, .45); }
    else if (p.kind === 'ice') { p.m.position.copy(pos); pGlow(pos, .05, .6); }
    if (u >= 1) {
      projs.splice(i, 1); const h = pos.clone();
      if (p.kind === 'fire') { explode(h, .8); S.boom(.55); }
      else if (p.kind === 'crescent') { pDust(h, 10, 2); }
      else if (p.kind === 'air') { S.boom(.5); shake = .3; pDust(v(h.x, 0, h.z), 26, 4, 1); for (let k = 0; k < 60; k++) pAir(h, rnd(0, 8), rs(4), rs(5), 1.3, 1); }
      else if (p.kind === 'rock') {
        p.m.visible = false; S.rockHit(); shake = Math.max(shake, .3); pDebris(h, 26, 6); pDust(h, 14, 3, 1); spawnChunks(h, 3, 5);
        if (p.last) { slabs.forEach(s => { s.visible = false; pDebris(s.position, 30, 8); pDust(s.position, 14, 4, 1.3); }); spawnChunks(v(-2.4, 1.2, 0), 9, 8); S.boom(.9); shake = .6; }
        else slabs.forEach(s => { s.rotation.z = rs(.07); s.rotation.y = rs(.1); });
      }
      else if (p.kind === 'ice') { p.m.visible = false; pSteam(h, 22); S.steam(); pSpark(h, 8, 4, C.g0); }
    }
  }
}

/* ───────────────────────── Máy quay ───────────────────────── */
const rel = (f, x, y, z) => () => tmp.copy(f.root.position).add(tmp2.set(x, y, z)).clone();
const hd = f => () => f.headP(), chs = f => () => f.chestP();
const orbit = (cx, cy, r, a0, a1, y0, y1) => (t, u) => { const a = lerp(a0, a1, u); return v(cx + Math.cos(a) * r, lerp(y0, y1 === undefined ? y0 : y1, u), Math.sin(a) * r); };
const SHOTS = [
  { t: 0, p0: [0, 15, 27], p1: [9, 4.5, 14], l0: [0, 1, 0], fov: 42 },
  { t: 7, p0: [-1.9, 1.35, 2.3], p1: [-2.3, 1.45, 1.9], l0: hd(aang), fov: 30 },
  { t: 9.7, p0: [1.9, 1.5, -2.3], p1: [2.3, 1.6, -1.9], l0: hd(korra), fov: 30 },
  { t: 12.1, p0: [0, 1.7, 9.6], p1: [0, 1.4, 8.4], l0: [0, 1.1, 0] },
  { t: 14.3, p0: [6.6, 2.1, -1.9], p1: [6.3, 2.2, -2.2], l0: chs(aang), fov: 46 },
  { t: 17.5, p0: [-1.5, 1.5, 7.5], p1: [1.5, 1.5, 8], l0: [0, 1.2, 0], l1: [1.2, 1.1, 0] },
  { t: 20.3, p0: rel(korra, -2.6, .7, 3), p1: rel(korra, -2, .9, 3.6), l0: chs(korra), fov: 38 },
  { t: 22, p0: [9, 2.2, -3.2], p1: [8.4, 3.2, -4.4], l0: [5.4, 2.2, 3], fov: 50 },
  { t: 26.2, p0: [.5, 2, 10.4], p1: [-.5, 2, 9.6], l0: [0, 1.2, 0] },
  { t: 27.3, p0: rel(aang, 2.6, 1.9, 3.6), p1: rel(aang, 3.3, 1.4, 2.4), l0: chs(aang), fov: 40 },
  { t: 29.75, p0: [-7.6, 2.5, 1.7], p1: [-7.2, 2.4, 2], l0: [5, 1.2, 0], fov: 44 },
  { t: 31.6, p0: [2.4, 1.3, 2.6], p1: [2.8, 1.25, 2.2], l0: hd(korra), fov: 32 },
  { t: 33, p0: [6.6, .5, 4.3], p1: [7.3, .8, 4.7], l0: rel(korra, -.7, 1.1, 0), fov: 44 },
  { t: 35.2, p0: [1, 2.3, 10.6], p1: [.3, 2, 9.6], l0: [.8, 1.2, 0], fov: 42 },
  { t: 37.6, p0: [-8, .5, 3.2], p1: [-7.4, .5, 3.6], l0: chs(aang), fov: 46 },
  { t: 39.25, p0: [8.6, .9, 5.5], p1: [9, 1.1, 6.2], l0: chs(korra), fov: 44 },
  { t: 40.5, p0: [-4.4, .45, 2.9], p1: [-4.8, .5, 3.4], l0: chs(korra), fov: 48 },
  { t: 41.55, p0: [0, 2.6, 11.4], p1: [-.6, 2, 10.2], l0: [-1, 1.1, 0] },
  { t: 43.6, p0: orbit(-1, 0, 9.4, 1.05, 2.05, 1.5, 2.4), l0: [-1, 1.25, 0], fov: 42 },
  { t: 47, p0: [-1, .6, 4.6], p1: [-1, .9, 3.6], l0: (t) => clashP(t, v(0, 0, 0)), fov: 50 },
  { t: 48.42, p0: [0, 7, 13], p1: [0, 6, 12], l0: [0, .5, 0], fov: 46 },
  { t: 50.3, p0: rel(aang, 1.5, .75, 1.1), p1: rel(aang, 1.3, 1.25, .9), l0: hd(aang), fov: 28 },
  { t: 52.5, p0: rel(korra, -1.5, .8, -1.1), p1: rel(korra, -1.3, 1.3, -.9), l0: hd(korra), fov: 28 },
  { t: 54.5, p0: [0, .8, 14.5], p1: [0, 2.6, 13.6], l0: [0, 1.4, 0], l1: [0, 3, 0], fov: 46 },
  { t: 58, p0: orbit(0, 0, 13, 1.57, 2.5, 3.2, 4.6), l0: [0, 3.1, 0], fov: 46 },
  { t: 60, p0: [0, 3.4, 8.6], p1: [0, 3.3, 6], l0: [0, 3.2, 0], fov: 46, e: 'in' },
  { t: 61.2, p0: [0, 6, 23], p1: [0, 4.6, 19], l0: [0, 2.4, 0], l1: [0, 1, 0], fov: 44 },
  { t: 64.5, p0: [-3.5, .8, 8], p1: [3.5, 1.1, 8], l0: [0, 1, 0], fov: 44 },
  { t: 67.5, p0: [0, 1.7, 9.4], p1: [0, 1.45, 6], l0: [0, 1.15, 0], fov: 40 },
  { t: 74, p0: [0, 1.45, 6], p1: [0, 17, 27], l0: [0, 1.15, 0], l1: [0, 2, 0], fov: 40 },
  { t: DUR + 1 }
];
const cP = v(0, 0, 0), cL = v(0, 0, 0), cA = v(0, 0, 0), cB = v(0, 0, 0);
const rv = (x, t, u, o) => typeof x === 'function' ? o.copy(x(t, u)) : o.set(x[0], x[1], x[2]);
function fovFor(f) { return 2 * Math.atan(Math.tan(f * PI / 360) * clamp((16 / 9) / aspect, 1, 1.8)) * 180 / PI; }
function cameraUpdate(t, dt) {
  let i = 0; while (i < SHOTS.length - 2 && SHOTS[i + 1].t <= t) i++;
  const s = SHOTS[i], lin = clamp((t - s.t) / (SHOTS[i + 1].t - s.t), 0, 1), u = EASE[s.e || 's'](lin);
  rv(s.p0, t, u, cA); if (s.p1) { rv(s.p1, t, u, cB); cA.lerp(cB, u); } cP.copy(cA);
  rv(s.l0, t, u, cA); if (s.l1) { rv(s.l1, t, u, cB); cA.lerp(cB, u); } cL.copy(cA);
  if (shake > .001) { cP.x += rs(shake * .35); cP.y += rs(shake * .35); cP.z += rs(shake * .2); }
  shake *= Math.exp(-dt * 5);
  camera.position.copy(cP); camera.lookAt(cL); camera.fov = fovFor(s.fov || 40); camera.updateProjectionMatrix();
}

/* ───────────────────────── Phụ đề ───────────────────────── */
const CAPS = [
  [7.2, 9.6, '<b>Avatar Aang</b> · Khí Tông cuối cùng'], [9.8, 12, '<b>Avatar Korra</b> · Thủy Tộc phương Nam'],
  [13.4, 17.4, '<b>HỎA</b> · Bắc Thiếu Lâm — đòn tay vươn dài, đá cao, tấn công dồn dập'],
  [17.5, 21.6, '<b>KHÍ</b> · Bát Quái Chưởng — bước vòng tròn, xoay người né tránh, mượn lực đối thủ'],
  [22.2, 26.4, '<b>THỦY</b> · Thái Cực Quyền — mềm mại, liên miên, dùng trọng tâm dẫn dòng nước'],
  [27.3, 31.5, 'Lấy nhu chế cương — Aang đón dòng nước, xoay vòng rồi hóa băng'],
  [32.6, 37.5, '<b>THỔ</b> · Hồng Gia Quyền — tấn mã bộ thấp, quyền mạnh, bám rễ vào đất'],
  [42.6, 48.3, '<b>HỎA đối HỎA</b> — lửa sinh ra từ hơi thở'],
  [51, 54.4, '<b>TRẠNG THÁI AVATAR</b>'], [55.2, 60, 'Khí · Thủy · Thổ · Hỏa — bốn nguyên tố hợp nhất'],
  [69.8, 74, 'Không có kẻ thắng người thua — chỉ có sự cân bằng.']
];
const elCap = $('cap'), elTitle = $('title'), elFlash = $('flash'), elEnd = $('end'), elProg = $('prog').firstElementChild, elHud = $('hud');
let capI = -2, endShown = false;
function overlays(t) {
  let k = -1; for (let i = 0; i < CAPS.length; i++) if (t >= CAPS[i][0] && t < CAPS[i][1]) k = i;
  if (k !== capI) { capI = k; if (k >= 0) elCap.innerHTML = CAPS[k][2]; elCap.style.opacity = k >= 0 ? 1 : 0; }
  elTitle.style.opacity = sstep(1, 2, t) * (1 - sstep(5.2, 6.2, t));
  elFlash.style.opacity = t < 61.1 ? 0 : sstep(61.1, 61.2, t) * (1 - sstep(61.7, 64.3, t));
  elProg.style.width = (t / DUR * 100) + '%';
  const e = t >= 77; if (e !== endShown) { endShown = e; elEnd.style.display = e ? 'flex' : 'none'; if (e) { void elEnd.offsetWidth; elEnd.style.opacity = 1; } else elEnd.style.opacity = 0; }
}

/* ───────────────────────── Vòng lặp ───────────────────────── */
let evI = 0, musI = 0, playing = false, started = false;
function reset() {
  filmT = 0; evI = 0; musI = 0; projs.length = 0; shake = 0; lightA = 0; ADD.clear(); NRM.clear();
  [...rocks, ...slabs, ...shards, ...orbitRocks, ...auras, pillar, crater].forEach(m => m.visible = false);
  chunks.forEach(c => { c.life = 0; c.m.visible = false; }); rings.forEach(r => { r.t0 = -9; r.m.visible = false; });
  fxL.forEach(l => l.intensity = 0); aang.setGlow(0); korra.setGlow(0);
}
function update(t, dt) {
  while (evI < EV.length && EV[evI].t <= t) EV[evI++].fn();
  sample(aang, TR_A, t); sample(korra, TR_K, t);
  aang.setGlow(sstep(51.5, 52.3, t) * (1 - sstep(61.6, 63, t))); korra.setGlow(sstep(53.3, 54, t) * (1 - sstep(61.6, 63, t)));
  for (const d of DU) if (t >= d.t0 && t < d.t1) d.fn(t, dt);
  projUpdate(t, dt);
  for (const c of chunks) if (c.life > 0) { c.life -= dt; c.vel.y -= 14 * dt; c.m.position.addScaledVector(c.vel, dt); c.m.rotation.x += c.spin.x * dt; c.m.rotation.z += c.spin.z * dt; if (c.m.position.y < .1 && c.vel.y < 0) { c.m.position.y = .1; c.vel.y *= -.35; c.vel.x *= .6; c.vel.z *= .6; } if (c.life <= 0) c.m.visible = false; }
  for (const r of rings) { const u = (t - r.t0) / r.d; if (u >= 0 && u < 1) { r.m.scale.setScalar(.3 + r.r * EASE.out(u)); r.m.material.opacity = .8 * (1 - u); } else r.m.visible = false; }
  torches.forEach((f, i) => { f.scale.setScalar(1 + .25 * Math.sin(t * 11 + i * 2)); if (Math.random() < 12 * dt) pFire(f.position, 0, 1, 0, .8, .3); });
  fxL[0].position.copy(lightAPos); fxL[0].intensity = lightA; lightA *= Math.exp(-dt * 7);
  ADD.update(dt); NRM.update(dt);
  cameraUpdate(t, dt); overlays(t);
  if (AU.ctx && !quiet) {
    const ct = AU.ctx.currentTime;
    while (musI < MUSIC.length && MUSIC[musI].t < t + .2) { const m = MUSIC[musI++]; if (m.t > t - .1) m.fn(ct + Math.max(0, m.t - t)); }
    AU.drone.gain.setTargetAtTime(t < 12 ? .09 : t < 50 ? .06 : t < 61.2 ? .12 : t < 80 ? .08 : 0, ct, .6);
  }
}
let last = 0;
function frame(ms) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (ms - last) / 1000 || 0); last = ms;
  if (playing) {
    filmT += dt; if (filmT >= DUR) { filmT = DUR; playing = false; if (AU.drone) AU.drone.gain.setTargetAtTime(0, now(), .5); }
    update(filmT, dt);
  } else if (!started) { // màn chờ: máy quay lượn chậm
    const a = ms / 9000; sample(aang, TR_A, 0); sample(korra, TR_K, 0);
    torches.forEach((f, i) => { if (Math.random() < 12 * dt) pFire(f.position, 0, 1, 0, .8, .3); }); ADD.update(dt);
    camera.position.set(Math.sin(a) * 17, 5.5, Math.cos(a) * 17); camera.lookAt(0, 1, 0); camera.fov = fovFor(42); camera.updateProjectionMatrix();
  }
  const uS = renderer.domElement.height / (2 * Math.tan(camera.fov * PI / 360)); ADD.mat.uniforms.uS.value = NRM.mat.uniforms.uS.value = uS;
  renderer.render(scene, camera);
}
function resize() {
  const W = window.innerWidth, Hh = window.innerHeight, portrait = W / Hh < 1;
  const w = W, h = portrait ? Math.min(W, Hh) : Hh, st = $('stage').style;
  st.width = w + 'px'; st.height = h + 'px'; st.top = (portrait ? Math.max(0, (Hh - h) * .38) : 0) + 'px';
  document.body.classList.toggle('portrait', portrait);
  aspect = w / h; renderer.setSize(w, h, false); camera.aspect = aspect; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize); window.addEventListener('orientationchange', () => setTimeout(resize, 250)); resize();

function play() { audioUnlock(); reset(); started = true; playing = true; $('start').style.display = 'none'; elHud.hidden = false; }
$('go').addEventListener('click', play);
$('again').addEventListener('click', play);
$('re').addEventListener('click', play);
$('mute').addEventListener('click', () => { audioUnlock(); AU.muted = !AU.muted; if (AU.master) AU.master.gain.setTargetAtTime(AU.muted ? 0 : .9, now(), .03); $('mute').textContent = AU.muted ? '🔇' : '🔊'; });
// iOS có thể treo AudioContext (cuộc gọi, chuyển app…): chạm bất kỳ để phát lại
const rewake = () => { if (started && AU.ctx && AU.ctx.state !== 'running') audioUnlock(); };
document.addEventListener('touchend', rewake, { passive: true }); document.addEventListener('click', rewake);
document.addEventListener('visibilitychange', () => { if (!document.hidden) rewake(); });
document.addEventListener('gesturestart', e => e.preventDefault());

// Công cụ kiểm thử: __film.seek(t) tua nhanh (không tiếng) rồi dừng hình
window.__film = {
  seek(t) { quiet = true; reset(); started = true; playing = false; $('start').style.display = 'none'; const dt = 1 / 30; for (filmT = 0; filmT < t; filmT += dt) update(filmT, dt); quiet = false; return filmT; },
  pose(name) { started = true; playing = false; $('start').style.display = 'none'; for (const f of [aang, korra]) { f.root.position.set(f === aang ? -.7 : .7, 0, 0); f.root.rotation.y = .5; f.applyPose(P[name], P[name], 0, 0); } camera.position.set(0, 1.2, 4.2); camera.lookAt(0, .9, 0); camera.fov = 40; camera.updateProjectionMatrix(); },
  poses: Object.keys(P), get t() { return filmT; }, AU, S, play
};
sample(aang, TR_A, 0); sample(korra, TR_K, 0);
requestAnimationFrame(frame);
})();
