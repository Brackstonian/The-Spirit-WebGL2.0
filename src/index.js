var raf = require('raf');

var undef;

var _width = 0;
var _height = 0;

var _camera;
var _scene;
var _renderer;

var _time = 0;
var _ray;

var _initAnimation = 0;

var _bgColor;

var _currentCameraPosition;
var _targetCameraPosition;
var _cameraLerpFactor = 0.05;

var motionBlur;
var fxaa; 
var bloom; 
var fboHelper; 
var simulator; 
var particles; 
var lights; 
var floor; 
var settings; 
var postprocessing;
var math;
var settings;

function initTHREE(externalTHREE) {
    if (!externalTHREE) {
        throw new Error('THREE must be provided to initialize the WebGL experience');
    }
    
    window.THREE = externalTHREE;
    THREE = externalTHREE;
    
    return window.THREE;
}

function init(externalTHREE, container) {
    initTHREE(externalTHREE)

    _ray = new THREE.Ray();
    _currentCameraPosition = new THREE.Vector3();
    _targetCameraPosition = new THREE.Vector3();


    settings = require('./core/settings');
    math = require('./utils/math');
    var ease = require('./utils/ease');
    var encode = require('mout/queryString/encode');
    
    postprocessing = require('./3d/postprocessing/postprocessing');
    motionBlur = require('./3d/postprocessing/motionBlur/motionBlur');
    fxaa = require('./3d/postprocessing/fxaa/fxaa');
    bloom = require('./3d/postprocessing/bloom/bloom');
    fboHelper = require('./3d/fboHelper');
    simulator = require('./3d/simulator');
    particles = require('./3d/particles');
    lights = require('./3d/lights');
    floor = require('./3d/floor');

    _bgColor = new THREE.Color(settings.bgColor);
    settings.mouse = new THREE.Vector2(0, 0);
    settings.mouse3d = _ray.origin;

    _renderer = new THREE.WebGLRenderer({
        antialias: true
    });
    _renderer.setClearColor(settings.bgColor);
    _renderer.shadowMap.enabled = true;
    _renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(_renderer.domElement);

    _scene = new THREE.Scene();
    _scene.fog = new THREE.FogExp2(settings.bgColor, 0.001);

    _camera = new THREE.PerspectiveCamera(45, 1, 10, 3000);
    _camera.position.set(0, 200, 45);
    _camera.lookAt(0, 0, 0);

    // Initialize camera positions
    _currentCameraPosition.copy(_camera.position);
    _targetCameraPosition.copy(_camera.position);

    settings.camera = _camera;
    settings.cameraPosition = _camera.position;

    fboHelper.init(_renderer);
    postprocessing.init(_renderer, _scene, _camera);

    simulator.init(_renderer);
    particles.init(_renderer);
    _scene.add(particles.container);

    lights.init(_renderer);
    _scene.add(lights.mesh);

    _scene.add(new THREE.PointLightHelper(lights.pointLight));

    floor.init(_renderer);
    floor.mesh.position.y = -100;
    _scene.add(floor.mesh);

    window.addEventListener('resize', _onResize);
    window.addEventListener('mousemove', _onMove);
    window.addEventListener('touchmove', _bindTouch(_onMove));
    window.addEventListener('keyup', _onKeyUp);

    _time = Date.now();
    _onResize();
    _loop();
}

function _onKeyUp(evt) {
    if (evt.keyCode === 32) {
        settings.speed = settings.speed === 0 ? 1 : 0;
        settings.dieSpeed = settings.dieSpeed === 0 ? 0.015 : 0;
    }
}

function _bindTouch(func) {
    return function (evt) {
        if (settings.isMobile && evt.preventDefault) {
            evt.preventDefault();
        }
        func(evt.changedTouches[0]);
    };
}

function _onMove(evt) {
    settings.mouse.x = (evt.clientX / _width) * 2 - 1;
    settings.mouse.y = (-evt.clientY / _height) * 2 + 1;
}

