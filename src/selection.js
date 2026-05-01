export function initSelection(viewer, modelRoot, onSelect) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let selectedObject = null;
    const highlightMaterial = new THREE.MeshStandardMaterial({
        emissive: 0xff9900,
        emissiveIntensity: 0.5
    });
    const originalMaterials = new Map();

    function getSelectableObjects() {
        const selectables = [];
        modelRoot.traverse((child) => {
            if (child === modelRoot) return;
            if (child.isMesh || child.isLine || child.isPoints) {
                selectables.push(child);
            }
        });
        return selectables;
    }

    function clearSelection() {
        if (selectedObject) {
            // Restore original material
            if (originalMaterials.has(selectedObject)) {
                selectedObject.material = originalMaterials.get(selectedObject);
            }
            selectedObject = null;
        }
    }

    function selectObject(object) {
        clearSelection();

        selectedObject = object;

        // Store original material if not already stored
        if (!originalMaterials.has(object)) {
            originalMaterials.set(object, object.material);
        }

        // Apply highlight
        if (selectedObject.isMesh) {
            selectedObject.material = highlightMaterial;
        }

        onSelect(selectedObject);
        viewer.render();
    }

    function onMouseClick(event) {
        // Ignore clicks on UI elements
        if (event.target.tagName !== 'CANVAS') return;

        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, viewer.camera);

        const selectables = getSelectableObjects();
        const intersects = raycaster.intersectObjects(selectables);

        if (intersects.length > 0) {
            const firstHit = intersects[0].object;
            selectObject(firstHit);
        } else {
            clearSelection();
            onSelect(null);
            viewer.render();
        }
    }

    window.addEventListener('click', onMouseClick, false);

    return {
        selectObject,
        clearSelection,
        getSelectedObject: () => selectedObject
    };
}
