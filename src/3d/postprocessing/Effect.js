import THREE from '../../utils/three';

let effectComposer = require('./effectComposer');
let fboHelper = require('../fboHelper');
let merge = require('mout/object/merge');
let glslify = require('glslify');


let undef;

function Effect() {}

module.exports = Effect;
let _p = Effect.prototype;

_p.init = init;
_p.resize = resize;
_p.render = render;

let _shaderMaterialQuadVertexShader = glslify('../shaderMaterialQuad.vert');

function init(cfg) {

    merge(this, {

        uniforms: {
            u_texture: { type: 't', value: undef },
            u_resolution: { type: 'v2', value: effectComposer.resolution },
            u_aspect: { type: 'f', value: 1 }
        },
        enabled: true,
        vertexShader: '',
        fragmentShader: '',
        isRawMaterial: true,
        addRawShaderPrefix: true

    }, cfg);

    if(!this.vertexShader) {
        this.vertexShader = this.isRawMaterial ? fboHelper.vertexShader : _shaderMaterialQuadVertexShader;
    }

    if(this.addRawShaderPrefix && this.isRawMaterial) {
        this.vertexShader = fboHelper.rawShaderPrefix + this.vertexShader;
        this.fragmentShader = fboHelper.rawShaderPrefix + this.fragmentShader;
    }

    this.material = new THREE[ this.isRawMaterial ? 'RawShaderMaterial' : 'ShaderMaterial']({
          uniforms : this.uniforms,
          vertexShader : this.vertexShader,
          fragmentShader : this.fragmentShader
    });

}

function resize(width, height) {

}

function render(dt, renderTarget, toScreen) {

    this.uniforms.u_texture.value = renderTarget.texture;
    this.uniforms.u_aspect.value = this.uniforms.u_resolution.value.x / this.uniforms.u_resolution.value.y;

    return effectComposer.render(this.material, toScreen);

}
