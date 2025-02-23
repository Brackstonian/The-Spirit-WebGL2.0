let Effect = require('../Effect');
let glslify = require('glslify');

module.exports = new Effect();
let _super = Effect.prototype;

module.exports.init = init;

function init(isLow) {

    let vs = isLow ? glslify('./lowFxaa.vert') : '';
    let fs = isLow ? glslify('./lowFxaa.frag') : glslify('./fxaa.frag');

    _super.init.call(this, {
        uniforms: {},
        vertexShader: vs,
        fragmentShader: fs
    });

}
