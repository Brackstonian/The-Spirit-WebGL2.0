var settings = require('../core/settings');
var THREE = window.THREE

var undef;

var mesh = exports.mesh = undef;
var pointLight = exports.pointLight = undef;
exports.init = init;
exports.update = update;

var _currentIntensity = 1;

function init() {
    mesh = exports.mesh = new THREE.Object3D();
    mesh.position.set(0, 500, 0);

    var ambient = new THREE.AmbientLight(0x333333);
    mesh.add(ambient);

    pointLight = exports.pointLight = new THREE.PointLight(0xffffff, _currentIntensity, 4096);
    // pointLight.position.set( 0,0,0 );
    pointLight.castShadow = true;
    pointLight.shadow.mapSize.width = 4096;
    pointLight.shadow.mapSize.height = 2048;
    pointLight.shadow.camera.near = 10;
    pointLight.shadow.camera.far = 700;
    pointLight.shadow.bias = -0.001;
    mesh.add(pointLight);

    var directionalLight = new THREE.DirectionalLight(0xba8b8b, 0.5);
    directionalLight.position.set(1, 1, 1);
    mesh.add(directionalLight);

    var directionalLight2 = new THREE.DirectionalLight(0x8bbab4, 0.3);
    directionalLight2.position.set(1, 1, -1);
    mesh.add(directionalLight2);
}

function update(dt) {
    var normalizedlightIntensity = Math.min(Math.max(settings.lightIntensity, 0), 1);

    if (normalizedlightIntensity <= 0) {
        pointLight.castShadow = false;
        _currentIntensity = 1;
    } else {
        pointLight.castShadow = true;

        var targetIntensity = normalizedlightIntensity * 1; // Adjust multiplier as needed
        _currentIntensity += (targetIntensity - _currentIntensity) * 0.1;
    }

    pointLight.intensity = _currentIntensity;
}
