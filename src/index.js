var dat = require('dat-gui');
var Stats = require('stats.js');
var css = require('dom-css');
var raf = require('raf');

var THREE = require('three');

var OrbitControls = require('./controls/OrbitControls');
var settings = require('./core/settings');

var math = require('./utils/math');
var ease = require('./utils/ease');

var postprocessing = require('./3d/postprocessing/postprocessing');
var motionBlur = require('./3d/postprocessing/motionBlur/motionBlur');
var fxaa = require('./3d/postprocessing/fxaa/fxaa');
var bloom = require('./3d/postprocessing/bloom/bloom');
var fboHelper = require('./3d/fboHelper');
var simulator = require('./3d/simulator');
var particles = require('./3d/particles');
var lights = require('./3d/lights');
var floor = require('./3d/floor');

var _stats;
var _width = 0;
var _height = 0;
var _control;
var _camera;
var _scene;
var _renderer;
var _time = 0;
var _ray = new THREE.Ray();
var _initAnimation = 0;
var _bgColor;

var getBgColor;
var getColors;
var getSpeed;
var getDieSpeed;
var getRadius;
var getCurlSize;
var getAttraction;
var getShadowDarkness;
let getFxaa;
let getMotionBlur;
let getMotionBlurMaxDistance;
let getMotionBlurMultiplier;
let getMotionBlurQuality;
let getBloom;
let getBloomRadius;

let _alreadyRan = false;
let _existingRenderer = null;
let _existingScene = null;
let _existingCamera = null;

let _rafId = null;
let _touchMoveHandler = null;
let _onContextLost = null;
let _onContextRestored = null;

function init(container) {
    if (!container) return;

    if (settings.useStats) {
        _stats = new Stats();
        css(_stats.domElement, { position: 'absolute', left: '0px', top: '0px', zIndex: 2048 });
        container.appendChild(_stats.domElement);
    }

    _bgColor = new THREE.Color(getBgColor());
    settings.mouse = new THREE.Vector2(0, 0);
    settings.mouse3d = _ray.origin;

    _renderer = new THREE.WebGLRenderer({
        antialias: true,
        preserveDrawingBuffer: true,
    });

    _renderer.setClearColor(getBgColor());
    _renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    _renderer.shadowMap.enabled = true;
    container.appendChild(_renderer.domElement);

    _scene = new THREE.Scene();
    _scene.fog = new THREE.FogExp2(getBgColor(), 0.001);

    _camera = new THREE.PerspectiveCamera(45, 1, 10, 3000);
    _camera.position.set(300, 60, 300).normalize().multiplyScalar(1000);
    settings.camera = _camera;
    settings.cameraPosition = _camera.position;

    fboHelper.init(_renderer);
    postprocessing.init(_renderer, _scene, _camera);

    simulator.init(_renderer);
    particles.init(_renderer, getColors);
    _scene.add(particles.container);

    simulator.update(0);
    particles.update(0);

    lights.init(_renderer);
    _scene.add(lights.mesh);

    floor.init(_renderer);
    floor.mesh.position.y = -100;
    _scene.add(floor.mesh);

    _control = new OrbitControls(_camera, _renderer.domElement);
    _control.target.y = 50;
    _control.maxDistance = 1000;
    _control.minPolarAngle = 0.3;
    _control.maxPolarAngle = Math.PI / 2 - 0.1;
    _control.noPan = true;
    _control.update();

    window.addEventListener('resize', _onResize);
    window.addEventListener('mousemove', _onMove);
    _touchMoveHandler = _bindTouch(_onMove);
    window.addEventListener('touchmove', _touchMoveHandler);
    window.addEventListener('keyup', _onKeyUp);

    _onContextLost = e => e.preventDefault();
    _onContextRestored = () => { };
    _renderer.domElement.addEventListener('webglcontextlost', _onContextLost, false);
    _renderer.domElement.addEventListener('webglcontextrestored', _onContextRestored, false);

    _time = Date.now();
    _onResize();
    _loop();
}

