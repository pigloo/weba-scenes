import * as THREE from 'three';
import metaversefile from 'metaversefile';
import {GPUComputationRenderer} from 'three/examples/jsm/misc/GPUComputationRenderer';
import { Vector2 } from 'three';
import devil from './initPos.js'
const {useFrame, useApp, useRenderer, useLocalPlayer} = metaversefile;

const TEXSQRT = 256;
const PARTICLES = TEXSQRT * TEXSQRT;
const RADIUS = 1;
const SCALE = 0.25;
var gpuCompute, positionVariable, defaultPositionTexture, undef;
const lightPos = new THREE.Vector3(-16, 16, -6);
const groundCol = 0xe1bf92; // 0xe8e1d1

export default () => {
  const app = useApp();
  const renderer = useRenderer();
  const localPlayer = useLocalPlayer();

  app.name = 'dust-devil';

  const mesh = initParticleMesh();
  initComputeRenderer(renderer);

  mesh.frustumCulled = false;

  app.add(mesh);

  app.updateMatrixWorld();

  useFrame(({timeDiff}) => {
    positionVariable.material.uniforms.u_time.value += timeDiff * 0.0001;

    gpuCompute.compute();

    var positions = gpuCompute.getCurrentRenderTarget(positionVariable).texture;
    mesh.material.uniforms.u_positionTexture.value = positions;
    mesh.material.uniforms.u_positionTexture.needsUpdate = true;
    mesh.customDepthMaterial.uniforms.u_positionTexture.value = positions;
    mesh.customDepthMaterial.uniforms.u_positionTexture.needsUpdate = true;

    const player = new Vector2(localPlayer.position.x, localPlayer.position.z);
    const wind = new Vector2(app.position.x, app.position.z);

    if(player.distanceTo(wind) < 2 && localPlayer.position.y < 10){
      localPlayer.characterPhysics.velocity.y += timeDiff * 0.0125;
    }

  });

  return app;
};

const initParticleMesh = () => {
  var planeGeometry = new THREE.PlaneBufferGeometry(1, 1, 1, 1);
  var geometry = new THREE.InstancedBufferGeometry();
  geometry.index = planeGeometry.index;
  geometry.attributes = planeGeometry.attributes;

  const fboUV = new Float32Array(PARTICLES * 2);
  var i2;

  for (var i = 0; i < PARTICLES; i++) {
    i2 = i * 2;
    fboUV[i2 + 0] = (i % TEXSQRT) / TEXSQRT;
    fboUV[i2 + 1] = ~~(i / TEXSQRT) / TEXSQRT;
  }

  geometry.setAttribute('a_fboUV', new THREE.InstancedBufferAttribute(fboUV, 2));

  var material = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.lights,
      {
        u_positionTexture: {type: 't', value: undef},
        u_scale: {type: 'f', value: SCALE},
        u_color: {
          type: 'v3',
          value: new THREE.Color(groundCol),
        },
      },
    ]),
    vertexShader: particlesVert,
    fragmentShader: particlesFrag,
    lights: true,
    side: THREE.DoubleSide,
    blending: THREE.NoBlending,
  });

  const mesh = new THREE.Mesh(geometry, material);

  const customDepthMaterial = new THREE.ShaderMaterial({
    uniforms: {
      u_positionTexture: {type: 't', value: undef},
      u_scale: {type: 'f', value: SCALE},
      u_lightPos: {type: 'v3', value: lightPos},
    },
    vertexShader: depthVert,
    fragmentShader: depthFrag,
    depthTest: true,
    depthWrite: true,
    blending: THREE.NoBlending,
  });

  mesh.customDepthMaterial = customDepthMaterial;

  mesh.castShadow = true; // default is false
  mesh.receiveShadow = true; // default

  return mesh;
};

