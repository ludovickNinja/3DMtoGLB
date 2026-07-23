import * as THREE from 'three';
import { Rhino3dmLoader } from 'three/addons/loaders/3DMLoader.js';

export async function load3DMFile(arrayBuffer) {
    return new Promise((resolve, reject) => {
        const loader = new Rhino3dmLoader();

        // rhino3dm WASM library is loaded from CDN
        loader.setLibraryPath('https://cdn.jsdelivr.net/npm/rhino3dm@8.4.0/');

        loader.parse(arrayBuffer, (object) => {
            if (!object) {
                reject(new Error('Failed to parse 3dm file'));
                return;
            }

            const root = new THREE.Group();
            root.name = 'ModelRoot';

            // Rhino is Z-up, Three.js is Y-up: rotate so Rhino's Z axis becomes Three's Y axis
            root.rotation.x = -Math.PI / 2;

            // Layer table from the 3dm file: [{ name, color, visible, ... }, ...]
            const layers = object.userData?.layers || [];

            object.traverse((child) => {
                if (child.geometry && !child.geometry.attributes.normal) {
                    child.geometry.computeVertexNormals();
                }

                if (child.isMesh && !child.material) {
                    child.material = new THREE.MeshStandardMaterial({
                        color: 0x888888,
                        metalness: 0.2,
                        roughness: 0.8
                    });
                }

                if (child.isMesh || child.isLine || child.isPoints) {
                    const attrs = child.userData?.attributes || {};
                    const layerIndex = attrs.layerIndex;
                    const layerInfo = layers[layerIndex];
                    const layerName = layerInfo?.name || layerInfo?.fullPath || 'Default';

                    let partName = child.name;
                    if (!partName) partName = attrs.name || `Object_${child.id}`;

                    child.userData.designBuddy = {
                        partName,
                        layerName,
                        originalRhinoLayerIndex: layerIndex ?? null,
                        originalRhinoObjectId: attrs.id || null,
                        objectType: child.type,
                        isSelectable: true
                    };

                    child.name = `${layerName}/${partName}`;
                }
            });

            // Forward layer table to the root for the app to consume
            root.userData.rhinoLayers = layers;
            root.add(object);
            resolve(root);
        }, (error) => {
            reject(new Error(`3dm parsing error: ${error.message || error}`));
        });
    });
}