function fallbackInit(container) {
    if (!container) return () => { };

    _renderer = _existingRenderer;
    _scene = _existingScene;
    _camera = _existingCamera;

    container.appendChild(_renderer.domElement);

    simulator.init(_renderer, { resume: true });
    particles.init(_renderer, getColors, { resume: true });
    _scene.add(particles.container);

    lights.init(_renderer);
    _scene.add(lights.mesh);

    floor.init(_renderer);
    floor.mesh.position.y = -100;
    _scene.add(floor.mesh);

    _control = new OrbitControls(_camera, _renderer.domElement);
    _control.target.y = 50;
    _control.maxDistance = 1000;
    _control.minPolarAngle = 0.3;
    _control.maxPolarAngle = Math.PI / 2 - 0.1;
    _control.noPan = true;
    _control.update();

    _time = Date.now();
    _onResize();
    _loop();

    return function cleanupFallback() {
        if (_rafId != null) { raf.cancel(_rafId); _rafId = null; }

        window.removeEventListener('resize', _onResize);
        window.removeEventListener('mousemove', _onMove);
        if (_touchMoveHandler) {
            window.removeEventListener('touchmove', _touchMoveHandler);
            _touchMoveHandler = null;
        }
        window.removeEventListener('keyup', _onKeyUp);

        if (_control && typeof _control.dispose === 'function') _control.dispose();
        _control = null;

        try { _scene.remove(particles.container); } catch (_) { }
        try { _scene.remove(lights.mesh); } catch (_) { }
        try { _scene.remove(floor.mesh); } catch (_) { }
    };
}

function _onKeyUp(evt) {
    if (evt.keyCode === 32) {
        settings.speed = settings.speed === 0 ? 1 : 0;
        settings.dieSpeed = settings.dieSpeed === 0 ? 0.015 : 0;
    }
}

function _bindTouch(func) {
    return function (evt) {
        if (settings.isMobile && evt.preventDefault) evt.preventDefault();
        func(evt.changedTouches[0]);
    };
}

function _onMove(evt) {
    settings.mouse.x = (evt.pageX / _width) * 2 - 1;
    settings.mouse.y = -(evt.pageY / _height) * 2 + 1;
}

function _onResize() {
    _width = window.innerWidth;
    _height = window.innerHeight;
    if (_renderer) _renderer.setSize(_width, _height, false);
    if (_camera) {
        _camera.aspect = _width / _height;
        _camera.updateProjectionMatrix();
    }
    postprocessing.resize(_width, _height);
}

function _loop() {
    _rafId = raf(_loop);
    if (settings.useStats) _stats.begin();
    _render(Date.now() - _time, Date.now());
    if (settings.useStats) _stats.end();
    _time = Date.now();
}

function _render(dt, newTime) {
    if (!_renderer || !_scene || !_camera) return;

    motionBlur.skipMatrixUpdate = !(settings.dieSpeed || settings.speed) && settings.motionBlurPause;

    settings.speed = getSpeed();
    settings.dieSpeed = getDieSpeed();
    settings.radius = getRadius();
    settings.curlSize = getCurlSize();
    settings.attraction = getAttraction();
    settings.shadowDarkness = getShadowDarkness();
    settings.fxaa = getFxaa();
    settings.motionBlur = getMotionBlur();
    motionBlur.maxDistance = getMotionBlurMaxDistance();
    motionBlur.motionMultiplier = getMotionBlurMultiplier();

    const q = getMotionBlurQuality();
    if (q !== settings.query.motionBlurQuality) {
        settings.query.motionBlurQuality = q;
        motionBlur.linesRenderTargetScale = settings.motionBlurQualityMap[settings.query.motionBlurQuality];
        motionBlur.resize();
    }

    settings.bloom = getBloom();
    bloom.blurRadius = getBloomRadius();

    _bgColor.setStyle(getBgColor());
    var tmpColor = floor.mesh.material.color;
    tmpColor.lerp(_bgColor, 0.05);
    _scene.fog.color.copy(tmpColor);
    _renderer.setClearColor(tmpColor.getHex());

    _initAnimation = Math.min(_initAnimation + dt * 0.00025, 1);
    simulator.initAnimation = _initAnimation;

    _control.maxDistance = _initAnimation === 1 ? 1000 : math.lerp(1000, 450, ease.easeOutCubic(_initAnimation));
    _control.update();
    lights.update(dt, _camera);

    _camera.updateMatrixWorld();
    _ray.origin.setFromMatrixPosition(_camera.matrixWorld);
    _ray.direction.set(settings.mouse.x, settings.mouse.y, 0.5).unproject(_camera).sub(_ray.origin).normalize();
    var distance = _ray.origin.length() / Math.cos(Math.PI - _ray.direction.angleTo(_ray.origin));
    _ray.origin.add(_ray.direction.multiplyScalar(distance));
    simulator.update(dt);
    particles.update(dt);

    fxaa.enabled = !!settings.fxaa;
    motionBlur.enabled = !!settings.motionBlur;
    bloom.enabled = !!settings.bloom;

    postprocessing.render(dt, newTime);
}