const initComputeRenderer = renderer => {
  gpuCompute = new GPUComputationRenderer(TEXSQRT, TEXSQRT, renderer);

  var positionTexture = gpuCompute.createTexture();
  defaultPositionTexture = gpuCompute.createTexture();

  var devil32 = new Float32Array(
    new Uint8Array([...atob(devil)].map(c => c.charCodeAt(0))).buffer,
  );

  positionTexture.image.data = devil32;
  // fillTexture(positionTexture)
  fillTexture(defaultPositionTexture);

  positionVariable = gpuCompute.addVariable(
    'u_positionTexture', // GLSL Uniform
    simPosition, // Shader
    positionTexture, // Texture
  );

  // only depends on reading its own previous values
  gpuCompute.setVariableDependencies(positionVariable, [positionVariable]);

  positionVariable.material.uniforms = {
    u_positionTexture: {type: 't', value: undef},
    u_defaultPositionTexture: {type: 't', value: defaultPositionTexture},
    u_speed: {type: 'f', value: 0.01},
    u_dieSpeed: {type: 'f', value: 0.004},
    u_curlSize: {type: 'f', value: 0.5},
    u_attraction: {type: 'f', value: 0.002},
    u_time: {type: 'f', value: 0},
    u_rotationSpeed: {type: 'f', value: 0.025},
    u_upflow: {type: 'f', value: 0.05},
  };

  var error = gpuCompute.init();
  if (error !== null) {
    console.error(error);
  }
};

const fillTexture = texture => {
  var i4;
  var r, phi, theta;
  for (var i = 0; i < PARTICLES; i++) {
    i4 = i * 4;
    r = (0.5 + Math.sqrt(Math.random()) * 0.5) * RADIUS;
    phi = (Math.random() - 0.5) * Math.PI;
    theta = Math.random() * Math.PI * 2;
    texture.image.data[i4 + 0] = r * Math.cos(theta) * Math.cos(phi);
    texture.image.data[i4 + 1] = Math.random() * 0.1;
    texture.image.data[i4 + 2] = r * Math.sin(theta) * Math.cos(phi);
    texture.image.data[i4 + 3] = Math.random();
  }
};

// PARTICLE SHADER
const particlesVert = `
uniform sampler2D u_positionTexture;
uniform float u_scale;
attribute vec2 a_fboUV;

varying vec2 v_Uv;

#include <common>
#include <fog_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex> // IMPORTANT TO ADD THIS FOR DEPTH CALCS IN WEBA

void main() {
    #include <beginnormal_vertex>
  	#include <defaultnormal_vertex>

    vec4 pos = texture2D( u_positionTexture, a_fboUV );

    vec4 worldPosition = modelMatrix * vec4(pos.xyz, 1.0);
    vec4 mvPosition = viewMatrix * worldPosition;

  	float scale = u_scale / - mvPosition.z * smoothstep(0.0, 0.2, pos.w);

  	mvPosition.xyz += position * scale;

    gl_Position = projectionMatrix * mvPosition;

    v_Uv = uv;

    #include <fog_vertex>
    #include <shadowmap_vertex>
    #include <logdepthbuf_vertex> // IMPORTANT TO ADD THIS FOR DEPTH CALCS IN WEBA
}
`;

const particlesFrag = `
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
#include <logdepthbuf_pars_fragment> // IMPORTANT TO ADD THIS FOR DEPTH CALCS IN WEBA

uniform vec3 u_color;
varying vec2 v_Uv;

void main() {
    if(distance(v_Uv, vec2(0.5)) > 0.5) discard;

    vec3 outgoingLight = u_color;

    float shadowMask = max(getShadowMask(), 0.6);
    outgoingLight *= shadowMask;

    gl_FragColor = vec4( outgoingLight, 1.0 );

    #include <fog_fragment>
    #include <logdepthbuf_fragment> // IMPORTANT TO ADD THIS FOR DEPTH CALCS IN WEBA
}
`;

// PARTICLE DEPTH SHADER
const depthFrag = `
uniform vec3 u_lightPos;
varying vec4 v_worldPosition;
varying vec2 v_Uv;
#include <packing>

void main () {
  if(distance(v_Uv, vec2(0.5)) > 0.5) discard;
  gl_FragColor = packDepthToRGBA( length( v_worldPosition.xyz - u_lightPos.xyz ) * 0.001 );
}
`;

