let Effect = require('../Effect');
let glslify = require('glslify');

module.exports = new Effect();
let _super = Effect.prototype;

module.exports.init = init;

function init() {

    _super.init.call(this, {
        uniforms: {
            u_reduction: { type: 'f', value: 0.3 },
            u_boost: { type: 'f', value: 1.2 }
        },
        fragmentShader: glslify('./vignette.frag')
    });

}
