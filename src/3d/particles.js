import THREE from '../utils/three.js';
let settings = require('../core/settings');
let shaderParse = require('../helpers/shaderParse');
let glslify = require('glslify');
let simulator = require('./simulator');

let undef;

let container = exports.container = undef;
exports.init = init;
exports.update = update;

let _renderer;
let _meshes = [];
let _color1 = [];
let _color2 = [];
let _tmpColor;

let TEXTURE_WIDTH = settings.simulatorTextureWidth;
let TEXTURE_HEIGHT = settings.simulatorTextureHeight;
let AMOUNT = settings.particleAmount;

function init(renderer) {
    container = exports.container = new THREE.Object3D();
    _tmpColor = new THREE.Color();

    // Initialize color arrays for orbs
    _color1 = [new THREE.Color(settings.color1[0]), new THREE.Color(settings.color2[0])];
    _color2 = [new THREE.Color(settings.color1[1]), new THREE.Color(settings.color1[1])];

    // Create meshes dynamically based on the number of shaders in simulator
    simulator.positionShaders.forEach((_, orbIndex) => {
        const mesh = _createTriangleMesh(orbIndex, _color1[orbIndex], _color2[orbIndex]);
        mesh.visible = true;
        _meshes.push(mesh);
        container.add(mesh); // Only add mesh here
    });

    _renderer = renderer;
}

function _createTriangleMesh(orbIndex, color1, color2) {
    let position = new Float32Array(AMOUNT * 3 * 3);
    let positionFlip = new Float32Array(AMOUNT * 3 * 3);
    let fboUV = new Float32Array(AMOUNT * 2 * 3);

    let PI = Math.PI;
    let angle = PI * 2 / 3;
    let angles = [
        Math.sin(angle * 2 + PI),
        Math.cos(angle * 2 + PI),
        Math.sin(angle + PI),
        Math.cos(angle + PI),
        Math.sin(angle * 3 + PI),
        Math.cos(angle * 3 + PI),
        Math.sin(angle * 2),
        Math.cos(angle * 2),
        Math.sin(angle),
        Math.cos(angle),
        Math.sin(angle * 3),
        Math.cos(angle * 3)
    ];
    let i6, i9;
    for (let i = 0; i < AMOUNT; i++) {
        i6 = i * 6;
        i9 = i * 9;
        if (i % 2) {
            position[i9 + 0] = angles[0];
            position[i9 + 1] = angles[1];
            position[i9 + 3] = angles[2];
            position[i9 + 4] = angles[3];
            position[i9 + 6] = angles[4];
            position[i9 + 7] = angles[5];

            positionFlip[i9 + 0] = angles[6];
            positionFlip[i9 + 1] = angles[7];
            positionFlip[i9 + 3] = angles[8];
            positionFlip[i9 + 4] = angles[9];
            positionFlip[i9 + 6] = angles[10];
            positionFlip[i9 + 7] = angles[11];
        } else {
            positionFlip[i9 + 0] = angles[0];
            positionFlip[i9 + 1] = angles[1];
            positionFlip[i9 + 3] = angles[2];
            positionFlip[i9 + 4] = angles[3];
            positionFlip[i9 + 6] = angles[4];
            positionFlip[i9 + 7] = angles[5];

            position[i9 + 0] = angles[6];
            position[i9 + 1] = angles[7];
            position[i9 + 3] = angles[8];
            position[i9 + 4] = angles[9];
            position[i9 + 6] = angles[10];
            position[i9 + 7] = angles[11];
        }

        fboUV[i6 + 0] = fboUV[i6 + 2] = fboUV[i6 + 4] = (i % TEXTURE_WIDTH) / TEXTURE_WIDTH;
        fboUV[i6 + 1] = fboUV[i6 + 3] = fboUV[i6 + 5] = ~~(i / TEXTURE_WIDTH) / TEXTURE_HEIGHT;
    }

    let geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
    geometry.setAttribute('positionFlip', new THREE.BufferAttribute(positionFlip, 3));
    geometry.setAttribute('fboUV', new THREE.BufferAttribute(fboUV, 2));

    let material = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.merge([
            THREE.UniformsLib.fog,
            THREE.UniformsLib.lights,
            {
                texturePosition: { type: 't', value: undef },
                flipRatio: { type: 'f', value: 0 },
                color1: { type: 'c', value: color1 },
                color2: { type: 'c', value: color2 },
                orbIndex: { type: 'i', value: orbIndex },
                cameraMatrix: { type: 'm4', value: undef },
                shadowIntensity: { type: 'f', value: 0.5 },
            }
        ]),
        vertexShader: shaderParse(glslify('../glsl/triangles.vert')),
        fragmentShader: shaderParse(glslify('../glsl/particles.frag')),
        blending: THREE.NoBlending,
        side: THREE.DoubleSide,
        lights: true,
        fog: true
    });

    material.uniforms.color1.value = color1;
    material.uniforms.color2.value = color2;
    material.uniforms.orbIndex.value = orbIndex;
    material.uniforms.cameraMatrix.value = settings.camera.matrixWorld;
    material.uniforms.shadowIntensity.value = 0.8;

    let mesh = new THREE.Mesh(geometry, material);
    // mesh.customDistanceMaterial = new THREE.ShaderMaterial({
    //     uniforms: THREE.UniformsUtils.merge([ 
    //         THREE.UniformsLib.common,
    //         {
    //             referencePosition: { value: new THREE.Vector3() },
    //             nearDistance: { value: 1 },
    //             farDistance: { value: 1000 }
    //         },
    //         {
    //             texturePosition: { type: 't', value: undef },
    //             flipRatio: { type: 'f', value: 0 }
    //         }
    //     ]),
    //     vertexShader: shaderParse(glslify('../glsl/trianglesDistance.vert')),
    //     fragmentShader: shaderParse(glslify('../glsl/particlesDistance.frag')),
    //     depthTest: true,
    //     depthWrite: true,
    //     side: THREE.BackSide,
    //     blending: THREE.NoBlending
    // });
    // mesh.customDistanceMaterial.isMeshDistanceMaterial = true;

    // mesh.motionMaterial = new THREE.ShaderMaterial({
    //     uniforms: {
    //         u_prevModelViewMatrix: { type: 'm4', value: new THREE.Matrix4() },
    //         u_motionMultiplier: { type: 'f', value: 1 },
    //         texturePosition: { type: 't', value: undef },
    //         texturePrevPosition: { type: 't', value: undef },
    //         flipRatio: { type: 'f', value: 0 },
    //         cameraMatrix: { type: 'm4', value: undef }
    //     },
    //     vertexShader: shaderParse(glslify('../glsl/trianglesMotion.vert')),
    //     fragmentShader: shaderParse(glslify('./postprocessing/motionBlur/motionBlurMotion.frag')),
    //     depthTest: true,
    //     depthWrite: true,
    //     side: THREE.DoubleSide,
    //     blending: THREE.NoBlending
    // });
    // mesh.motionMaterial.motionMultiplier = 1;
    // mesh.motionMaterial.uniforms.cameraMatrix.value = settings.camera.matrixWorld;
    
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.renderOrder = 1;

    return mesh;
}