const depthVert = `
uniform sampler2D u_positionTexture;
uniform float u_scale;
attribute vec2 a_fboUV;

varying vec4 v_worldPosition;
varying vec2 v_Uv;

void main() {
    vec4 pos = texture2D( u_positionTexture, a_fboUV );

    vec4 worldPosition = modelMatrix * vec4(pos.xyz, 1.0);
    vec4 mvPosition = viewMatrix * worldPosition;

    float scale = u_scale / - mvPosition.z * smoothstep(0.0, 0.2, pos.w) * 2.0;

  	mvPosition.xyz += position * scale;

    gl_Position = projectionMatrix * mvPosition;

    v_worldPosition = worldPosition;
    v_Uv = uv;
}`;

// PARTICLE SIMULATOR
const simPosition = `
uniform sampler2D u_defaultPositionTexture;
uniform float u_time;
uniform float u_speed;
uniform float u_dieSpeed;
uniform float u_curlSize;
uniform float u_attraction;
uniform float u_rotationSpeed;
uniform float u_upflow;

// Description : Array and textureless GLSL 2D/3D/4D simplex
//               noise functions.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : stegu
//     Lastmod : 20110822 (ijm)
//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License. See LICENSE file.
//               https://github.com/ashima/webgl-noise
//               https://github.com/stegu/webgl-noise
//

vec4 mod289(vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

float mod289(float x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
    return mod289(((x*34.0)+1.0)*x);
}

float permute(float x) {
    return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
}

float taylorInvSqrt(float r) {
    return 1.79284291400159 - 0.85373472095314 * r;
}

vec4 grad4(float j, vec4 ip) {
    const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
    vec4 p,s;

    p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
    p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
    s = vec4(lessThan(p, vec4(0.0)));
    p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www;

    return p;
}

#define F4 0.309016994374947451

vec4 simplexNoiseDerivatives (vec4 v) {
    const vec4  C = vec4( 0.138196601125011,0.276393202250021,0.414589803375032,-0.447213595499958);

    vec4 i  = floor(v + dot(v, vec4(F4)) );
    vec4 x0 = v -   i + dot(i, C.xxxx);

    vec4 i0;
    vec3 isX = step( x0.yzw, x0.xxx );
    vec3 isYZ = step( x0.zww, x0.yyz );
    i0.x = isX.x + isX.y + isX.z;
    i0.yzw = 1.0 - isX;
    i0.y += isYZ.x + isYZ.y;
    i0.zw += 1.0 - isYZ.xy;
    i0.z += isYZ.z;
    i0.w += 1.0 - isYZ.z;

    vec4 i3 = clamp( i0, 0.0, 1.0 );
    vec4 i2 = clamp( i0-1.0, 0.0, 1.0 );
    vec4 i1 = clamp( i0-2.0, 0.0, 1.0 );

    vec4 x1 = x0 - i1 + C.xxxx;
    vec4 x2 = x0 - i2 + C.yyyy;
    vec4 x3 = x0 - i3 + C.zzzz;
    vec4 x4 = x0 + C.wwww;

    i = mod289(i);
    float j0 = permute( permute( permute( permute(i.w) + i.z) + i.y) + i.x);
    vec4 j1 = permute( permute( permute( permute (
             i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))
           + i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))
           + i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))
           + i.x + vec4(i1.x, i2.x, i3.x, 1.0 ));


    vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;

    vec4 p0 = grad4(j0,   ip);
    vec4 p1 = grad4(j1.x, ip);
    vec4 p2 = grad4(j1.y, ip);
    vec4 p3 = grad4(j1.z, ip);
    vec4 p4 = grad4(j1.w, ip);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    p4 *= taylorInvSqrt(dot(p4,p4));

    vec3 values0 = vec3(dot(p0, x0), dot(p1, x1), dot(p2, x2)); //value of contributions from each corner at point
    vec2 values1 = vec2(dot(p3, x3), dot(p4, x4));

    vec3 m0 = max(0.5 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0); //(0.5 - x^2) where x is the distance
    vec2 m1 = max(0.5 - vec2(dot(x3,x3), dot(x4,x4)), 0.0);

    vec3 temp0 = -6.0 * m0 * m0 * values0;
    vec2 temp1 = -6.0 * m1 * m1 * values1;

    vec3 mmm0 = m0 * m0 * m0;
    vec2 mmm1 = m1 * m1 * m1;

    float dx = temp0[0] * x0.x + temp0[1] * x1.x + temp0[2] * x2.x + temp1[0] * x3.x + temp1[1] * x4.x + mmm0[0] * p0.x + mmm0[1] * p1.x + mmm0[2] * p2.x + mmm1[0] * p3.x + mmm1[1] * p4.x;
    float dy = temp0[0] * x0.y + temp0[1] * x1.y + temp0[2] * x2.y + temp1[0] * x3.y + temp1[1] * x4.y + mmm0[0] * p0.y + mmm0[1] * p1.y + mmm0[2] * p2.y + mmm1[0] * p3.y + mmm1[1] * p4.y;
    float dz = temp0[0] * x0.z + temp0[1] * x1.z + temp0[2] * x2.z + temp1[0] * x3.z + temp1[1] * x4.z + mmm0[0] * p0.z + mmm0[1] * p1.z + mmm0[2] * p2.z + mmm1[0] * p3.z + mmm1[1] * p4.z;
    float dw = temp0[0] * x0.w + temp0[1] * x1.w + temp0[2] * x2.w + temp1[0] * x3.w + temp1[1] * x4.w + mmm0[0] * p0.w + mmm0[1] * p1.w + mmm0[2] * p2.w + mmm1[0] * p3.w + mmm1[1] * p4.w;

    return vec4(dx, dy, dz, dw) * 49.0;
}

vec3 curl( in vec3 p, in float noiseTime, in float persistence ) {

    vec4 xNoisePotentialDerivatives = vec4(0.0);
    vec4 yNoisePotentialDerivatives = vec4(0.0);
    vec4 zNoisePotentialDerivatives = vec4(0.0);

    for (int i = 0; i < 3; ++i) {

        float twoPowI = pow(2.0, float(i));
        float scale = 0.5 * twoPowI * pow(persistence, float(i));

        xNoisePotentialDerivatives += simplexNoiseDerivatives(vec4(p * twoPowI, noiseTime)) * scale;
        yNoisePotentialDerivatives += simplexNoiseDerivatives(vec4((p + vec3(123.4, 129845.6, -1239.1)) * twoPowI, noiseTime)) * scale;
        zNoisePotentialDerivatives += simplexNoiseDerivatives(vec4((p + vec3(-9519.0, 9051.0, -123.0)) * twoPowI, noiseTime)) * scale;
    }

    return vec3(
        zNoisePotentialDerivatives[1] - yNoisePotentialDerivatives[2],
        xNoisePotentialDerivatives[2] - zNoisePotentialDerivatives[0],
        yNoisePotentialDerivatives[0] - xNoisePotentialDerivatives[1]
    );

}

// https://gist.github.com/yiwenl/3f804e80d0930e34a0b33359259b556c
vec2 rotate(vec2 v, float a) {
	float s = sin(a);
	float c = cos(a);
	mat2 m = mat2(c, -s, s, c);
	return m * v;
}

void main() {

    vec2 uv = gl_FragCoord.xy / resolution.xy;

    vec4 positionInfo = texture2D( u_positionTexture, uv );
    vec3 position = positionInfo.xyz;
    float life = positionInfo.a - u_dieSpeed;

    if(life < 0.0) {
        positionInfo = texture2D( u_defaultPositionTexture, uv );
        position = positionInfo.xyz;
        life = 0.5 + fract(positionInfo.w * 21.4131 + u_time); //random life time
    } else {
        position.xz += position.xz * u_attraction;
        position.y += u_upflow;
        position.xz = rotate(position.xz, u_rotationSpeed);
        position += curl(position * u_curlSize, u_time, 0.1 + (1.0 - life) * 0.1) * u_speed;
    }

    gl_FragColor = vec4(position, life);

}`;
