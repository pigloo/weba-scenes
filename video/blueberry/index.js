import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useFrame, useApp, usePhysics, useLoaders, useCleanup} = metaversefile;

const baseUrl = import.meta.url.replace(/(\/)[^\/\/]*$/, '$1');

export default e => {
  const app = useApp();
  const physics = usePhysics();

  const physicsIds = [];

  e.waitUntil((async () => {
    const url = `${baseUrl}gltf/loomdart.glb`;
    let mesh = await new Promise((resolve, reject) => {
      const {gltfLoader} = useLoaders();
      gltfLoader.load(url, resolve, function onprogress() {}, reject);
    });

    mesh = mesh.scene;

    mesh.traverse(o => {
      if (o.isMesh) {
        o.material.metalness = 0;
        o.material.roughness = 1;
        o.material.specular = 0;
        o.castShadow = true;
      }
    });

    app.add(mesh);

    mesh.rotation.y = THREE.MathUtils.degToRad(30);

    const physicsId1 = physics.addGeometry(mesh);

    physicsIds.push(physicsId1);
  })());

  useCleanup(() => {
    for (const physicsId of physicsIds) {
      physics.removeGeometry(physicsId);
    }
  });

  return app;
};
