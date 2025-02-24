import THREE from './utils/three.js';
import settings from './core/settings';
import postprocessing from './3d/postprocessing/postprocessing';
import motionBlur from './3d/postprocessing/motionBlur/motionBlur';
import fxaa from './3d/postprocessing/fxaa/fxaa';
import bloom from './3d/postprocessing/bloom/bloom';
import fboHelper from './3d/fboHelper';
import simulator from './3d/simulator';
import particles from './3d/particles';
import lights from './3d/lights';
import floor from './3d/floor';

let _width = 0;
let _height = 0;

let _camera, _scene, _renderer;
let _time = 0;
let _ray;
let _initAnimation = 0;
let _bgColor;
let _currentCameraPosition;
let _targetCameraPosition;
let _cameraLerpFactor = 0.05;
let _animating = false;

let _clearHex = 0;

function init(container) {
    settings.isMobile ??= /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    settings.isAnimating ??= true;
    
    _ray = new THREE.Ray();
    _currentCameraPosition = new THREE.Vector3();
    _targetCameraPosition = new THREE.Vector3();

    _bgColor = new THREE.Color(settings.bgColor);
    settings.mouse = new THREE.Vector2(0, 0);
    settings.mouse3d = _ray.origin;
    
    const precision = settings.isMobile ? 'mediump' : 'highp';
    _renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
        powerPreference: 'low-power',
        precision: precision
    });

    _renderer.setPixelRatio(Math.min(window.devicePixelRatio, settings.isMobile ? 1.0 : 2.0));
    _renderer.shadowMap.enabled = !settings.isMobile;
    if (!settings.isMobile) {
        _renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    
    _renderer.setClearColor(settings.bgColor, settings.bgOpacity);
    _clearHex = _bgColor.getHex();
    container.appendChild(_renderer.domElement);

    _renderer.domElement.addEventListener("webglcontextlost", (event) => {
        event.preventDefault();
        console.warn("WebGL context lost. Reloading...");
        location.reload();
    });

    _scene = new THREE.Scene();
    _scene.fog = new THREE.FogExp2(settings.bgColor, 0.01);

    _camera = new THREE.PerspectiveCamera(45, 1, 10, 3000);
    _camera.position.set(0, 200, 45);
    _camera.lookAt(0, 0, 0);

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

    updateSettings({
        orbDisplay: [true, false],
        speed: [1, 0.4],
        dieSpeed: [0.015, 0.015],
        curlSize: [0.02, 0.2],
        attraction: [1, 1.2],
        color1: ['#343434', '#fff307'],
        color2: ['#a8ff2d', '#343434'],
        pattern: ['still', 'still'],
        followMouse: [false, false],
        bgColor: "#343434",
        bgOpacity: "1",
        lightIntensity: 1,
        bloomAmount: 1,
        cameraX: 300,
        cameraY: 0,
        cameraZ: 0,
        cameraTransitionSpeed: 1
    });

    window.addEventListener('resize', _onResize);

    _onResize();

    if (settings.isAnimating) {
        startWebGLAnimation();
    }
}

function startWebGLAnimation() {
    console.log("Starting WebGL animation...");
    _animating = true;
    settings.isAnimating = true;
    _time = performance.now();
    requestAnimationFrame(_loop);
}

function stopWebGLAnimation() {
    console.log("Stopping WebGL animation...");
    _animating = false;
    settings.isAnimating = false;

    if (_renderer && _renderer.domElement && _renderer.domElement.parentNode) {
        _renderer.domElement.parentNode.removeChild(_renderer.domElement);
    }
}

function takeScreenshot() {
    return _renderer.domElement.toDataURL('image/png');
}

function _bindTouch(func) {
    return (evt) => {
        settings.isMobile && evt.preventDefault && evt.preventDefault();
        func(evt.changedTouches[0]);
    };
}

function _onResize() {
    _width = window.innerWidth;
    _height = window.innerHeight;
    postprocessing.resize(_width, _height);
    _camera.aspect = _width / _height;
    _camera.updateProjectionMatrix();
    _renderer.setSize(_width, _height);
}

function _loop() {
    if (!_animating) return;

    const newTime = performance.now();
    const deltaTime = newTime - _time;
    _render(deltaTime, newTime);
    _time = newTime;
    requestAnimationFrame(_loop);
}

