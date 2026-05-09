import * as THREE from 'three';

export function initSelection(viewer, modelRoot, onSelect) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let selectedObject = null;
    const originalEmissive = new Map();

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
        if (selectedObject && originalEmissive.has(selectedObject)) {
            const { hex, intensity } = originalEmissive.get(selectedObject);
            const mat = selectedObject.material;
            if (mat?.emissive) {
                mat.emissive.setHex(hex);
                if (mat.emissiveIntensity !== undefined) mat.emissiveIntensity = intensity;
            }
            originalEmissive.delete(selectedObject);
        }
        selectedObject = null;
    }

    function selectObject(object) {
        clearSelection();

        selectedObject = object;

        const mat = object.material;
        if (mat?.emissive) {
            originalEmissive.set(object, {
                hex: mat.emissive.getHex(),
                intensity: mat.emissiveIntensity ?? 1
            });
            mat.emissive.setHex(0xff9900);
            if (mat.emissiveIntensity !== undefined) mat.emissiveIntensity = 0.5;
        }

        onSelect(selectedObject);
        viewer.render();
    }

    function onMouseClick(event) {
        if (event.target.tagName !== 'CANVAS') return;

        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, viewer.camera);

        const selectables = getSelectableObjects();
        const intersects = raycaster.intersectObjects(selectables);

        if (intersects.length > 0) {
            selectObject(intersects[0].object);
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
