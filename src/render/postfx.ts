import * as T from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import type { QualityProfile } from './quality';

/**
 * A gentle grade over the finished frame: a warm-to-cool split that reads as
 * Indian afternoon light, a soft vignette, and just enough film grain to stop
 * the sky from banding.
 */
const GradeShader = {
  name: 'NavapurGrade',
  uniforms: {
    tDiffuse: { value: null as T.Texture | null },
    uTime: { value: 0 },
    uVignette: { value: 0.82 },
    uGrain: { value: 0.013 },
    uWarmth: { value: 0.042 },
    uSaturation: { value: 1.14 },
    uLift: { value: new T.Vector3(0.016, 0.016, 0.022) },
    uHaunt: { value: 0 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uTime, uVignette, uGrain, uWarmth, uSaturation, uHaunt;
    uniform vec3 uLift;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec3 color = texel.rgb;
      float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
      // Warm the highlights, cool the shadows.
      color += vec3(uWarmth, uWarmth * 0.42, -uWarmth * 0.55) * smoothstep(0.35, 1.0, luma);
      color += uLift * (1.0 - smoothstep(0.0, 0.55, luma));
      color = mix(vec3(luma), color, uSaturation);
      vec2 centred = vUv - 0.5;
      float vignette = smoothstep(0.92, uVignette * 0.42, length(centred) * 1.32);
      color *= mix(0.9, 1.0, vignette);
      color += (hash(vUv * 900.0 + uTime) - 0.5) * uGrain;
      if (uHaunt > 0.001) {
        // Colour drains out of the night and what is left leans cold.
        float grey = dot(color, vec3(0.2126, 0.7152, 0.0722));
        vec3 haunted = mix(vec3(grey), color, 0.45);
        haunted *= vec3(0.82, 1.03, 1.06);
        // A slow breath in the corners, and a little more grain.
        float pulse = 0.5 + 0.5 * sin(uTime * 0.9);
        float edge = smoothstep(1.05, 0.28, length(centred) * 1.5);
        haunted *= mix(1.0, edge, 0.55 + pulse * 0.2);
        haunted += (hash(vUv * 1700.0 - uTime * 3.0) - 0.5) * 0.05;
        color = mix(color, haunted, uHaunt);
      }
      gl_FragColor = vec4(max(color, 0.0), texel.a);
    }
  `,
};

export class PostFX {
  composer: EffectComposer;
  enabled = true;
  private grade: ShaderPass;
  private bloom: UnrealBloomPass | null = null;
  private ao: GTAOPass | null = null;
  private smaa: SMAAPass | null = null;
  private size = new T.Vector2(1, 1);

  constructor(
    private renderer: T.WebGLRenderer,
    private scene: T.Scene,
    private camera: T.PerspectiveCamera,
    profile: QualityProfile,
  ) {
    const target = new T.WebGLRenderTarget(1, 1, {
      type: T.HalfFloatType, samples: profile.antialias === 'msaa' ? 4 : 0,
      colorSpace: T.LinearSRGBColorSpace,
    });
    this.composer = new EffectComposer(renderer, target);
    this.grade = new ShaderPass(GradeShader);
    this.build(profile);
  }

  /** Rebuilds the chain; called whenever the quality tier changes. */
  build(profile: QualityProfile) {
    for (const pass of [...this.composer.passes]) this.composer.removePass(pass);
    this.bloom?.dispose(); this.bloom = null;
    this.ao?.dispose(); this.ao = null;
    this.smaa?.dispose(); this.smaa = null;

    this.composer.addPass(new RenderPass(this.scene, this.camera));

    if (profile.ambientOcclusion) {
      const ao = new GTAOPass(this.scene, this.camera, this.size.x, this.size.y);
      ao.blendIntensity = 0.62;
      ao.updateGtaoMaterial({ radius: 0.42, distanceExponent: 1.2, thickness: 1.4, scale: 1.1, samples: 12, distanceFallOff: 1, screenSpaceRadius: false });
      ao.updatePdMaterial({ lumaPhi: 9, depthPhi: 2.2, normalPhi: 3.2, radius: 4, radiusExponent: 1, rings: 2, samples: 10 });
      this.composer.addPass(ao); this.ao = ao;
    }
    if (profile.bloom) {
      const bloom = new UnrealBloomPass(this.size.clone(), 0.34, 0.62, 0.86);
      this.composer.addPass(bloom); this.bloom = bloom;
    }
    this.composer.addPass(this.grade);
    this.composer.addPass(new OutputPass());
    if (profile.antialias === 'smaa') { this.smaa = new SMAAPass(); this.composer.addPass(this.smaa); }
    this.setSize(this.size.x, this.size.y);
  }

  setSize(width: number, height: number) {
    this.size.set(Math.max(1, width), Math.max(1, height));
    this.composer.setSize(this.size.x, this.size.y);
    this.ao?.setSize(this.size.x, this.size.y);
    this.bloom?.setSize(this.size.x, this.size.y);
  }

  setPixelRatio(ratio: number) { this.composer.setPixelRatio(ratio); }

  /** 0 to 1: how far the picture drifts towards the city's other face. */
  setHaunting(level: number) { this.grade.uniforms.uHaunt.value = level; }

  /** Night-time gets a touch more bloom so lamps and signs bleed convincingly. */
  setNight(amount: number) { if (this.bloom) { this.bloom.strength = 0.28 + amount * 0.45; this.bloom.threshold = 0.88 - amount * 0.24; } }

  render(dt: number, elapsed: number) {
    if (!this.enabled) { this.renderer.render(this.scene, this.camera); return; }
    this.grade.uniforms.uTime.value = elapsed;
    this.composer.render(dt);
  }

  dispose() {
    this.bloom?.dispose(); this.ao?.dispose(); this.smaa?.dispose();
    this.grade.dispose?.(); this.composer.dispose();
  }
}
