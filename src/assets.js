// Modular asset loading. Procedural placeholders live in props.js;
// real GLB models can be dropped in later via loadModel() without
// touching game code (chunks/obstacles just call builder functions).
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const draco = new DRACOLoader();
draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');

export const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(draco);

export function loadModel(url) {
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      url,
      (gltf) => {
        gltf.scene.traverse((o) => {
          if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
        });
        resolve(gltf.scene);
      },
      undefined,
      reject
    );
  });
}
