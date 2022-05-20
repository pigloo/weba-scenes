import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, useRenderer, usePhysics, useCleanup} = metaversefile;

const skyCol = 0x3b497a;
const groundCol = 0xe1bf92; // 0xe8e1d1

export default () => {
  const app = useApp();
  //const renderer = useRenderer();

  const sky = (() => {
    const geometry = new THREE.SphereGeometry( 1000, 12, 12 );
    const material = new THREE.MeshBasicMaterial( { color: skyCol, side: THREE.BackSide, fog: false } );
    const mesh = new THREE.Mesh( geometry, material );
    return mesh 
  })();
  app.add(sky);

  const floor = (() => {
    const geometry = new THREE.PlaneBufferGeometry(2000, 2000, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      roughness: 1,
      metalness: 0,
      color: groundCol,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = 0;
    mesh.rotation.x = -1.57;
    mesh.receiveShadow = true;
    return mesh;
  })();
  app.add(floor);

  app.updateMatrixWorld();

  const physics = usePhysics();
  const floorPhysicsId = physics.addBoxGeometry(
    new THREE.Vector3(0, -10, 0),
    new THREE.Quaternion(),
    new THREE.Vector3(1000, 10, 1000),
    false,
  );

  useCleanup(() => {
    // console.log('clean up street');
    physics.removeGeometry(floorPhysicsId);
  });

  return app;
};