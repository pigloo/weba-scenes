import * as THREE from 'three';
import {Water} from 'three/examples/jsm/objects/Water.js';
import metaversefile from 'metaversefile';
const {useFrame, useApp, usePhysics, useCleanup, useLocalPlayer} = metaversefile;

const baseUrl = import.meta.url.replace(/(\/)[^\/\\]*$/, '$1');

export default () => {
  const app = useApp();

  const waterNormals = new THREE.Texture();
  waterNormals.wrapS = THREE.RepeatWrapping;
  waterNormals.wrapT = THREE.RepeatWrapping;
  {
    const img = new Image();
    img.onload = () => {
      waterNormals.image = img;
      waterNormals.needsUpdate = true;
    };
    img.onerror = err => {
      console.warn(err);
    };
    img.crossOrigin = 'Anonymous';
    img.src = baseUrl + 'waternormals.jpg';
  }

  const water = (() => {
    const textureSize = 1024;
    const geometry = new THREE.PlaneGeometry(2000, 2000);
    const water = new Water(geometry, {
      textureWidth: textureSize,
      textureHeight: textureSize,
      waterNormals: waterNormals,
      sunDirection: new THREE.Vector3(0, 200, -900),
      sunColor: 0x000000,
			waterColor: 0x000000,
      distortionScale: 0.75,
      fog: true,
    });
    return water;
  })();

  water.rotation.x = -Math.PI / 2;

  app.add(water);

  useFrame(({timeDiff}) => {
    water.material.uniforms.time.value += timeDiff * 0.0001;
  });

  const physics = usePhysics();
  const floorPhysicsId = physics.addBoxGeometry(
    new THREE.Vector3(0, -10, 0),
    new THREE.Quaternion(),
    new THREE.Vector3(1000, 10, 1000),
    false
  );

  useCleanup(() => {
    // console.log('clean up street');
    physics.removeGeometry(floorPhysicsId);
  });

  app.updateMatrixWorld();

  return app;
};
