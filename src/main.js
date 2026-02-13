import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import gsap from 'gsap';

class NeuralField {
  constructor() {
    this.container = document.getElementById('webgl-container');
    this.mouse = new THREE.Vector2();
    this.targetMouse = new THREE.Vector2();

    this.init();
    this.createParticleField();
    this.createEnergyField();
    this.createPostProcessing();
    this.addEventListeners();
    this.animate();
  }

  init() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x000000, 0.001);

    // Camera - pulled back for smaller appearance
    this.camera = new THREE.PerspectiveCamera(
      60, // Reduced FOV from 75
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = 80; // Pulled back from 50

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    // Clock
    this.clock = new THREE.Clock();
  }

  createParticleField() {
    const particleCount = 3000; // Reduced count
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const velocities = new Float32Array(particleCount * 3);

    // Create particle positions - scattered distribution
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      // More scattered, less clustered distribution
      const radius = 50 + Math.random() * 100; // Larger spread
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      // Color gradient (cyan to blue)
      const hue = 0.5 + Math.random() * 0.15; // 0.5 = cyan, 0.65 = blue
      const color = new THREE.Color().setHSL(hue, 1.0, 0.5);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      // Size - smaller particles
      sizes[i] = Math.random() * 1 + 0.3;

      // Velocity
      velocities[i3] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Custom shader material
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2() },
        uPointTexture: { value: this.createParticleTexture() }
      },
      vertexShader: `
        uniform float uTime;
        uniform vec2 uMouse;

        attribute float size;
        attribute vec3 color;

        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vColor = color;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

          // Mouse interaction
          vec2 mouseInfluence = uMouse * 10.0;
          float dist = length(position.xy - vec3(mouseInfluence, 0.0).xy);
          float influence = smoothstep(20.0, 0.0, dist);
          mvPosition.xy += mouseInfluence * influence * 0.3;

          // Size based on distance
          float depth = -mvPosition.z;
          gl_PointSize = size * (300.0 / depth);

          // Pulsing effect
          gl_PointSize *= 1.0 + sin(uTime * 2.0 + position.x * 0.1) * 0.2;

          // Alpha based on depth
          vAlpha = smoothstep(100.0, 20.0, depth);

          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D uPointTexture;

        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vec4 texColor = texture2D(uPointTexture, gl_PointCoord);

          // Glow effect
          float strength = distance(gl_PointCoord, vec2(0.5));
          strength = 1.0 - strength;
          strength = pow(strength, 3.0);

          vec3 finalColor = vColor * strength * 2.0;
          float finalAlpha = texColor.a * vAlpha * strength;

          gl_FragColor = vec4(finalColor, finalAlpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true
    });

    this.particleField = new THREE.Points(geometry, material);
    this.particleVelocities = velocities;
    this.scene.add(this.particleField);
  }

  createParticleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.4, 'rgba(0, 255, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  createEnergyField() {
    // Energy waves geometry
    const waveCount = 3;

    for (let i = 0; i < waveCount; i++) {
      const geometry = new THREE.TorusGeometry(20 + i * 10, 0.5, 16, 100);
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(0x00ffff) },
          uAlpha: { value: 0.1 - i * 0.03 } // Reduced opacity
        },
        vertexShader: `
          uniform float uTime;
          varying vec3 vPosition;

          void main() {
            vPosition = position;

            vec3 pos = position;
            float wave = sin(position.x * 3.0 + uTime * 2.0) * 0.5;
            pos.z += wave;

            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uAlpha;
          varying vec3 vPosition;

          void main() {
            float glow = abs(sin(vPosition.x * 10.0)) * 0.5 + 0.5;
            gl_FragColor = vec4(uColor * glow, uAlpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      });

      const wave = new THREE.Mesh(geometry, material);
      wave.rotation.x = Math.PI / 2 + i * 0.2;
      wave.position.z = -30 + i * 5;
      // Commented out - too visible
      // this.scene.add(wave);

      if (!this.energyWaves) this.energyWaves = [];
      this.energyWaves.push(wave);
    }

    // Central energy core
    const coreGeometry = new THREE.SphereGeometry(3, 32, 32);
    const coreMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }
      },
      vertexShader: `
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;

          vec3 pos = position;
          float displacement = sin(position.x * 5.0 + uTime * 3.0) * 0.1;
          displacement += sin(position.y * 5.0 + uTime * 2.0) * 0.1;
          displacement += sin(position.z * 5.0 + uTime * 4.0) * 0.1;

          pos += normal * displacement;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          float fresnel = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);

          vec3 color1 = vec3(0.0, 1.0, 1.0); // Cyan
          vec3 color2 = vec3(0.0, 0.5, 1.0); // Blue
          vec3 color = mix(color1, color2, sin(uTime + vPosition.y * 3.0) * 0.5 + 0.5);

          float alpha = fresnel * 0.8;

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending
    });

    this.energyCore = new THREE.Mesh(coreGeometry, coreMaterial);
    this.energyCore.scale.setScalar(0.5); // Smaller
    // Commented out - too visible
    // this.scene.add(this.energyCore);
  }

  createPostProcessing() {
    // Composer
    this.composer = new EffectComposer(this.renderer);

    // Render pass
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // Bloom pass - reduced strength
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.8,  // strength - reduced from 1.5
      0.3,  // radius - reduced from 0.4
      0.9   // threshold - increased from 0.85 (less glow)
    );
    this.composer.addPass(bloomPass);

    // Film grain pass
    const filmPass = new FilmPass(0.15, 0.025, 648, false);
    this.composer.addPass(filmPass);

    // Chromatic aberration pass
    const chromaticAberrationShader = {
      uniforms: {
        tDiffuse: { value: null },
        uAmount: { value: 0.003 }
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
    };

    const chromaticPass = new ShaderPass(chromaticAberrationShader);
    this.composer.addPass(chromaticPass);

    // Vignette pass
    const vignetteShader = {
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
    };

    const vignettePass = new ShaderPass(vignetteShader);
    this.composer.addPass(vignettePass);
  }

  addEventListeners() {
    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));

    // Smooth camera movement on scroll
    window.addEventListener('wheel', (e) => {
      gsap.to(this.camera.position, {
        z: this.camera.position.z + e.deltaY * 0.01,
        duration: 1,
        ease: 'power2.out',
        onUpdate: () => {
          this.camera.position.z = THREE.MathUtils.clamp(this.camera.position.z, 30, 70);
        }
      });
    });
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  onMouseMove(event) {
    this.targetMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.targetMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const elapsedTime = this.clock.getElapsedTime();

    // Smooth mouse movement
    this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.05;
    this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.05;

    // Update particle field
    if (this.particleField) {
      this.particleField.material.uniforms.uTime.value = elapsedTime;
      this.particleField.material.uniforms.uMouse.value = this.mouse;
      this.particleField.rotation.y = elapsedTime * 0.05;

      // Update particle positions
      const positions = this.particleField.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += this.particleVelocities[i];
        positions[i + 1] += this.particleVelocities[i + 1];
        positions[i + 2] += this.particleVelocities[i + 2];

        // Boundary check
        const dist = Math.sqrt(
          positions[i] ** 2 +
          positions[i + 1] ** 2 +
          positions[i + 2] ** 2
        );

        if (dist > 80 || dist < 20) {
          this.particleVelocities[i] *= -1;
          this.particleVelocities[i + 1] *= -1;
          this.particleVelocities[i + 2] *= -1;
        }
      }
      this.particleField.geometry.attributes.position.needsUpdate = true;
    }

    // Update energy waves
    if (this.energyWaves) {
      this.energyWaves.forEach((wave, i) => {
        wave.material.uniforms.uTime.value = elapsedTime;
        wave.rotation.z = elapsedTime * (0.1 + i * 0.05);
        wave.scale.setScalar(1 + Math.sin(elapsedTime * 2 + i) * 0.1);
      });
    }

    // Update energy core
    if (this.energyCore) {
      this.energyCore.material.uniforms.uTime.value = elapsedTime;
      this.energyCore.rotation.x = elapsedTime * 0.3;
      this.energyCore.rotation.y = elapsedTime * 0.5;
    }

    // Camera follows mouse slightly
    this.camera.position.x += (this.mouse.x * 2 - this.camera.position.x) * 0.02;
    this.camera.position.y += (this.mouse.y * 2 - this.camera.position.y) * 0.02;
    this.camera.lookAt(this.scene.position);

    // Render
    this.composer.render();
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new NeuralField());
} else {
  new NeuralField();
}

// UI Animations with GSAP
document.addEventListener('DOMContentLoaded', () => {
  // Animate terminal entrance
  gsap.from('.terminal', {
    opacity: 0,
    scale: 0.8,
    duration: 1,
    ease: 'power3.out',
    delay: 0.5
  });

  // Animate logo
  gsap.from('.logo', {
    opacity: 0,
    y: -50,
    duration: 1,
    ease: 'power3.out',
    delay: 0.8
  });

  // Animate inputs
  gsap.from('.input-group', {
    opacity: 0,
    x: -30,
    stagger: 0.2,
    duration: 0.8,
    ease: 'power2.out',
    delay: 1
  });

  // Animate services
  gsap.from('.service-link', {
    opacity: 0,
    scale: 0,
    stagger: 0.1,
    duration: 0.6,
    ease: 'back.out(1.7)',
    delay: 1.5
  });

  // Animate status bar
  gsap.from('.status-bar', {
    opacity: 0,
    y: 50,
    duration: 0.8,
    ease: 'power2.out',
    delay: 1.8
  });
});

export default NeuralField;
