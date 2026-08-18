import * as THREE from 'three';

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

// Adapt the camera lens to the model's size: small pieces (jewelry) get a
// narrow portrait-style lens with little perspective distortion, large models
// get a wider one. Near/far planes and fog scale with the bounds so depth
// precision stays usable at any scale.
export function adaptCameraToModel(camera, maxDim, scene = null) {
    if (!maxDim || !isFinite(maxDim)) return;

    // maxDim <= 100 units -> 30deg, maxDim >= 10000 -> 60deg, log-interpolated
    const t = THREE.MathUtils.clamp((Math.log10(maxDim) - 2) / 2, 0, 1);
    camera.fov = THREE.MathUtils.lerp(30, 60, t);

    camera.near = THREE.MathUtils.clamp(maxDim / 100, 0.001, 1);
    camera.far = Math.max(maxDim * 50, 2000);
    camera.updateProjectionMatrix();

    if (scene?.fog) {
        scene.fog.far = camera.far;
    }
}

export function fitCamera(camera, controls, modelRoot, scene = null) {
    if (!modelRoot) return;

    const box = new THREE.Box3().expandByObject(modelRoot);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    adaptCameraToModel(camera, maxDim, scene);

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
