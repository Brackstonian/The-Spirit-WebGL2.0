import THREE from '../utils/three.js';

let glslify = require('glslify');
let mixIn = require('mout/object/mixIn');
let fillIn = require('mout/object/fillIn');
let shaderParse = require('../../../helpers/shaderParse');

function MeshMotionMaterial ( parameters ) {

    parameters = parameters || {};

    let uniforms = parameters.uniforms || {};
    let vertexShader = shaderParse(glslify('./motionBlurMotion.vert'));
    let fragmentShader = shaderParse(glslify('./motionBlurMotion.frag'));
    this.motionMultiplier = parameters.motionMultiplier || 1;

    return new THREE.ShaderMaterial(mixIn({

        uniforms: fillIn(uniforms, {
            u_prevModelViewMatrix: {type: 'm4', value: new THREE.Matrix4()},
            u_motionMultiplier: {type: 'f', value: 1}
        }),
        vertexShader : vertexShader,
        fragmentShader : fragmentShader

    }, parameters));

}

let _p = MeshMotionMaterial.prototype = Object.create( THREE.ShaderMaterial.prototype );
_p.constructor = MeshMotionMaterial;
module.exports = MeshMotionMaterial;
