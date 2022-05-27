import * as THREE from 'three';
import {Ribbons} from './ribbons.js';
import metaversefile from 'metaversefile';
// const { useApp, useFrame } = metaversefile;
const {useFrame, useApp, useRenderer} = metaversefile;

export default e => {
  console.log(e)
  const app = useApp();
  const renderer = useRenderer();

  let ribbons;

  const Abstract = (() => {
    ribbons = new Ribbons(renderer, 128, 32);
    ribbons.setAvoidObject(new THREE.Vector3(0, 0, 0), 10);
    ribbons.mesh.frustumCulled = false;
    return ribbons.mesh;
  })();

  app.add(Abstract);

  app.updateMatrixWorld();

  useFrame(({timeDiff}) => {
    ribbons.update(timeDiff * 0.001);
  });

  return app;
};