function _onResize() {
    _width = window.innerWidth;
    _height = window.innerHeight;

    postprocessing.resize(_width, _height);
}

function _loop() {
    var newTime = Date.now();
    raf(_loop);
    _render(newTime - _time, newTime);
    _time = newTime;
}

function _render(dt, newTime) {
    // Smooth camera movement
    _currentCameraPosition.x += (_targetCameraPosition.x - _currentCameraPosition.x) * _cameraLerpFactor;
    _currentCameraPosition.y += (_targetCameraPosition.y - _currentCameraPosition.y) * _cameraLerpFactor;
    _currentCameraPosition.z += (_targetCameraPosition.z - _currentCameraPosition.z) * _cameraLerpFactor;

    _camera.position.copy(_currentCameraPosition);
    _camera.lookAt(0, 0, 0);

    motionBlur.skipMatrixUpdate = !(settings.dieSpeed || settings.speed) && settings.motionBlurPause;

    var ratio;
    _bgColor.setStyle(settings.bgColor);
    var tmpColor = floor.mesh.material.color;
    tmpColor = _bgColor;
    _scene.fog.color.copy(tmpColor);
    _renderer.setClearColor(tmpColor.getHex());

    _initAnimation = Math.min(_initAnimation + dt * 0.00025, 1);
    simulator.initAnimation = _initAnimation;

    lights.update(dt, _camera);


    // Floor visibility
    floor.mesh.visible = settings.showFloor;

    // update mouse3d
    _camera.updateMatrixWorld();
    _ray.origin.setFromMatrixPosition(_camera.matrixWorld);
    _ray.direction.set(settings.mouse.x, settings.mouse.y, 0.5).unproject(_camera).sub(_ray.origin).normalize();
    var distance = _ray.origin.length() / Math.cos(Math.PI - _ray.direction.angleTo(_ray.origin));
    _ray.origin.add(_ray.direction.multiplyScalar(distance * 1.0));
    simulator.update(dt);
    particles.update(dt);

    ratio = Math.min((1 - Math.abs(_initAnimation - 0.5) * 2) * 1.2, 1);
    var blur = (1 - ratio) * 10;

    if (ratio) {
        ratio = (0.8 + Math.pow(_initAnimation, 1.5) * 0.5);
        if (_width < 580) ratio *= 0.5;
    }

    ratio = math.unLerp(0.5, 0.6, _initAnimation);

    fxaa.enabled = !!settings.fxaa;
    motionBlur.enabled = !!settings.motionBlur;
    bloom.enabled = !!settings.bloom;

    postprocessing.render(dt, newTime);
}

module.exports = {
    init,
    initTHREE,
    updateSettings: function (newSettings) {
        settings.speed = newSettings.speed;
        settings.dieSpeed = newSettings.dieSpeed;
        settings.bgColor = newSettings.bgColor;
        settings.followMouse = newSettings.followMouse;
        settings.showFloor = newSettings.showFloor;
        settings.attraction = newSettings.attraction;
        settings.color1 = newSettings.color1;
        settings.color2 = newSettings.color2;
        settings.curlSize = newSettings.curlSize;
        settings.radius = newSettings.radius;
        settings.lightIntensity = newSettings.lightIntensity;
        settings.simulatorTextureWidth = newSettings.simulatorTextureWidth;
        settings.simulatorTextureHeight = newSettings.simulatorTextureHeight;
        if (newSettings.cameraTransitionSpeed !== undefined) {
            _cameraLerpFactor = 1 - Math.pow(0.1, 1 / (newSettings.cameraTransitionSpeed * 60));
        }
        if (newSettings.cameraX !== undefined &&
            newSettings.cameraY !== undefined &&
            newSettings.cameraZ !== undefined) {
            _targetCameraPosition.set(
                newSettings.cameraX,
                newSettings.cameraY,
                newSettings.cameraZ
            );
        }
        if (newSettings.pattern) {
            simulator.setPattern(newSettings.pattern);
        }
    }
};
