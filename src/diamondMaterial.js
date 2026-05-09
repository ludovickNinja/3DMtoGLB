import * as THREE from 'three';
import { MeshBVH, MeshBVHUniformStruct, BVHShaderGLSL, SAH } from 'three-mesh-bvh';

let _envMap = null;

function getDiamondEnvMap() {
    if (_envMap) return _envMap;

    const w = 1024;
    const h = 512;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0.0, '#0b1a2b');
    sky.addColorStop(0.45, '#9bb6d9');
    sky.addColorStop(0.5, '#fdfdfd');
    sky.addColorStop(0.55, '#7a6e60');
    sky.addColorStop(1.0, '#1a1612');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = 'lighter';
    const lights = [
        { x: 0.20, y: 0.18, r: 90,  c: 'rgba(255,255,255,1.0)' },
        { x: 0.55, y: 0.30, r: 60,  c: 'rgba(255,240,210,0.9)' },
        { x: 0.78, y: 0.22, r: 110, c: 'rgba(255,255,255,0.85)' },
        { x: 0.10, y: 0.42, r: 40,  c: 'rgba(255,255,255,0.7)' },
        { x: 0.92, y: 0.48, r: 50,  c: 'rgba(220,235,255,0.7)' },
        { x: 0.40, y: 0.10, r: 70,  c: 'rgba(255,255,255,0.95)' }
    ];
    for (const l of lights) {
        const cx = l.x * w;
        const cy = l.y * h;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, l.r);
        grad.addColorStop(0, l.c);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(cx - l.r, cy - l.r, l.r * 2, l.r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';

    const tex = new THREE.CanvasTexture(canvas);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    tex.needsUpdate = true;
    _envMap = tex;
    return tex;
}

const vertexShader = /* glsl */ `
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    uniform mat4 viewMatrixInv;
    void main() {
        vWorldPosition = ( modelMatrix * vec4( position, 1.0 ) ).xyz;
        vNormal = ( viewMatrixInv * vec4( normalMatrix * normal, 0.0 ) ).xyz;
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4( position, 1.0 );
    }
`;

const fragmentShader = /* glsl */ `
    #define RAY_OFFSET 0.001

    #include <common>
    precision highp isampler2D;
    precision highp usampler2D;

    ${BVHShaderGLSL.common_functions}
    ${BVHShaderGLSL.bvh_struct_definitions}
    ${BVHShaderGLSL.bvh_ray_functions}

    varying vec3 vWorldPosition;
    varying vec3 vNormal;

    uniform sampler2D envMap;
    uniform float bounces;
    uniform BVH bvh;
    uniform float ior;
    uniform vec3 color;
    uniform bool fastChroma;
    uniform mat4 projectionMatrixInv;
    uniform mat4 viewMatrixInv;
    uniform mat4 modelMatrix;
    uniform vec2 resolution;
    uniform float aberrationStrength;

    vec3 totalInternalReflection( vec3 incomingOrigin, vec3 incomingDirection, vec3 normal, float ior, mat4 modelMatrixInverse ) {
        vec3 rayOrigin = incomingOrigin;
        vec3 rayDirection = incomingDirection;

        rayDirection = refract( rayDirection, normal, 1.0 / ior );
        rayOrigin = vWorldPosition + rayDirection * RAY_OFFSET;

        rayOrigin = ( modelMatrixInverse * vec4( rayOrigin, 1.0 ) ).xyz;
        rayDirection = normalize( ( modelMatrixInverse * vec4( rayDirection, 0.0 ) ).xyz );

        for ( float i = 0.0; i < bounces; i ++ ) {
            uvec4 faceIndices = uvec4( 0u );
            vec3 faceNormal = vec3( 0.0, 0.0, 1.0 );
            vec3 barycoord = vec3( 0.0 );
            float side = 1.0;
            float dist = 0.0;

            bvhIntersectFirstHit( bvh, rayOrigin, rayDirection, faceIndices, faceNormal, barycoord, side, dist );

            vec3 hitPos = rayOrigin + rayDirection * dist;

            vec3 refractedDirection = refract( rayDirection, faceNormal, ior );
            bool tir = length( refractedDirection ) == 0.0;
            if ( ! tir ) {
                rayDirection = refractedDirection;
                break;
            }

            rayDirection = reflect( rayDirection, faceNormal );
            rayOrigin = hitPos + rayDirection * RAY_OFFSET;
        }

        return normalize( ( modelMatrix * vec4( rayDirection, 0.0 ) ).xyz );
    }

    vec4 envSample( sampler2D envMap, vec3 rayDirection ) {
        vec2 uvv = equirectUv( rayDirection );
        return texture( envMap, uvv );
    }

    void main() {
        mat4 modelMatrixInverse = inverse( modelMatrix );

        vec3 normal = normalize( vNormal );
        vec3 rayOrigin = cameraPosition;
        vec3 rayDirection = normalize( vWorldPosition - cameraPosition );

        if ( aberrationStrength != 0.0 ) {
            vec3 rayDirectionG = totalInternalReflection( rayOrigin, rayDirection, normal, max( ior, 1.0 ), modelMatrixInverse );
            vec3 rayDirectionR, rayDirectionB;

            if ( fastChroma ) {
                rayDirectionR = normalize( rayDirectionG + 1.0 * vec3( aberrationStrength / 2.0 ) );
                rayDirectionB = normalize( rayDirectionG - 1.0 * vec3( aberrationStrength / 2.0 ) );
            } else {
                float iorR = max( ior * ( 1.0 - aberrationStrength ), 1.0 );
                float iorB = max( ior * ( 1.0 + aberrationStrength ), 1.0 );
                rayDirectionR = totalInternalReflection( rayOrigin, rayDirection, normal, iorR, modelMatrixInverse );
                rayDirectionB = totalInternalReflection( rayOrigin, rayDirection, normal, iorB, modelMatrixInverse );
            }

            float r = envSample( envMap, rayDirectionR ).r;
            float g = envSample( envMap, rayDirectionG ).g;
            float b = envSample( envMap, rayDirectionB ).b;
            gl_FragColor.rgb = vec3( r, g, b ) * color;
            gl_FragColor.a = 1.0;
        } else {
            rayDirection = totalInternalReflection( rayOrigin, rayDirection, normal, max( ior, 1.0 ), modelMatrixInverse );
            gl_FragColor.rgb = envSample( envMap, rayDirection ).rgb * color;
            gl_FragColor.a = 1.0;
        }

        #include <tonemapping_fragment>
        #include <colorspace_fragment>
    }
`;

