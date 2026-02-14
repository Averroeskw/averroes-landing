import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import gsap from 'gsap';

// ── Simplex noise (Ashima Arts GLSL, inlined in vertex shader) ──
const SIMPLEX_NOISE_GLSL = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

// ── Shape generators ──
function generateSphere(count, radius) {
  const positions = new Float32Array(count * 3);
  const golden = (1 + Math.sqrt(5)) / 2;
  for (let i = 0; i < count; i++) {
    const theta = 2 * Math.PI * i / golden;
    const phi = Math.acos(1 - 2 * (i + 0.5) / count);
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);
  }
  return positions;
}

function generateTorus(count, R, r) {
  const positions = new Float32Array(count * 3);
  const golden = (1 + Math.sqrt(5)) / 2;
  for (let i = 0; i < count; i++) {
    const u = (i / count) * Math.PI * 2;
    const v = ((i * golden) % 1) * Math.PI * 2;
    positions[i * 3] = (R + r * Math.cos(v)) * Math.cos(u);
    positions[i * 3 + 1] = (R + r * Math.cos(v)) * Math.sin(u);
    positions[i * 3 + 2] = r * Math.sin(v);
  }
  return positions;
}

function generateHelix(count, radius, height, turns) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const angle = t * Math.PI * 2 * turns;
    const r = radius * (0.5 + 0.5 * Math.sin(t * Math.PI));
    positions[i * 3] = r * Math.cos(angle);
    positions[i * 3 + 1] = (t - 0.5) * height;
    positions[i * 3 + 2] = r * Math.sin(angle);
  }
  return positions;
}

function generateIcosahedron(count, radius) {
  const positions = new Float32Array(count * 3);
  const geom = new THREE.IcosahedronGeometry(radius, 4);
  const pos = geom.attributes.position;
  const vertCount = pos.count;
  for (let i = 0; i < count; i++) {
    const vi = i % vertCount;
    positions[i * 3] = pos.getX(vi);
    positions[i * 3 + 1] = pos.getY(vi);
    positions[i * 3 + 2] = pos.getZ(vi);
  }
  geom.dispose();
  return positions;
}

// ── Main class ──
class ImmersiveLanding {
  constructor() {
    this.container = document.getElementById('webgl-container');
    this.mouse = new THREE.Vector2();
    this.targetMouse = new THREE.Vector2();
    this.isMobile = window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent);

    // Particle counts
    this.blobCount = this.isMobile ? 5000 : 12000;
    this.ambientCount = this.isMobile ? 300 : 600;

    // Shape morph state
    this.shapes = [];
    this.currentShapeIndex = 0;
    this.morphProgress = { value: 0 };

