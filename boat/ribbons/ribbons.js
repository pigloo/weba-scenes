import * as THREE from 'three';
import {GPUComputationRenderer} from 'three/examples/jsm/misc/GPUComputationRenderer';

export class Ribbons {
  constructor(renderer, num, length) {
    this.renderer = renderer;

    this.computeRenderer;
    this.num = num;
    this.length = length;

    this.mesh = null;

    this.computeShaders = {
      position: {
        texture: null,
        uniforms: null,
      },
      velocity: {
        texture: null,
        uniforms: null,
      },
    };

    this.radius = 20;
    this.lifespan = 20;
    this.thickness = 0.02;
    this.ribbonSides = 4;
    this.avoidSphereSize = 2;

    this.initComputeRenderer();
    this.createRibbons();
  }

  initComputeRenderer() {
    this.computeRenderer = new GPUComputationRenderer(
      this.length,
      this.num,
      this.renderer,
    );

    if (this.computeRenderer == null) {
      return false;
    }

    const initPositionTex = this.computeRenderer.createTexture();
    const initVelocityTex = this.computeRenderer.createTexture();

    this.initPosition(initPositionTex);

    this.computeShaders.position.texture = this.computeRenderer.addVariable(
      'texturePosition',
      texturePosition,
      initPositionTex,
    );
    this.computeShaders.velocity.texture = this.computeRenderer.addVariable(
      'textureVelocity',
      textureVelocity,
      initVelocityTex,
    );

    this.computeRenderer.setVariableDependencies(
      this.computeShaders.position.texture,
      [
        this.computeShaders.position.texture,
        this.computeShaders.velocity.texture,
      ],
    );
    this.computeShaders.position.uniforms = this.computeShaders.position.texture.material.uniforms;
    this.computeShaders.position.uniforms.time = {
      value: 0,
    };

    this.computeRenderer.setVariableDependencies(
      this.computeShaders.velocity.texture,
      [
        this.computeShaders.position.texture,
        this.computeShaders.velocity.texture,
      ],
    );
    this.computeShaders.velocity.uniforms = this.computeShaders.velocity.texture.material.uniforms;
    this.computeShaders.velocity.uniforms.time = {
      value: 0,
    };
    this.computeShaders.velocity.uniforms.seed = {
      value: Math.random() * this.radius,
    };
    this.computeShaders.velocity.uniforms.avoidPos = {
      value: new THREE.Vector3(0, 0, 0),
    };
    this.computeShaders.velocity.uniforms.avoidScale = {
      value: 0,
    };
    this.computeShaders.velocity.uniforms.camY = {
      value: 0,
    };
    this.computeShaders.position.uniforms.textureDefaultPosition = {
      value: initPositionTex,
    };

    this.computeRenderer.init();

    return true;
  }

  initPosition(tex) {
    var texArray = tex.image.data;
    var i4;
    var r, phi, theta;
    for (var i = 0; i < texArray.length; i += this.length * 4) {
      r = (0.5 + Math.random() * 0.5) * this.radius;
      phi = (Math.random() - 0.5) * Math.PI;
      theta = Math.random() * Math.PI * 2;
      const w = this.lifespan + Math.random() * this.lifespan;
      for (let j = 0; j < this.length * 4; j += 4) {
        texArray[i + j + 0] = r * Math.cos(theta) * Math.cos(phi);
        texArray[i + j + 1] = r * Math.sin(phi);
        texArray[i + j + 2] = r * Math.sin(theta) * Math.cos(phi);
        texArray[i + j + 3] = w;
      }
    }
  }

