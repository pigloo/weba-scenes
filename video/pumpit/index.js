import * as THREE from 'three';
import {PositionalAudioHelper} from 'three/examples/jsm/helpers/PositionalAudioHelper.js';

import metaversefile from 'metaversefile';
import { MathUtils } from 'three';
const {useApp, usePhysics, useCleanup, useCamera} = metaversefile;

const baseUrl = import.meta.url.replace(/(\/)[^\/\/]*$/, '$1');

export default e => {
  const app = useApp();
  const physics = usePhysics();
  const camera = useCamera();

  let playing = false;

  let video = null;
  let listener = null;

  const physicsIds = [];

  e.waitUntil((async () => {
    // MAKE A VIDEO ELEMENT AND ADD TO HTML
    video = document.createElement('video');

    video.src = `${baseUrl}assets/video.mp4`;

    video.autoplay = false;
    video.controls = true;
    video.muted = true;
    video.loop = true;

    const el = document.getElementById('root');

    el.appendChild(video);

    // MAKE A VIDEO TEXTURE AND APPLY TO A PLANE
    const texture = new THREE.VideoTexture(video);

    const geometry = new THREE.PlaneBufferGeometry(20, 11.2, 1, 1);
    const material = new THREE.MeshBasicMaterial({color: 0xffffff, map: texture});
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.y = Math.PI;

    app.add(mesh);
    mesh.position.y = 11.2 / 2 + 0.2;

    // MAKE SOME POSITIONAL AUDIO THAT ONLY PLAYS WHEN CLOSE TO THE SCREEN
    listener = new THREE.AudioListener();
    camera.add(listener);

    const positionalAudio = new THREE.PositionalAudio(listener);

    const audioLoader = new THREE.AudioLoader();
    audioLoader.load(`${baseUrl}assets/video.mp4`, buffer => {
      positionalAudio.setBuffer(buffer);
      positionalAudio.setRefDistance(5); // Distance audio can be heard from
      positionalAudio.loop = true;

      // DONT PLAY UNTIL THE PLAYER USES THE MOUSE OTHERWISE BROWSER WILL NOT PLAY AUDIO
      // MIGHT BE A BETTER WAY TO TRIGGER THIS?
      const playVideo = () => {
        positionalAudio.play();
        video.play();
        document.removeEventListener('mousemove', playVideo, false);
      };

      document.addEventListener('mousemove', playVideo, false);
    });
    mesh.add(positionalAudio);
  })());

  // SOMETHING TO HOLD THE SCREEN
  const geometry = new THREE.BoxBufferGeometry(20.4, 11.6, 0.1);
  const material = new THREE.MeshStandardMaterial({color: 0x000000});
  const mesh = new THREE.Mesh(geometry, material);
  app.add(mesh);
  mesh.position.y = 11.6 / 2;
  mesh.position.z = 0.11;

  // SCREEN PHYSICS
  const physicsId1 = physics.addGeometry(mesh);
  physicsIds.push(physicsId1);

  useCleanup(() => {
    for (const physicsId of physicsIds) {
      physics.removeGeometry(physicsId);
    }

    video.remove();
    camera.remove(listener);
  });

  return app;
};
