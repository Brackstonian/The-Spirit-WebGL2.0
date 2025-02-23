import THREE from '../utils/three.js';
let settings = require('../core/settings');


let undef;

let mesh = exports.mesh = undef;
let pointLight = exports.pointLight = undef;
let ambientLight = exports.ambientLight = undef;
exports.init = init;
exports.update = update;

let _currentIntensity = 1;

function init() {
    mesh = exports.mesh = new THREE.Object3D();
    mesh.position.set(0, 500, 0);

    // Add an ambient light with moderate intensity to soften shadows
    ambientLight = exports.ambientLight = new THREE.AmbientLight(0xcccccc, 0.8); // Adjust intensity as needed
    mesh.add(ambientLight);

    // Add a point light for some directional shadows
    pointLight = exports.pointLight = new THREE.PointLight(0xffffff, _currentIntensity, 2048);
    pointLight.position.set(0, 500, 0); // Adjust position if needed
    pointLight.castShadow = true; // Enable shadows
    pointLight.shadow.mapSize.width = 4096;
    pointLight.shadow.mapSize.height = 4096;
    pointLight.shadow.camera.near = 1;
    pointLight.shadow.camera.far = 500;
    pointLight.shadow.bias = -0.0001;
    mesh.add(pointLight);

    // Add two directional lights with lower intensity for balanced lighting
    let directionalLight = new THREE.DirectionalLight(0xba8b8b, 0.2); // Low intensity
    directionalLight.position.set(1, 1, 1);
    directionalLight.castShadow = true; // Enable soft shadows
    mesh.add(directionalLight);

    let directionalLight2 = new THREE.DirectionalLight(0x8bbab4, 0.2); // Low intensity
    directionalLight2.position.set(-1, 1, 1);
    directionalLight2.castShadow = true; // Enable soft shadows
    mesh.add(directionalLight2);
}

function update(dt) {
    let normalizedLightIntensity = Math.min(Math.max(settings.lightIntensity, 0), 1);

    if (normalizedLightIntensity <= 0) {
        pointLight.castShadow = false;
        _currentIntensity = 0.1; // Set to a very low intensity instead of disabling entirely
    } else {
        pointLight.castShadow = true;

        let targetIntensity = normalizedLightIntensity * 0.5; // Adjust multiplier for softer lighting
        _currentIntensity += (targetIntensity - _currentIntensity) * 0.1;
    }

    pointLight.intensity = _currentIntensity;
}
