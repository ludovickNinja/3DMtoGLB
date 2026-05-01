export async function exportGLB(modelRoot, fileName, visibleOnly = false) {
    return new Promise((resolve, reject) => {
        // Create a copy of the scene to export
        let exportRoot;

        if (visibleOnly) {
            // Clone only visible objects
            exportRoot = new THREE.Group();
            exportRoot.name = modelRoot.name;

            modelRoot.traverse((child) => {
                if (child === modelRoot) return;

                if (child.visible && (child.isMesh || child.isLine || child.isPoints)) {
                    const clone = child.clone();
                    exportRoot.add(clone);
                }
            });
        } else {
            // Use the whole tree
            exportRoot = modelRoot;
        }

        const exporter = new GLTFExporter();

        const options = {
            binary: true,
            onlyVisible: false // We handle visibility above
        };

        exporter.parse(
            exportRoot,
            (gltf) => {
                // gltf is an ArrayBuffer for binary export
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
