var effectComposer = require('./effectComposer');
var fxaa = require('./fxaa/fxaa');
var bloom = require('./bloom/bloom');
var motionBlur = require('./motionBlur/motionBlur');
var fboHelper = require('../fboHelper');

var undef;

exports.init = init;
exports.resize = resize;
exports.render = render;
exports.dispose = dispose;
exports.visualizeTarget = undef;

var _renderer;
var _scene;
var _camera;

function init(renderer, scene, camera) {
    _renderer = renderer;
    _scene = scene;
    _camera = camera; // FIX: was `_camera = _camera`

    
    effectComposer.init(renderer, scene, camera);
    
    if (Array.isArray(effectComposer.queue)) {
        effectComposer.queue.length = 0;
    }
    
    // fxaa.init(true); // for less power machine
    fxaa.init();
    effectComposer.queue.push(fxaa);

    motionBlur.init();
    effectComposer.queue.push(motionBlur);

    bloom.init();
    effectComposer.queue.push(bloom);
}

function resize(width, height) {
    effectComposer.resize(width, height);
}

function render(dt) {
    effectComposer.renderQueue(dt);

    if (exports.visualizeTarget) {
        fboHelper.copy(exports.visualizeTarget);
    }
}

function dispose() {
    // If your sub-passes expose dispose(), call them safely
    try { if (typeof fxaa.dispose === 'function') fxaa.dispose(); } catch (_) { }
    try { if (typeof bloom.dispose === 'function') bloom.dispose(); } catch (_) { }
    try { if (typeof motionBlur.dispose === 'function') motionBlur.dispose(); } catch (_) { }

    try { if (typeof effectComposer.dispose === 'function') effectComposer.dispose(); } catch (_) { }

    _renderer = null;
    _scene = null;
    _camera = null;
}