function update(dt) {
    _meshes.forEach((mesh, index) => {
        // Check if the orb display is enabled for this index
        if (!settings.orbDisplay[index]) {
            mesh.visible = false; // Ensure the mesh is hidden
            return; // Skip processing this mesh
        }

        // If orbDisplay is true, ensure the mesh is visible
        mesh.visible = true;

        // Get texture for each orb if available
        const renderTarget = simulator.positionRenderTargets[index];
        const texture = renderTarget ? renderTarget.texture : null;

        if (!texture) {
            console.warn(`Missing texture for orb at index ${index}`);
            return; // Skip this orb if texture is missing
        }

        // Update colors dynamically
        const color1Setting = settings.color1[index] || _color1[index].getStyle();
        const color2Setting = settings.color2[index] || _color2[index].getStyle();
        _tmpColor.setStyle(color1Setting);
        _color1[index].lerp(_tmpColor, 0.05);
        _tmpColor.setStyle(color2Setting);
        _color2[index].lerp(_tmpColor, 0.05);

        // Apply updated colors to each mesh's material
        mesh.material.uniforms.color1.value = _color1[index];
        mesh.material.uniforms.color2.value = _color2[index];

        // Set the correct texture positions for each orb
        mesh.material.uniforms.texturePosition.value = texture;
        // mesh.customDistanceMaterial.uniforms.texturePosition.value = texture;
        // mesh.motionMaterial.uniforms.texturePosition.value = texture;

        // if (mesh.material.uniforms.flipRatio) {
        //     mesh.material.uniforms.flipRatio.value ^= 1;
        //     mesh.customDistanceMaterial.uniforms.flipRatio.value ^= 1;
        //     mesh.motionMaterial.uniforms.flipRatio.value ^= 1;
        // }
    });
}
