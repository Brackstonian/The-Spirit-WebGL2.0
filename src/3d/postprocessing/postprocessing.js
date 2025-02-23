import THREE from '../../utils/three.js';

let effectComposer = require('./effectComposer');
let fxaa = require('./fxaa/fxaa');
let bloom = require('./bloom/bloom');
let motionBlur = require('./motionBlur/motionBlur');
let fboHelper = require('../fboHelper');

let undef;

exports.init = init;
exports.resize = resize;
exports.render = render;
exports.visualizeTarget = undef;

let _renderer;
let _scene;
let _camera;

function init(renderer, scene, camera) {

    _renderer = renderer;
    _scene = scene;
    _camera = camera;

    effectComposer.init(renderer, scene, camera);

    // for less power machine, pass true
    // fxaa.init(true);

    fxaa.init();
    effectComposer.queue.push(fxaa);

    motionBlur.init(500);
    effectComposer.queue.push(motionBlur);

    bloom.init();
    effectComposer.queue.push(bloom);

}

function resize(width, height) {
    effectComposer.resize(width, height);
}


function render(dt) {
    // Clear the renderer with transparency before rendering
    _renderer.setClearColor(new THREE.Color('#FE75CA'), 0.0);
    _renderer.clear();

    effectComposer.renderQueue(dt);

    if (exports.visualizeTarget) {
        fboHelper.copy(exports.visualizeTarget);
    }
}
