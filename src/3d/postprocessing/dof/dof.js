import THREE from '../../../utils/three.js';
let settings = require('../../../core/settings');
let Effect = require('../Effect');
let effectComposer = require('../effectComposer');
let fboHelper = require('../../fboHelper');

let glslify = require('glslify');


let undef;

let exports = module.exports = new Effect();
let _super = Effect.prototype;

exports.init = init;
exports.render = render;

let _depth1Material;
let _depth1;
let _depth1Buffer;

function init() {

    _depth1 = fboHelper.createRenderTarget(1, 1, THREE.RGBAFormat, THREE.FloatType);

    _super.init.call(this, {
        uniforms: {
            u_distance: { type: 't', value: undef },
            u_dofDistance: { type: 'f', value: 0 },
            u_delta: { type: 'v2', value: new THREE.Vector2() },
            u_mouse: { type: 'v2', value: settings.mouse },
            u_amount: { type: 'f', value: 1 }
        },
        fragmentShader: glslify('./dof.frag')
    });

    _depth1Buffer = new Float32Array(4);
    _depth1Material = new THREE.RawShaderMaterial({
        uniforms: {
            u_distance: { type: 't', value: undef },
            u_mouse: { type: 'v2', value: settings.mouse }
        },
        transparent: true,
        blending: THREE.NoBlending,
        vertexShader: this.vertexShader,
        fragmentShader: fboHelper.rawShaderPrefix + glslify('./depth1.frag')
    });

}

function render(dt, renderTarget, toScreen) {

    let cameraDistance = effectComposer.camera.position.length();
    let distance = cameraDistance;

    if(settings.dofMouse) {
        _depth1Material.uniforms.u_distance.value = settings.distanceMap;
        fboHelper.render(_depth1Material, _depth1);
        effectComposer.renderer.readRenderTargetPixels ( _depth1, 0, 0, 1, 1, _depth1Buffer );
        distance = _depth1Buffer[0] || distance;
    } else {
        distance = settings.dofFocusZ;
    }

    let uniforms = this.uniforms;
    let prevDistance = uniforms.u_dofDistance.value;
    uniforms.u_dofDistance.value += (distance - prevDistance) * 0.1;

    uniforms.u_amount.value = settings.dof;
    uniforms.u_distance.value = settings.distanceMap;
    uniforms.u_delta.value.set(1, 0);
    renderTarget = _super.render.call(this, dt, renderTarget);
    uniforms.u_delta.value.set(0, 1);
    _super.render.call(this, dt, renderTarget, toScreen);

}
