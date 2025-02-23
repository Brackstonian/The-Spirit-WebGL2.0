import THREE from '../../../utils/three';


let Effect = require('../Effect');
let effectComposer = require('../effectComposer');
let fboHelper = require('../../fboHelper');
let settings = require('../../../core/settings');

let glslify = require('glslify');

let undef;

let exports = module.exports = new Effect();
let _super = Effect.prototype;

exports.init = init;
exports.render = render;
exports.updateBloomAmount = updateBloomAmount;

exports.blurRadius = 5;
exports.amount = settings.bloomAmount;

let _blurMaterial;

let BLUR_BIT_SHIFT = 1;

function init() {

    _super.init.call(this, {
        uniforms: {
            u_blurTexture: { type: 't', value: undef },
            u_amount: { type: 'f', value: exports.amount }
        },
        fragmentShader: glslify('./bloom.frag')
    });

    _blurMaterial = new THREE.RawShaderMaterial({
        uniforms: {
            u_texture: { type: 't', value: undef },
            u_delta: { type: 'v2', value: new THREE.Vector2() }
        },
        vertexShader: fboHelper.vertexShader,
        fragmentShader: fboHelper.rawShaderPrefix + glslify('./bloomBlur.frag')
    });

}

function render(dt, renderTarget, toScreen) {

    let tmpRenderTarget1 = effectComposer.getRenderTarget(BLUR_BIT_SHIFT);
    let tmpRenderTarget2 = effectComposer.getRenderTarget(BLUR_BIT_SHIFT);
    effectComposer.releaseRenderTarget(tmpRenderTarget1, tmpRenderTarget2);

    let blurRadius = exports.blurRadius;
    _blurMaterial.uniforms.u_texture.value = renderTarget.texture;
    _blurMaterial.uniforms.u_delta.value.set(blurRadius / effectComposer.resolution.x, 0);

    fboHelper.render(_blurMaterial, tmpRenderTarget1);

    blurRadius = exports.blurRadius;
    _blurMaterial.uniforms.u_texture.value = tmpRenderTarget1.texture;
    _blurMaterial.uniforms.u_delta.value.set(0, blurRadius / effectComposer.resolution.y);
    fboHelper.render(_blurMaterial, tmpRenderTarget2);

    this.uniforms.u_blurTexture.value = tmpRenderTarget2.texture;
    this.uniforms.u_amount.value = exports.amount;
    _super.render.call(this, dt, renderTarget, toScreen);
}

function updateBloomAmount(newAmount) {
    exports.amount = newAmount;
    // Also update the shader uniform if it has already been initialized
    if (exports.uniforms && exports.uniforms.u_amount) {
        exports.uniforms.u_amount.value = newAmount;
    }
}
