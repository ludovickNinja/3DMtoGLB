export function initSceneTools(scene) {
    // Add grid
    const gridHelper = new THREE.GridHelper(500, 50, 0x444444, 0x222222);
    gridHelper.name = 'grid';
    gridHelper.visible = false;
    scene.add(gridHelper);

    // Add axes
    const axesHelper = new THREE.AxesHelper(50);
    axesHelper.name = 'axes';
    axesHelper.visible = false;
    scene.add(axesHelper);
}

export function fitCamera(camera, controls, modelRoot) {
    if (!modelRoot) return;

    const box = new THREE.Box3().expandByObject(modelRoot);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = maxDim / 2 / Math.tan(fov / 2);

    const center = box.getCenter(new THREE.Vector3());

    // Add some padding
    cameraZ *= 1.5;

    camera.position.set(
        center.x + cameraZ * 0.5,
        center.y + cameraZ * 0.5,
        center.z + cameraZ
    );

    camera.lookAt(center);
    controls.target.copy(center);
    controls.update();
}

export function resetCamera(camera, controls) {
    camera.position.set(100, 100, 100);
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
    controls.update();
}