function _render(dt, newTime) {
    // Smooth camera movement using vector math
    const diff = _targetCameraPosition.clone().sub(_currentCameraPosition).multiplyScalar(_cameraLerpFactor);
    _currentCameraPosition.add(diff);
    _camera.position.copy(_currentCameraPosition);
    _camera.lookAt(0, 0, 0);

    // Update background only if settings change frequently
    _bgColor.setStyle(settings.bgColor);
    _clearHex = _bgColor.getHex();
    _renderer.setClearColor(_clearHex, settings.bgOpacity);

    _initAnimation = 1;
    simulator.initAnimation = _initAnimation;

    lights.update(dt, _camera);
    floor.mesh.visible = false;

    _camera.updateMatrixWorld();
    _ray.origin.setFromMatrixPosition(_camera.matrixWorld);
    _ray.direction
        .set(settings.mouse.x, settings.mouse.y, 0.5)
        .unproject(_camera)
        .sub(_ray.origin)
        .normalize();

    if (isNaN(_ray.direction.x) || isNaN(_ray.direction.y) || isNaN(_ray.direction.z)) {
        _ray.direction.set(0, 0, -1);
    }

    let distance = _ray.origin.length() / Math.cos(Math.PI - _ray.direction.angleTo(_ray.origin));
    if (!isFinite(distance)) {
        distance = 100;
    }
    _ray.origin.add(_ray.direction.multiplyScalar(distance));

    simulator.update(dt);
    particles.update(dt);

    motionBlur.enabled = false; 
    if (settings.isMobile) {
        fxaa.enabled = false;
        bloom.enabled = false;
    }

    postprocessing.render(dt, newTime);
}

function updateSettings(newSettings) {
    if (newSettings.orbDisplay !== undefined) settings.orbDisplay = newSettings.orbDisplay;
    if (newSettings.speed !== undefined) settings.speed = newSettings.speed;
    if (newSettings.dieSpeed !== undefined) settings.dieSpeed = newSettings.dieSpeed;
    if (newSettings.curlSize !== undefined) settings.curlSize = newSettings.curlSize;
    if (newSettings.attraction !== undefined) settings.attraction = newSettings.attraction;
    if (newSettings.color1 !== undefined) settings.color1 = newSettings.color1;
    if (newSettings.color2 !== undefined) settings.color2 = newSettings.color2;
    if (newSettings.bgColor !== undefined) settings.bgColor = newSettings.bgColor;
    if (newSettings.bgOpacity !== undefined) settings.bgOpacity = newSettings.bgOpacity;
    if (newSettings.followMouse !== undefined) settings.followMouse = newSettings.followMouse;
    if (newSettings.lightIntensity !== undefined) settings.lightIntensity = newSettings.lightIntensity;
    if (newSettings.simulatorTextureWidth !== undefined) settings.simulatorTextureWidth = newSettings.simulatorTextureWidth;
    if (newSettings.simulatorTextureHeight !== undefined) settings.simulatorTextureHeight = newSettings.simulatorTextureHeight;
    if (newSettings.cameraTransitionSpeed !== undefined) {
        _cameraLerpFactor = 1 - Math.pow(0.1, 10 / (newSettings.cameraTransitionSpeed * 60));
    }
    if (newSettings.cameraX !== undefined && newSettings.cameraY !== undefined && newSettings.cameraZ !== undefined) {
        _targetCameraPosition.set(newSettings.cameraX, newSettings.cameraY, newSettings.cameraZ);
    }
    if (newSettings.pattern !== undefined) {
        settings.pattern = newSettings.pattern;
        simulator.setPattern(newSettings.pattern);
    }
    if (newSettings.bloomAmount !== undefined) {
        settings.bloomAmount = newSettings.bloomAmount;
        bloom.updateBloomAmount(settings.bloomAmount);
    }
    if (newSettings.isAnimating !== undefined) {
        settings.isAnimating = newSettings.isAnimating;
        if (settings.isAnimating && !_animating) {
            startWebGLAnimation();
        } else if (!settings.isAnimating && _animating) {
            stopWebGLAnimation();
        }
    }
}

module.exports =  {
    init,
    startWebGLAnimation,
    stopWebGLAnimation,
    updateSettings,
    takeScreenshot
};