  createRibbons() {
    const geometry = new THREE.InstancedBufferGeometry();

    const posArray = [];
    const indexArray = [];
    const normalArray = [];
    const uvXArray = [];
    const uvYArray = [];

    const r = this.thickness;
    const res = this.ribbonSides;
    for (let j = 0; j < this.length; j++) {
      const cNum = j;
      for (let k = 0; k < res; k++) {
        const rad = ((Math.PI * 2) / res) * k;
        const x = Math.cos(rad) * r;
        const y = Math.sin(rad) * r;
        const z = 0; // j * 1.6
        // z = 0

        posArray.push(x);
        posArray.push(y);
        posArray.push(z);

        const nml = new THREE.Vector3(x, y, z);
        nml.normalize();

        normalArray.push(nml.x, nml.y, nml.z);

        uvXArray.push(j / this.length);

        const c = cNum * res + k;
        if (j > 0) {
          indexArray.push(c);
          indexArray.push((cNum - 1) * res + ((k + 1) % res));
          indexArray.push(cNum * res + ((k + 1) % res));

          indexArray.push(c);
          indexArray.push(c - res);
          indexArray.push((cNum - 1) * res + ((k + 1) % res));
        }
      }
    }

    const pos = new Float32Array(posArray);
    const normal = new Float32Array(normalArray);
    const indices = new Uint32Array(indexArray);
    const uvx = new Float32Array(uvXArray);

    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute('uvx', new THREE.BufferAttribute(uvx, 1));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));

    // instancing attribute
    for (let i = 0; i < this.num; i++) {
      uvYArray.push(i / this.num);
    }

    const uvy = new Float32Array(uvYArray);
    geometry.setAttribute(
      'uvy',
      new THREE.InstancedBufferAttribute(uvy, 1, false, 1),
    );

    // FIND OUT LIGHT POSITION FROM WEBA ?
    const lightPos = new THREE.Vector3(-16, 16, -6);

    const customUni = {
      texturePosition: {
        value: null,
      },
      textureVelocity: {
        value: null,
      },
    };

    const standard = THREE.ShaderLib.standard;
    this.uniforms = THREE.UniformsUtils.merge([standard.uniforms, customUni]);
    this.uniforms.emissive.value = new THREE.Color(0xffffff);

    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: ribbonVs,
      fragmentShader: ribbonFs,
      transparent: true,
      //lights: true,
      side: THREE.DoubleSide,
      //blending: THREE.MultiplyBlending,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.matrixAutoUpdate = false;
    this.mesh.updateMatrix();

    // const customDepthMaterial = new THREE.ShaderMaterial({
    //   uniforms: {...this.uniforms, u_lightPos: {type: 'v3', value: lightPos}},
    //   vertexShader: depthVs,
    //   fragmentShader: depthFs,
    //   depthTest: true,
    //   depthWrite: true,
    //   //side: THREE.BackSide,
    //   blending: THREE.NoBlending,
    // });

    //this.mesh.customDepthMaterial = customDepthMaterial;

    // this.mesh.castShadow = true; // default is false
    // this.mesh.receiveShadow = true; // default
    //this.mesh.frustumCulled = true;
  }

  update(time) {
    // console.log(time)
    this.computeRenderer.compute();
    this.computeShaders.position.uniforms.time.value += time;
    this.computeShaders.velocity.uniforms.time.value += time;
    this.uniforms.texturePosition.value = this.computeRenderer.getCurrentRenderTarget(
      this.computeShaders.position.texture,
    ).texture;
    this.uniforms.textureVelocity.value = this.computeRenderer.getCurrentRenderTarget(
      this.computeShaders.velocity.texture,
    ).texture;
  }

  setAvoidObject(pos, scale) {
    this.computeShaders.velocity.uniforms.avoidPos.value = pos;
    this.computeShaders.velocity.uniforms.avoidScale.value = scale;
  }
}

const ribbonVs = `
#include <common>
#include <logdepthbuf_pars_vertex> // IMPORTANT TO ADD THIS FOR DEPTH CALCS IN WEBA

varying vec3 vViewPosition;
attribute float uvx;
attribute float uvy;
uniform sampler2D texturePosition;

varying vec2 vUv;
varying float vLife;

//float PI = 3.141592653589793;

float atan2(float y, float x)
{
  return x == 0.0 ? sign(y) * PI / 2.0 : atan(y, x);
}

mat2 rotate(float rad){
  return mat2(cos(rad),sin(rad),-sin(rad),cos(rad));
}

void main() {

  vec2 nUV = vec2(uvx,uvy);

  vec3 p = position;
  vec3 pos = texture2D( texturePosition, vec2(uvx,uvy)).xyz;
  float life = texture2D( texturePosition, vec2(uvx,uvy)).w;
  vec3 nPos = texture2D( texturePosition, nUV).xyz;

  vec3 vec = normalize(nPos - pos);
  float rotX = atan2(vec.y,vec.z);

  p.yz *= rotate(rotX);

  vec4 mvPosition = modelViewMatrix * vec4(p + pos, 1.0 );
  gl_Position = projectionMatrix * mvPosition;

  vViewPosition = -mvPosition.xyz;

  vUv.x = uvx;
  vUv.y = uvy;
  vLife = life;

  #include <logdepthbuf_vertex> // IMPORTANT TO ADD THIS FOR DEPTH CALCS IN WEBA
}
`;

