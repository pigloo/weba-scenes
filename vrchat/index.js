import * as THREE from 'three';
import {Vector3} from 'three';
import metaversefile from 'metaversefile';
const {useFrame, useApp, usePhysics, useCleanup, useRenderer, useLocalPlayer, useLoaders, useCamera} = metaversefile;

const baseUrl = import.meta.url.replace(/(\/)[^\/\/]*$/, '$1');

export default e => {
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // Setup
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  const app = useApp();
  const renderer = useRenderer();
  const physics = usePhysics();
  const localPlayer = useLocalPlayer();
  const camera = useCamera();

  renderer.setClearColor(0x000000, 1);
  const size = new Vector3(1000, 10, 1000);

  const listener = new THREE.AudioListener();
  camera.add(listener);
  const sound = new THREE.Audio(listener);

  const physicsIds = [];
  let bgMaterial;

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // Physics floor to walk on
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  const floorPhysicsId = physics.addBoxGeometry(
    new THREE.Vector3(0, -5, 0),
    new THREE.Quaternion(),
    size.clone().multiplyScalar(0.5),
    false,
  );

  physicsIds.push(floorPhysicsId);

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // Background Color
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  const sphere = (() => {
    const geometry = new THREE.SphereGeometry(1000, 32, 32);

    bgMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uColor1: {
          value: new THREE.Color('rgb(0, 26, 31)'),
        },
        uColor2: {
          value: new THREE.Color('rgb(0, 13, 14)'),
        },
        uDist: {
          value: 1,
        },
        uTime: {
          value: null,
        },
      },
      vertexShader: bgVert,
      fragmentShader: bgFrag,
      side: THREE.BackSide,
    });

    const mesh = new THREE.Mesh(geometry, bgMaterial);
    return mesh;
  })();
  app.add(sphere);

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // Particles
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  const particles = [];

  const generateParticles = () => {
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Geometry
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~

    var particleGeometry = new THREE.PlaneBufferGeometry(1, 1, 1, 1);
    var geometry = new THREE.InstancedBufferGeometry();

    geometry.index = particleGeometry.index;
    geometry.attributes = particleGeometry.attributes;

    var particleCount = 40;
    var fieldSize = 20;
    var translateArray = new Float32Array(particleCount * 3);
    var alphaArray = new Float32Array(particleCount);
    var sizeArray = new Float32Array(particleCount);

    for (var i = 0, l = particleCount; i < l; i++) {
      translateArray[i * 3 + 0] = Math.random() * fieldSize - fieldSize / 2;
      translateArray[i * 3 + 1] = Math.random() * fieldSize - fieldSize / 2;
      translateArray[i * 3 + 2] = Math.random() * fieldSize - fieldSize / 2;

      sizeArray[i] = 1 + Math.random();

      alphaArray[i] = Math.random() * 0.025;
    }

    geometry.setAttribute(
      'translate',
      new THREE.InstancedBufferAttribute(translateArray, 3),
    );

    geometry.setAttribute(
      'alpha',
      new THREE.InstancedBufferAttribute(alphaArray, 1),
    );

    geometry.setAttribute(
      'size',
      new THREE.InstancedBufferAttribute(sizeArray, 1),
    );

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Material
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~

    const material = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: particleVert,
      fragmentShader: particleFrag,
      blending: THREE.NormalBlending,
      //depthTest: false,
      depthWrite: false,
      transparent: true,
    });

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Mesh
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~

    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;

    return mesh;
  };

  for (let i = 0; i < 8; i++) {
    particles[i] = generateParticles();
  }

  const distance = 20;

  // this should probably be programatic
  particles[0].position.set(distance, 2, 0);
  particles[1].position.set(distance, 2, distance);
  particles[2].position.set(0, 2, distance);
  particles[3].position.set(-distance, 2, distance);
  particles[4].position.set(-distance, 2, 0);
  particles[5].position.set(-distance, 2, -distance);
  particles[6].position.set(0, 2, -distance);
  particles[7].position.set(distance, 2, -distance);

  for (const p of particles) {
    app.add(p);
  }

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // Logo
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  let mesh = new THREE.Group(); //initialise as group so no render loop errors at start

  ((async () => {
    const url = `${baseUrl}assets/logo.glb`;
    mesh = await new Promise((resolve, reject) => {
      const {gltfLoader} = useLoaders();
      gltfLoader.load(url, resolve, function onprogress() {}, reject);
    });

    mesh = mesh.scene;

    app.add(mesh);
  })());

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // Audio
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  ((async () => {
    const audio = new Promise(resolve => {
      const audioLoader = new THREE.AudioLoader();
      audioLoader.load(`${baseUrl}assets/music.mp3`, function(buffer) {
        sound.setBuffer(buffer);
        sound.setLoop(true);
        sound.setVolume(0.5);

        resolve();
      });
    });

    const gesture = new Promise(resolve => {
      function onGesture() {
        document.body.removeEventListener('touchend', onGesture);
        document.body.removeEventListener('mouseup', onGesture);
        document.body.removeEventListener('keypress', onGesture);
        resolve();
      }
      document.body.addEventListener('touchend', onGesture);
      document.body.addEventListener('mouseup', onGesture);
      document.body.addEventListener('keypress', onGesture);
    });

    // load audio and await user input to play sound thereby appeasing browser audio gods
    await audio;
    await gesture;

    sound.play();
  })());

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // Run app stuff
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  const origin = new Vector3(0, 0, 0);
  const spawn = new Vector3(0, 3, 8);

  useFrame(({timeDiff}) => {

    // Rotate Logo
    mesh.rotation.y += timeDiff * 0.001;
    mesh.updateMatrixWorld();

    // Rotate Particles
    for (const p of particles) {
      p.rotation.x += timeDiff * 0.00002;
      p.rotation.y += timeDiff * 0.00002;
      p.rotation.z += timeDiff * 0.00002;
      p.updateMatrixWorld();
    }

    // Get player distance to center
    const player = localPlayer.position;
    const characterController = localPlayer.characterPhysics.characterController;

    const dist = player.distanceTo(origin);
    const distFade = 20;
    
    // Pass player distance to audio and background shader
    if (dist < distFade) {
      sound.setPlaybackRate(1);
      bgMaterial.uniforms.uDist.value = 1;
    } else {
      let rate = 1 - ((dist - distFade) * 0.01);
      if (rate < 0.2) { rate = 0.2; }
      sound.setPlaybackRate(rate);
      bgMaterial.uniforms.uDist.value = rate;
    }

    // Pass time to background shader for random noise movement
    bgMaterial.uniforms.uTime.value += timeDiff * 0.0001;

    // If the player gets too far from the center move them back THERE IS NO ESCAPE!
    if (dist > 200) {
      physics.setCharacterControllerPosition(characterController, spawn);

      if (localPlayer.hasAction('narutoRun')) {
        localPlayer.removeAction('narutoRun');
      }

      if (localPlayer.hasAction('fly')) {
        localPlayer.removeAction('fly');
      }
    }

    app.updateMatrixWorld();
  });

  // Clean up stuff when chaning scene (probably forgot something here)
  useCleanup(() => {
    for (const physicsId of physicsIds) {
      physics.removeGeometry(physicsId);
    }
    sound.stop();
  });

  app.updateMatrixWorld();

  return app;
};

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // Particle Shader
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const particleVert = `
attribute vec3 translate;
attribute float size;
attribute float alpha;

varying vec2 vUv;
varying float vAlpha;

#include <common>
#include <logdepthbuf_pars_vertex>

void main() {

  vec4 mvPosition = modelViewMatrix * vec4( translate, 1.0 );

  vUv = uv;
  vAlpha = alpha;

  float scale = clamp(size / - mvPosition.z, 0.0, 0.05) * 10.0;

  mvPosition.xyz += position * scale;

  gl_Position = projectionMatrix * mvPosition;

  // Leave at end of main
  #include <logdepthbuf_vertex>
}
`;

const particleFrag = `
varying vec2 vUv;
varying float vAlpha;

#include <common>
#include <logdepthbuf_pars_fragment>

float random (vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898,78.233)))* 43758.5453123);
}

void main() {

  float dist = distance(vUv, vec2(0.5));

  float circle = smoothstep(0.5, 0.25, dist + (random(vUv) * 0.025));

  float alpha = circle * vAlpha;

  gl_FragColor = vec4( vec3(1.0), alpha );

  // Leave at end of main
  #include <logdepthbuf_fragment>
}
`;

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // Background Color Shader
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const bgVert = `
  varying vec2 vUv;

  void main() {
    vUv = uv;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
  }
`;

const bgFrag = `
  uniform float uTime;
  uniform float uDist;
  uniform vec3 uColor1;
  uniform vec3 uColor2;

  varying vec2 vUv;

  float random(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453 + uTime);
  }
  
  void main() {

    float mixValue = smoothstep(0.45, 0.55, vUv.y);

    vec3 greenCol = mix(uColor2, uColor1, mixValue);

    float rnd = random(vUv);
    vec3 noise = vec3(rnd);

    gl_FragColor = vec4(mix(noise, greenCol, uDist), 1.0);
  }
`;