    this.init();
    this.createMorphingBlob();
    this.createAmbientParticles();
    this.createPostProcessing();
    this.addEventListeners();
    this.startMorphCycle();
    this.startEntryAnimation();
    this.animate();
  }

  init() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    this.camera.position.z = 10;

    const maxDpr = this.isMobile ? 1.5 : 2;
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isMobile,
      alpha: true,
      powerPreference: this.isMobile ? 'low-power' : 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));
    this.renderer.setClearColor(0x000000, 1);
    this.container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();
  }

  createMorphingBlob() {
    const count = this.blobCount;
    const radius = 3.0;

    // Generate all 4 shape targets
    this.shapes = [
      generateSphere(count, radius),
      generateTorus(count, radius * 0.85, radius * 0.35),
      generateHelix(count, radius, radius * 2.5, 4),
      generateIcosahedron(count, radius),
    ];

    // Start at sphere
    const positions = new Float32Array(this.shapes[0]);
    const targets = new Float32Array(this.shapes[1]);
    const randoms = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      randoms[i] = Math.random();
    }

    const geometry = new THREE.BufferGeometry();
    this.blobPositionAttr = new THREE.BufferAttribute(positions, 3);
    this.blobTargetAttr = new THREE.BufferAttribute(targets, 3);
    geometry.setAttribute('position', this.blobPositionAttr);
    geometry.setAttribute('aPositionTarget', this.blobTargetAttr);
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));

    this.blobUniforms = {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uMouse: { value: new THREE.Vector2() },
      uPointSize: { value: this.isMobile ? 2.0 : 2.5 },
    };

    const material = new THREE.ShaderMaterial({
      uniforms: this.blobUniforms,
      vertexShader: `
        ${SIMPLEX_NOISE_GLSL}

        uniform float uTime;
        uniform float uProgress;
        uniform vec2 uMouse;
        uniform float uPointSize;

        attribute vec3 aPositionTarget;
        attribute float aRandom;

        varying float vAlpha;
        varying float vDist;

        void main() {
          // Morph between current and target shape
          float stagger = smoothstep(0.0, 1.0, uProgress * 1.4 - aRandom * 0.4);
          vec3 pos = mix(position, aPositionTarget, stagger);

          // Organic noise displacement
          float noiseScale = 0.4;
          float noiseTime = uTime * 0.3;
          vec3 noiseInput = pos * noiseScale + noiseTime;
          float n = snoise(noiseInput) * 0.4;
          pos += normalize(pos) * n;

          // Mouse repulsion
          vec4 worldPos = modelMatrix * vec4(pos, 1.0);
          vec2 mouseWorld = uMouse * 5.0;
          float mouseDist = length(worldPos.xy - mouseWorld);
          float repel = smoothstep(3.0, 0.0, mouseDist) * 0.8;
          pos += normalize(pos) * repel;

          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPos;

          float depth = max(-mvPos.z, 0.01);
          gl_PointSize = uPointSize * (3.0 / depth);
          gl_PointSize *= 0.8 + aRandom * 0.4;

          // Alpha: center particles brighter
          float distFromCenter = length(pos) / 4.0;
          vAlpha = 0.5 + aRandom * 0.5;
          vAlpha *= smoothstep(1.5, 0.0, distFromCenter);
          vDist = distFromCenter;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying float vDist;

        void main() {
          float dist = length(gl_PointCoord - 0.5);
          if (dist > 0.5) discard;

          // Bright-center glow (Three.js Journey technique)
          float glow = 0.05 / dist;
          glow = clamp(glow, 0.0, 1.0);

          // Color: cyan core with slight blue shift at edges
          vec3 color = mix(vec3(0.0, 1.0, 1.0), vec3(0.3, 0.5, 1.0), vDist);

          float alpha = glow * vAlpha * 0.6;
          gl_FragColor = vec4(color * glow, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.blob = new THREE.Points(geometry, material);
    this.scene.add(this.blob);
  }

  createAmbientParticles() {
    const count = this.ambientCount;
    const positions = new Float32Array(count * 3);
    const randoms = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const r = 20 + Math.random() * 60;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      randoms[i] = Math.random();
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: this.blobUniforms.uTime,
      },
      vertexShader: `
        uniform float uTime;
        attribute float aRandom;
        varying float vAlpha;

        void main() {
          vec3 pos = position;
          pos.x += sin(uTime * 0.05 + aRandom * 6.28) * 0.5;
          pos.y += cos(uTime * 0.04 + aRandom * 3.14) * 0.5;

          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPos;

          float depth = max(-mvPos.z, 0.01);
          gl_PointSize = (0.5 + aRandom * 0.5) * (100.0 / depth);

          vAlpha = 0.15 + aRandom * 0.15;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          float dist = length(gl_PointCoord - 0.5);
          if (dist > 0.5) discard;
          float glow = smoothstep(0.5, 0.0, dist);
          gl_FragColor = vec4(0.0, 0.8, 1.0, glow * vAlpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.ambientParticles = new THREE.Points(geometry, material);
    this.scene.add(this.ambientParticles);
  }

  createPostProcessing() {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    if (this.isMobile) return; // Skip heavy post-processing on mobile

    // Bloom
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.2, 0.4, 0.85
    );
    this.composer.addPass(bloom);

    // Chromatic aberration
    const chromaticPass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uAmount: { value: 0.002 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uAmount;
        varying vec2 vUv;
        void main() {
          vec2 offset = uAmount * (vUv - 0.5);
          float r = texture2D(tDiffuse, vUv + offset).r;
          float g = texture2D(tDiffuse, vUv).g;
          float b = texture2D(tDiffuse, vUv - offset).b;
          gl_FragColor = vec4(r, g, b, 1.0);
        }
      `
    });
    this.composer.addPass(chromaticPass);

    // Vignette
    const vignettePass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uOffset: { value: 0.95 },
        uDarkness: { value: 1.5 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uOffset;
        uniform float uDarkness;
        varying vec2 vUv;
        void main() {
          vec4 texel = texture2D(tDiffuse, vUv);
          vec2 uv = (vUv - 0.5) * 2.0;
          float vignette = smoothstep(uOffset, uOffset - 0.5, length(uv));
          texel.rgb = mix(texel.rgb, texel.rgb * vignette, uDarkness);
          gl_FragColor = texel;
        }
      `
    });
    this.composer.addPass(vignettePass);
  }

  startMorphCycle() {
    const cycle = () => {
      const nextIndex = (this.currentShapeIndex + 1) % this.shapes.length;
      const nextNext = (nextIndex + 1) % this.shapes.length;

      // Update target positions for the morph
      this.blobTargetAttr.array.set(this.shapes[nextIndex]);
      this.blobTargetAttr.needsUpdate = true;

      // Animate morph progress 0 → 1
      gsap.to(this.blobUniforms.uProgress, {
        value: 1,
        duration: 3,
        ease: 'power2.inOut',
        onComplete: () => {
          // Snap current positions to target (morph complete)
          this.blobPositionAttr.array.set(this.shapes[nextIndex]);
          this.blobPositionAttr.needsUpdate = true;

          // Set next target
          this.blobTargetAttr.array.set(this.shapes[nextNext]);
          this.blobTargetAttr.needsUpdate = true;

          // Reset progress
          this.blobUniforms.uProgress.value = 0;
          this.currentShapeIndex = nextIndex;

          // Pause, then morph again
          setTimeout(cycle, 2000);
        }
      });
    };

    // Initial pause before first morph
    setTimeout(cycle, 2000);
  }

  startEntryAnimation() {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.fromTo('#hero-title',
      { opacity: 0, filter: 'blur(15px)' },
      { opacity: 1, filter: 'blur(0px)', duration: 1.5 },
      0.3
    )
    .fromTo('.subtitle',
      { letterSpacing: '20px', opacity: 0 },
      { letterSpacing: '10px', opacity: 0.9, duration: 1.2 },
      0.6
    )
    .fromTo('#auth-panel',
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 1.0 },
      1.2
    )
    .fromTo('.oauth-btn',
      { opacity: 0, x: -20 },
      { opacity: 1, x: 0, stagger: 0.15, duration: 0.7 },
      1.4
    )
    .fromTo('#status-bar',
      { opacity: 0 },
      { opacity: 1, duration: 0.8 },
      2.0
    );
  }

  addEventListeners() {
    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('mousemove', (e) => {
      this.targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const elapsed = this.clock.getElapsedTime();

    // Smooth mouse
    this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.05;
    this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.05;

    // Update blob
    this.blobUniforms.uTime.value = elapsed;
    this.blobUniforms.uMouse.value.copy(this.mouse);

    // Gentle blob tilt toward mouse
    if (this.blob) {
      this.blob.rotation.y += (this.mouse.x * 0.3 - this.blob.rotation.y) * 0.02;
      this.blob.rotation.x += (this.mouse.y * 0.15 - this.blob.rotation.x) * 0.02;
    }

    // Slow ambient rotation
    if (this.ambientParticles) {
      this.ambientParticles.rotation.y = elapsed * 0.02;
    }

    // Camera parallax
    this.camera.position.x += (this.mouse.x * 0.5 - this.camera.position.x) * 0.02;
    this.camera.position.y += (this.mouse.y * 0.3 - this.camera.position.y) * 0.02;
    this.camera.lookAt(0, 0, 0);

    this.composer.render();
  }
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new ImmersiveLanding());
} else {
  new ImmersiveLanding();
}

export default ImmersiveLanding;