const ribbonFs = `
#include <common>
#include <logdepthbuf_pars_fragment> // IMPORTANT TO ADD THIS FOR DEPTH CALCS IN WEBA

precision highp float;

varying vec2 vUv;
varying float vLife;

float random (vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898,78.233)))* 43758.5453123);
}

void main() {

  float alpha = min(1.0, vLife * 0.1);

  gl_FragColor = vec4( vec3(1.) , alpha - vUv.x  );

  #include <logdepthbuf_fragment> // IMPORTANT TO ADD THIS FOR DEPTH CALCS IN WEBA
}
`;

// const depthVs = `
// varying vec3 vViewPosition;
// attribute float uvx;
// attribute float uvy;
// uniform sampler2D texturePosition;
// varying vec4 v_worldPosition;

// varying vec2 vUv;
// varying float vLife;

// float PI = 3.141592653589793;

// float atan2(float y, float x)
// {
//   return x == 0.0 ? sign(y) * PI / 2.0 : atan(y, x);
// }

// mat2 rotate(float rad){
//   return mat2(cos(rad),sin(rad),-sin(rad),cos(rad));
// }

// void main() {

//   vec2 nUV = vec2(uvx,uvy);

//   vec3 p = position;
//   vec3 pos = texture2D( texturePosition, vec2(uvx,uvy)).xyz;
//   float life = texture2D( texturePosition, vec2(uvx,uvy)).w;
//   vec3 nPos = texture2D( texturePosition, nUV).xyz;

//   vec3 vec = normalize(nPos - pos);
//   float rotX = atan2(vec.y,vec.z);

//   p.yz *= rotate(rotX);

//   vec4 mvPosition = modelViewMatrix * vec4(p + pos, 1.0 );
//   gl_Position = projectionMatrix * mvPosition;

//   vViewPosition = -mvPosition.xyz;

//   v_worldPosition = modelMatrix * vec4(p + pos, 1.0 );
//   vUv.x = uvx;
//   vUv.y = uvy;
//   vLife = life;
// }
// `;

// const depthFs = `
// uniform vec3 u_lightPos;
// varying vec4 v_worldPosition;
// varying vec2 v_Uv;

// #include <packing>

// void main () {
//   //if(distance(v_Uv, vec2(0.5)) > 0.5) discard;
//   gl_FragColor = packDepthToRGBA( length( v_worldPosition.xyz - u_lightPos.xyz ) * 0.001 );
// }
// `;

const texturePosition = `
uniform float time;
uniform sampler2D textureDefaultPosition;

void main() {
	vec2 uv = gl_FragCoord.xy / resolution.xy;
	vec4 positionInfo = texture2D( texturePosition, uv );
	vec4 velocityInfo = texture2D( textureVelocity, uv );
	float life = positionInfo.w;
	life -= 0.1;

	if(life < 0.0) {
		// positionInfo = texture2D( textureDefaultPosition, uv );
    // vec3 position = positionInfo.xyz;
    // life = positionInfo.w;//0.5 + fract(positionInfo.w * 21.4131 + time); //random life time
    // gl_FragColor = vec4(position, life);

    gl_FragColor = texture2D( textureDefaultPosition, uv );
	}else{
		if(gl_FragCoord.x <= 1.0){
			vec3 pos = positionInfo.xyz;
			vec3 vel = velocityInfo.xyz;
			pos += vel * 0.01;
			gl_FragColor = vec4(pos, life);
		}else{
			vec2 bUV = (gl_FragCoord.xy - vec2(1.0,0.0)) / resolution.xy;
			vec3 bPos = texture2D( texturePosition, bUV ).xyz;
			gl_FragColor = vec4(bPos, life);
		}
	}
}`;

