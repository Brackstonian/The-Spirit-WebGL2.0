var Effect = require('../Effect');
var effectComposer = require('../effectComposer');
var fboHelper = require('../../fboHelper');
var settings = require('../../../core/settings');

var glslify = require('glslify');
var THREE = window.THREE

var undef;

var exports = module.exports = new Effect();
var _super = Effect.prototype;

exports.init = init;
exports.render = render;
exports.updateBloomAmount = updateBloomAmount;

exports.blurRadius = 3;
exports.amount = settings.bloomAmount;

var _blurMaterial;

var BLUR_BIT_SHIFT = 1;

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
        fragmentShader: fboHelper.rawShaderPrefix + glslify('./bloomBlur.frag'),
        transparent: true, // Enable transparency
        blending: THREE.NormalBlending // Ensure proper alpha blending
    });

}

function render(dt, renderTarget, toScreen) {
    // Acquire temporary render targets
    var tmpRenderTarget1 = effectComposer.getRenderTarget(BLUR_BIT_SHIFT);
    var tmpRenderTarget2 = effectComposer.getRenderTarget(BLUR_BIT_SHIFT);

    if (!tmpRenderTarget1 || !tmpRenderTarget2) {
        console.error("Failed to acquire temporary render targets");
        return;
    }

    // Clear render targets to avoid residual data
    effectComposer.renderer.setRenderTarget(tmpRenderTarget1);
    effectComposer.renderer.setClearColor(new THREE.Color(0, 0, 0), 0); // Transparent black
    effectComposer.renderer.clear();

    effectComposer.renderer.setRenderTarget(tmpRenderTarget2);
    effectComposer.renderer.setClearColor(new THREE.Color(0, 0, 0), 0); // Transparent black
    effectComposer.renderer.clear();

    // First blur pass (horizontal)
    _blurMaterial.uniforms.u_texture.value = renderTarget.texture;
    _blurMaterial.uniforms.u_delta.value.set(exports.blurRadius / effectComposer.resolution.x, 0);
    fboHelper.render(_blurMaterial, tmpRenderTarget1);

    // Second blur pass (vertical)
    _blurMaterial.uniforms.u_texture.value = tmpRenderTarget1.texture;
    _blurMaterial.uniforms.u_delta.value.set(0, exports.blurRadius / effectComposer.resolution.y);
    fboHelper.render(_blurMaterial, tmpRenderTarget2);

    // Pass the final blurred texture to the main bloom shader
    this.uniforms.u_blurTexture.value = tmpRenderTarget2.texture;
    this.uniforms.u_amount.value = exports.amount;

    // Delegate final rendering to parent effect
    _super.render.call(this, dt, renderTarget, toScreen);

    // Release temporary render targets
    effectComposer.releaseRenderTarget(tmpRenderTarget1, tmpRenderTarget2);
}


function updateBloomAmount(newAmount) {
    exports.amount = newAmount;
    // Also update the shader uniform if it has already been initialized
    if (exports.uniforms && exports.uniforms.u_amount) {
        exports.uniforms.u_amount.value = newAmount;
    }
}
