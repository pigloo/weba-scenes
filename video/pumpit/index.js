import * as THREE from 'three';
//import {PositionalAudioHelper} from 'three/examples/jsm/helpers/PositionalAudioHelper.js';

import metaversefile from 'metaversefile';
const {useApp, usePhysics, useCleanup, useCamera} = metaversefile;

const baseUrl = import.meta.url.replace(/(\/)[^\/\/]*$/, '$1');

export default e => {
  const app = useApp();
  const physics = usePhysics();
  const camera = useCamera();

  let video = null;
  let listener = null;
  let positionalAudio = null;

  const physicsIds = [];

  // something to hold the screen
  const geometry1 = new THREE.BoxBufferGeometry(20.4, 11.6, 0.1);
  const material1 = new THREE.MeshStandardMaterial({color: 0x000000});
  const mesh1 = new THREE.Mesh(geometry1, material1);
  app.add(mesh1);
  mesh1.position.y = 11.6 / 2;
  mesh1.position.z = 0.11;

  // screen holder physics
  const physicsId1 = physics.addGeometry(mesh1);
  physicsIds.push(physicsId1);

  ((async () => {
    // make an html video element and add to document
    video = document.createElement('video');

    video.src = `${baseUrl}assets/video.mp4`;

    video.autoplay = false;
    video.controls = true;
    video.muted = true;
    video.loop = true;

    const el = document.getElementById('root');

    el.appendChild(video);

    // make a video texture and apply to the plane
    const texture = new THREE.VideoTexture(video);

    const geometry2 = new THREE.PlaneBufferGeometry(20, 11.2, 1, 1);
    const material2 = new THREE.MeshBasicMaterial({color: 0xffffff, map: texture});
    const mesh2 = new THREE.Mesh(geometry2, material2);
    mesh2.rotation.y = Math.PI;

    app.add(mesh2);
    mesh2.position.y = 11.2 / 2 + 0.2;

    const audio = new Promise(resolve => {
    // MAKE SOME POSITIONAL AUDIO THAT ONLY PLAYS WHEN CLOSE TO THE SCREEN
      listener = new THREE.AudioListener();
      camera.add(listener);

      positionalAudio = new THREE.PositionalAudio(listener);

      const audioLoader = new THREE.AudioLoader();
      audioLoader.load(`${baseUrl}assets/video.mp4`, buffer => {
        positionalAudio.setBuffer(buffer);
        positionalAudio.setRefDistance(5); // Distance audio can be heard from
        positionalAudio.loop = true;

        resolve();
      });
      mesh2.add(positionalAudio);
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

    // load audio and await use input to play to appease browser audio gods
    await audio;
    await gesture;

    positionalAudio.play();
    video.play();
  })());

  useCleanup(() => {
    for (const physicsId of physicsIds) {
      physics.removeGeometry(physicsId);
    }

    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
      video.remove();
    }

    if (positionalAudio) {
      positionalAudio.stop();
    }

    if (listener) {
      camera.remove(listener);
    }
  });

  return app;
};