const textureVelocity = `
uniform float time;
uniform float seed;
uniform vec3 avoidPos;
uniform float avoidScale;

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
return x - floor(x * (1.0 / 289.0)) * 289.0; }

float mod289(float x) {
return x - floor(x * (1.0 / 289.0)) * 289.0; }

vec4 permute(vec4 x) {
	return mod289(((x*34.0)+1.0)*x);
}

float permute(float x) {
	return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r)
{
return 1.79284291400159 - 0.85373472095314 * r;
}

float taylorInvSqrt(float r)
{
return 1.79284291400159 - 0.85373472095314 * r;
}

vec4 grad4(float j, vec4 ip)
{
const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
vec4 p,s;

p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
s = vec4(lessThan(p, vec4(0.0)));
p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www;

return p;
}

// (sqrt(5) - 1)/4 = F4, used once below
#define F4 0.309016994374947451

float snoise(vec4 v)
{
const vec4  C = vec4( 0.138196601125011,  // (5 - sqrt(5))/20  G4
						0.276393202250021,  // 2 * G4
						0.414589803375032,  // 3 * G4
					-0.447213595499958); // -1 + 4 * G4

// First corner
vec4 i  = floor(v + dot(v, vec4(F4)) );
vec4 x0 = v -   i + dot(i, C.xxxx);

// Other corners

// Rank sorting originally contributed by Bill Licea-Kane, AMD (formerly ATI)
vec4 i0;
vec3 isX = step( x0.yzw, x0.xxx );
vec3 isYZ = step( x0.zww, x0.yyz );
//  i0.x = dot( isX, vec3( 1.0 ) );
i0.x = isX.x + isX.y + isX.z;
i0.yzw = 1.0 - isX;
//  i0.y += dot( isYZ.xy, vec2( 1.0 ) );
i0.y += isYZ.x + isYZ.y;
i0.zw += 1.0 - isYZ.xy;
i0.z += isYZ.z;
i0.w += 1.0 - isYZ.z;

// i0 now contains the unique values 0,1,2,3 in each channel
vec4 i3 = clamp( i0, 0.0, 1.0 );
vec4 i2 = clamp( i0-1.0, 0.0, 1.0 );
vec4 i1 = clamp( i0-2.0, 0.0, 1.0 );

//  x0 = x0 - 0.0 + 0.0 * C.xxxx
//  x1 = x0 - i1  + 1.0 * C.xxxx
//  x2 = x0 - i2  + 2.0 * C.xxxx
//  x3 = x0 - i3  + 3.0 * C.xxxx
//  x4 = x0 - 1.0 + 4.0 * C.xxxx
vec4 x1 = x0 - i1 + C.xxxx;
vec4 x2 = x0 - i2 + C.yyyy;
vec4 x3 = x0 - i3 + C.zzzz;
vec4 x4 = x0 + C.wwww;

// Permutations
i = mod289(i);
float j0 = permute( permute( permute( permute(i.w) + i.z) + i.y) + i.x);
vec4 j1 = permute( permute( permute( permute (
			i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))
		+ i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))
		+ i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))
		+ i.x + vec4(i1.x, i2.x, i3.x, 1.0 ));

// Gradients: 7x7x6 points over a cube, mapped onto a 4-cross polytope
// 7*7*6 = 294, which is close to the ring size 17*17 = 289.
vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;

vec4 p0 = grad4(j0,   ip);
vec4 p1 = grad4(j1.x, ip);
vec4 p2 = grad4(j1.y, ip);
vec4 p3 = grad4(j1.z, ip);
vec4 p4 = grad4(j1.w, ip);

// Normalise gradients
vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
p0 *= norm.x;
p1 *= norm.y;
p2 *= norm.z;
p3 *= norm.w;
p4 *= taylorInvSqrt(dot(p4,p4));

// Mix contributions from the five corners
vec3 m0 = max(0.6 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);
vec2 m1 = max(0.6 - vec2(dot(x3,x3), dot(x4,x4)            ), 0.0);
m0 = m0 * m0;
m1 = m1 * m1;
return 49.0 * ( dot(m0*m0, vec3( dot( p0, x0 ), dot( p1, x1 ), dot( p2, x2 )))
			+ dot(m1*m1, vec2( dot( p3, x3 ), dot( p4, x4 ) ) ) ) ;
}

void main() {
	if(gl_FragCoord.x >= 1.0) return;

	vec2 uv = gl_FragCoord.xy / resolution.xy;
	vec4 positionInfo = texture2D( texturePosition, uv );
	float life = positionInfo.w;

	if(life < 0.0) {

	  gl_FragColor = vec4( 0.0 );

	}else{

	vec3 pos = positionInfo.xyz;

	vec3 vel = texture2D( textureVelocity, uv ).xyz;
	float bigScale = 0.1;
	float littleScale = 1.0;

	vel += vec3(
		snoise( vec4( bigScale * pos, 7.225 * seed + 0.5 * time ) ),
		snoise( vec4( bigScale * pos, 3.553 * seed + 0.5 * time ) ),
		snoise( vec4( bigScale * pos, 1.259 * seed + 0.5 * time ) )
	) * 8.0;

	vel += vec3(
		snoise( vec4( littleScale * pos, 7.225 * seed + 0.5 * time ) ),
		snoise( vec4( littleScale * pos, 3.553 * seed + 0.5 * time ) ),
		snoise( vec4( littleScale * pos, 1.259 * seed + 0.5 * time ) )
	) * 4.0;

	vel += -(pos) * length(pos) * 0.001; // attract to middle
	vel += (pos - avoidPos) * max(0.0,(1.0 - (distance(pos,avoidPos) - avoidScale))) * 0.1; // avoid center
	vel *= 0.8;

	gl_FragColor = vec4( vel.xyz, 0.0 );

	}
}
`;
