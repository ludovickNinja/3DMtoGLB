import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

export async function exportGLB(modelRoot, fileName, visibleOnly = false) {
    return new Promise((resolve, reject) => {
        let exportRoot;

        if (visibleOnly) {
            exportRoot = new THREE.Group();
            exportRoot.name = modelRoot.name;

            modelRoot.traverse((child) => {
                if (child === modelRoot) return;

                if (child.visible && (child.isMesh || child.isLine || child.isPoints)) {
                    const clone = child.clone();
                    clone.userData = JSON.parse(JSON.stringify(child.userData || {}));
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

        exporter.parse(
            exportRoot,
            (gltf) => {
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
                reject(new Error(`GLB export failed: ${error.message || error}`));
            },
            options
        );
    });
}