export function isDiamondMaterial(material) {
    return !!(material && material.isDiamondMaterial);
}

export function createDiamondMaterial(geometry, options = {}) {
    const {
        color = 0xffffff,
        bounces = 3,
        ior = 2.4,
        aberrationStrength = 0.02,
        fastChroma = false
    } = options;

    if (!geometry.boundsTree) {
        geometry.boundsTree = new MeshBVH(geometry, { strategy: SAH, maxLeafSize: 1 });
    }

    const bvhUniform = new MeshBVHUniformStruct();
    bvhUniform.updateFrom(geometry.boundsTree);

    const material = new THREE.ShaderMaterial({
        uniforms: {
            envMap: { value: getDiamondEnvMap() },
            bvh: { value: bvhUniform },
            projectionMatrixInv: { value: new THREE.Matrix4() },
            viewMatrixInv: { value: new THREE.Matrix4() },
            resolution: { value: new THREE.Vector2(1, 1) },
            bounces: { value: bounces },
            ior: { value: ior },
            color: { value: new THREE.Color(color) },
            fastChroma: { value: fastChroma },
            aberrationStrength: { value: aberrationStrength }
        },
        vertexShader,
        fragmentShader
    });

    material.isDiamondMaterial = true;

    Object.defineProperty(material, 'color', {
        configurable: true,
        get() { return material.uniforms.color.value; },
        set(v) {
            if (v && v.isColor) material.uniforms.color.value.copy(v);
            else material.uniforms.color.value.set(v);
        }
    });

    Object.defineProperty(material, 'dispersion', {
        configurable: true,
        get() { return material.uniforms.aberrationStrength.value; },
        set(v) { material.uniforms.aberrationStrength.value = v; }
    });

    Object.defineProperty(material, 'ior', {
        configurable: true,
        get() { return material.uniforms.ior.value; },
        set(v) { material.uniforms.ior.value = v; }
    });

    return material;
}

export function applyDiamondMaterial(mesh, options = {}) {
    if (!mesh || !mesh.geometry) return null;

    if (!mesh.userData.originalMaterial) {
        mesh.userData.originalMaterial = mesh.material;
    }

    const material = createDiamondMaterial(mesh.geometry, options);
    mesh.material = material;

    mesh.onBeforeRender = (renderer, scene, camera) => {
        material.uniforms.projectionMatrixInv.value.copy(camera.projectionMatrixInverse);
        material.uniforms.viewMatrixInv.value.copy(camera.matrixWorld);
        renderer.getSize(material.uniforms.resolution.value);
        material.uniforms.resolution.value.multiplyScalar(renderer.getPixelRatio());
    };

    return material;
}

export function restoreOriginalMaterial(mesh) {
    if (!mesh) return false;
    if (mesh.userData.originalMaterial) {
        mesh.material = mesh.userData.originalMaterial;
        mesh.onBeforeRender = () => {};
        return true;
    }
    return false;
}
