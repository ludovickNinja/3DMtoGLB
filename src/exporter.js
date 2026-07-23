import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { isDiamondMaterial } from './diamondMaterial.js';

function swapDiamondMaterials(root) {
    const swaps = [];
    root.traverse((child) => {
        if (child.isMesh && isDiamondMaterial(child.material) && child.userData.originalMaterial) {
            swaps.push({ mesh: child, diamond: child.material });
            child.material = child.userData.originalMaterial;
        }
    });
    return () => {
        for (const { mesh, diamond } of swaps) {
            mesh.material = diamond;
        }
    };
}

export async function exportGLB(modelRoot, fileName, visibleOnly = false) {
    return new Promise((resolve, reject) => {
        let exportRoot;

        if (visibleOnly) {
            exportRoot = new THREE.Group();
            exportRoot.name = modelRoot.name;

            modelRoot.updateMatrixWorld(true);
            modelRoot.traverse((child) => {
                if (child === modelRoot) return;

                if (child.visible && (child.isMesh || child.isLine || child.isPoints)) {
                    const clone = child.clone();

                    if (isDiamondMaterial(child.material) && child.userData.originalMaterial) {
                        clone.material = child.userData.originalMaterial;
                    }

                    const { originalMaterial, ...serializableUserData } = child.userData || {};
                    clone.userData = JSON.parse(JSON.stringify(serializableUserData));

                    // Bake the full world transform (including the Z-up to Y-up
                    // root rotation) since clones are re-parented to a flat group
                    child.matrixWorld.decompose(clone.position, clone.quaternion, clone.scale);

                    exportRoot.add(clone);
                }
            });
        } else {
            exportRoot = modelRoot;
        }

        const exporter = new GLTFExporter();

        const options = {
            binary: true,
            onlyVisible: false,
            includeCustomExtensions: true
        };

        const restore = swapDiamondMaterials(exportRoot);

        exporter.parse(
            exportRoot,
            (gltf) => {
                restore();
                const blob = new Blob([gltf], { type: 'application/octet-stream' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${fileName}.glb`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                resolve();
            },
            (error) => {
                restore();
                reject(new Error(`GLB export failed: ${error.message || error}`));
            },
            options
        );
    });
}
