import THREE from '../utils/three.js';
let settings = require('../core/settings');



let undef;

exports.mesh = undef;
exports.init = init;

function init() {
    let geometry = new THREE.PlaneGeometry( 4000, 4000, 10, 10 );
    let planeMaterial = new THREE.MeshStandardMaterial( {
        roughness: 0.7,
        color: 0x000000,
		emissive: 0x000000
    });
    let floor = exports.mesh = new THREE.Mesh( geometry, planeMaterial );

    floor.rotation.x = -1.57;
    floor.receiveShadow = true;

}
