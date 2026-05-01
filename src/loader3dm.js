export async function load3DMFile(arrayBuffer) {
    return new Promise((resolve, reject) => {
        const loader = new Rhino3dmLoader();

        // Initialize the worker for the loader
        loader.setLibraryPath('https://cdn.jsdelivr.net/npm/rhino3dm@7/');

        // Parse the arraybuffer
        loader.parse(arrayBuffer, (object) => {
            if (!object) {
                reject(new Error('Failed to parse 3dm file'));
                return;
            }

            // Wrap in a group for easier manipulation
            const root = new THREE.Group();
            root.name = 'ModelRoot';

            // Traverse and normalize materials and geometry
            object.traverse((child) => {
                // Ensure all geometries have proper normals
                if (child.geometry) {
                    if (!child.geometry.attributes.normal) {
                        child.geometry.computeVertexNormals();
                    }
                }

                // Ensure materials are properly set
                if (!child.material) {
                    if (child.isMesh) {
                        child.material = new THREE.MeshStandardMaterial({
                            color: 0x888888,
                            metalness: 0.2,
                            roughness: 0.8
                        });
                    }
                }
            });

            root.add(object);
            resolve(root);
        }, (error) => {
            reject(new Error(`3dm parsing error: ${error.message || error}`));
        });
    });
}
