import * as THREE from 'three';
import metaversefile from 'metaversefile';
import {Vector3} from 'three';

const {useFrame, useApp, useLocalPlayer, usePhysics, useCleanup} = metaversefile;

export default e => {
  const app = useApp();
  const localPlayer = useLocalPlayer();
  const physics = usePhysics();

  const physicsIds = [];

  // MAKE TWO DIFFERENT AREAS WITHIN THE SCENE

  const sky1 = (() => {
    const geometry = new THREE.SphereGeometry(500, 12, 12);
    const material = new THREE.MeshBasicMaterial({color: 0x7BD0DF, side: THREE.BackSide});
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  })();
  app.add(sky1);

  const sky2 = (() => {
    const geometry = new THREE.SphereGeometry(500, 12, 12);
    const material = new THREE.MeshBasicMaterial({color: 0xDF7B7B, side: THREE.BackSide});
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = -1000;
    return mesh;
  })();
  app.add(sky2);

  // ADD SOME SPOTS TO TELEPORT FROM

  const telespot1 = (() => {
    const group = new THREE.Group();
    const geometry = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 32);

    const material1 = new THREE.MeshBasicMaterial({color: 0xffffff});
    const material2 = new THREE.MeshBasicMaterial({color: 0x000000});

    const cylinder1 = new THREE.Mesh(geometry, material1);
    cylinder1.position.set(-0.7, 0, 0);

    const cylinder2 = new THREE.Mesh(geometry, material2);
    cylinder2.position.set(0.7, 0, 0);

    group.add(cylinder1);
    group.add(cylinder2);

    return group;
  })();
  app.add(telespot1);

  const telespot2 = telespot1.clone();
  telespot2.position.z = -1000;
  app.add(telespot2);

  // RANDOM EYE CANDY

  const balls = (() => {
    const group = new THREE.Group();
    const geometry = new THREE.SphereGeometry( 1, 16, 16 );
    const material = new THREE.MeshBasicMaterial({color: 0x1E17B0});

    for (let i = 0; i < 40; i++) {
      const ball = new THREE.Mesh(geometry, material);

      ball.position.x = Math.random() * 40 - 20;
      ball.position.y = Math.random() * 40 - 20;
      ball.position.z = Math.random() * 40 - 20;

      ball.rotation.x = Math.random() * 2 * Math.PI;
      ball.rotation.y = Math.random() * 2 * Math.PI;
      ball.rotation.z = Math.random() * 2 * Math.PI;

      ball.scale.x = ball.scale.y = ball.scale.z = Math.random() * 1;

      group.add(ball);
    }

    return group;
  })();
  app.add(balls);

  const cubes = (() => {
    const group = new THREE.Group();
    const geometry = new THREE.BoxGeometry( 1, 1, 1 );
    const material = new THREE.MeshBasicMaterial({color: 0xB01717});

    for (let i = 0; i < 40; i++) {
      const cube = new THREE.Mesh(geometry, material);

      cube.position.x = Math.random() * 40 - 20;
      cube.position.y = Math.random() * 40 - 20;
      cube.position.z = Math.random() * 40 - 20;

      cube.rotation.x = Math.random() * 2 * Math.PI;
      cube.rotation.y = Math.random() * 2 * Math.PI;
      cube.rotation.z = Math.random() * 2 * Math.PI;

      cube.scale.x = cube.scale.y = cube.scale.z = Math.random() * 1;

      group.add(cube);
    }

    return group;
  })();
  app.add(cubes);
  cubes.position.z = -1000;

  // ADD A FLOOR

  const floor1 = (() => {
    const geometry = new THREE.BoxGeometry(20, 20, 1);
    const material = new THREE.MeshBasicMaterial({
      color: 0x666666,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -1.57;
    mesh.position.y = -0.5;
    return mesh;
  })();
  app.add(floor1);

  // remember the physics dimensions are radius not diameter like three.js
  // also make it nice and thick so people on slow computers dont fall through
  const floorPhysicsId1 = physics.addBoxGeometry(
    new THREE.Vector3(0, -10, 0), // POSITION
    new THREE.Quaternion(), // ROTATION
    new THREE.Vector3(10, 10, 10), // SIZE
    false,
  );
  physicsIds.push(floorPhysicsId1);

  const floor2 = (() => {
    const geometry = new THREE.BoxGeometry(20, 20, 1);
    const material = new THREE.MeshBasicMaterial({
      color: 0x666666,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = -1000;
    mesh.position.y = -0.5;
    mesh.rotation.x = -1.57;
    return mesh;
  })();
  app.add(floor2);

  // remember the physics dimensions are radius not diameter like three.js
  // also make it nice and thick so people on slow computers dont fall through
  const floorPhysicsId2 = physics.addBoxGeometry(
    new THREE.Vector3(0, -10, -1000), //POSITION
    new THREE.Quaternion(), //ROTATION
    new THREE.Vector3(10, 10, 10), //SIZE
    false,
  );
  physicsIds.push(floorPhysicsId2);

  // EVERY FRAME CHECK THE PLAYERS PROXIMITY TO A CERTAIN LOCATION
  // AND TELEPORT THEM IF THEY ARE CLOSE ENOUGH.

  useFrame(({timeDiff}) => {
    const player = localPlayer.position;

    const origin = new Vector3(0, 1, 5);

    const teleportFrom1 = new Vector3(-0.7, 0.5, 0);
    const teleportTo1 = new Vector3(-0.7, 0.5, -1000);

    const teleportFrom2 = new Vector3(0.7, 0.5, -1000);
    const teleportTo2 = new Vector3(0.7, 0.5, 0);

    if (player.distanceTo(teleportFrom1) < 1.2) {
      physics.setCharacterControllerPosition(localPlayer.characterController, teleportTo1);
    } else if (player.distanceTo(teleportFrom2) < 1.2) {
      physics.setCharacterControllerPosition(localPlayer.characterController, teleportTo2);
    } else if (player.y < -50) {
      physics.setCharacterControllerPosition(localPlayer.characterController, origin);
    }
  });

  useCleanup(() => {
    for (const physicsId of physicsIds) {
      physics.removeGeometry(physicsId);
    }
  });

  return app;
};