var settings = require('../core/settings');
var THREE = window.THREE


var undef;

exports.mesh = undef;
exports.init = init;

function init() {
    var geometry = new THREE.PlaneGeometry( 4000, 4000, 10, 10 );
    var planeMaterial = new THREE.MeshStandardMaterial( {
        roughness: 0.7,
        color: 0x000000,
		emissive: 0x000000
    });
    var floor = exports.mesh = new THREE.Mesh( geometry, planeMaterial );

    floor.rotation.x = -1.57;
    floor.receiveShadow = true;

}