module.exports = {
    init: function (container, options = {}) {
        console.log('[particles] USING PALETTE-ONLY BUILD');
        getBgColor = options.getBgColor || (() => settings.bgColor);
        getColors = options.getColors || (() => {
            if (Array.isArray(settings.colors) && settings.colors.length >= 2) return settings.colors;
            return ['#ffffff', '#000000'];
        });
        getSpeed = options.getSpeed || (() => settings.speed);
        getDieSpeed = options.getDieSpeed || (() => settings.dieSpeed);
        getRadius = options.getRadius || (() => settings.radius);
        getCurlSize = options.getCurlSize || (() => settings.curlSize);
        getAttraction = options.getAttraction || (() => settings.attraction);
        getShadowDarkness = options.getShadowDarkness || (() => settings.shadowDarkness);
        getFxaa = options.getFxaa || (() => settings.fxaa);
        getMotionBlur = options.getMotionBlur || (() => settings.motionBlur);
        getMotionBlurMaxDistance = options.getMotionBlurMaxDistance || (() => motionBlur.maxDistance);
        getMotionBlurMultiplier = options.getMotionBlurMultiplier || (() => motionBlur.motionMultiplier);
        getMotionBlurQuality = options.getMotionBlurQuality || (() => settings.query.motionBlurQuality);
        getBloom = options.getBloom || (() => settings.bloom);
        getBloomRadius = options.getBloomRadius || (() => bloom.blurRadius);

        if (_alreadyRan && _existingRenderer) {
            return fallbackInit(container);
        }

        _alreadyRan = true;
        init(container);

        _existingRenderer = _renderer;
        _existingScene = _scene;
        _existingCamera = _camera;

        function _safeDispose(label, obj) {
            try {
                if (obj && typeof obj.dispose === 'function') obj.dispose();
            } catch (err) { }
        }

        return function cleanup() {
            if (_rafId != null) { raf.cancel(_rafId); _rafId = null; }

            window.removeEventListener('resize', _onResize);
            window.removeEventListener('mousemove', _onMove);
            if (_touchMoveHandler) {
                window.removeEventListener('touchmove', _touchMoveHandler);
                _touchMoveHandler = null;
            }
            window.removeEventListener('keyup', _onKeyUp);

            if (_renderer && _renderer.domElement) {
                if (_onContextLost) _renderer.domElement.removeEventListener('webglcontextlost', _onContextLost, false);
                if (_onContextRestored) _renderer.domElement.removeEventListener('webglcontextrestored', _onContextRestored, false);
            }

            if (_control && typeof _control.dispose === 'function') _control.dispose();
            _control = null;

            _safeDispose('postprocessing', postprocessing);
            _safeDispose('particles', particles);
            _safeDispose('simulator', simulator);
            _safeDispose('lights', lights);
            _safeDispose('floor', floor);
            _safeDispose('fboHelper', fboHelper);

            if (_renderer) {
                if (typeof _renderer.dispose === 'function') _renderer.dispose();
                if (_renderer.domElement && _renderer.domElement.parentNode) {
                    _renderer.domElement.parentNode.removeChild(_renderer.domElement);
                }
                _renderer = null;
            }

            if (_stats && _stats.domElement && _stats.domElement.parentNode) {
                _stats.domElement.parentNode.removeChild(_stats.domElement);
            }
            _stats = null;

            _scene = null;
            _camera = null;
        };
    },
    takeScreenshot: function () {
        return _renderer.domElement.toDataURL('image/png');
    },
};
