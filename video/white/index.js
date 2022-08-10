import * as THREE from 'three';
import {Vector3} from 'three';
import metaversefile from 'metaversefile';
const {useFrame, useApp, usePhysics, useCleanup, useRenderer, useLocalPlayer} = metaversefile;

export default () => {
  const app = useApp();
  const renderer = useRenderer();
  const localPlayer = useLocalPlayer();

  renderer.setClearColor(0xffffff, 1);

  const white = (() => {
    const geometry = new THREE.PlaneGeometry(2000, 2000);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.2,
      roughness: 0.8,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    return mesh;
  })();

  white.rotation.x = -Math.PI / 2;

  app.add(white);

  const origin = new Vector3(0, 20, 0);

  useFrame(({timeDiff}) => {
    const player = localPlayer.position;

    if (player.y < -10) {
      physics.setCharacterControllerPosition(localPlayer.characterController, origin);
    }

    // if (localPlayer.avatar) {
    //   if (localPlayer.hasAction('fly')) {
    //     localPlayer.removeAction('fly');
    //   }
    // }
  });

  const physics = usePhysics();
  const floorPhysicsId = physics.addBoxGeometry(
    new THREE.Vector3(0, -10, 0),
    new THREE.Quaternion(),
    new THREE.Vector3(1000, 10, 1000),
    false,
  );

  useCleanup(() => {
    physics.removeGeometry(floorPhysicsId);
  });

  app.updateMatrixWorld();

  return app;
};
