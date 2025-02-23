import THREE from './utils/three.js';
let raf = require('raf'); // if you need it, or you can just use window.requestAnimationFrame
import settings from './core/settings';
import math from './utils/math';
import ease from './utils/ease';
import encode from 'mout/queryString/encode';
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

let _camera;
let _scene;
let _renderer;

let _time = 0;
let _ray;

let _initAnimation = 0;

let _bgColor;

let _currentCameraPosition;
let _targetCameraPosition;
let _cameraLerpFactor = 0.05;

// This local flag can mirror settings.isAnimating:
let _animating = false;

function init(container) {
    // -- Moved typical checks for settings into init:
    if (settings.isMobile === undefined) {
        settings.isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    }
    if (settings.isAnimating === undefined) {
        settings.isAnimating = true; // default
    }
    
    _ray = new THREE.Ray();
    _currentCameraPosition = new THREE.Vector3();
    _targetCameraPosition = new THREE.Vector3();

    _bgColor = new THREE.Color(settings.bgColor);
    settings.mouse = new THREE.Vector2(0, 0);
    settings.mouse3d = _ray.origin;

    // Adjust precision or other flags based on isMobile:
    const precision = settings.isMobile ? 'mediump' : 'highp';

    _renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
        powerPreference: 'low-power',
        precision: precision
    });

    // Limit device pixel ratio for performance on mobile
    _renderer.setPixelRatio(Math.min(window.devicePixelRatio, settings.isMobile ? 1.0 : 2.0));

    // Conditionally enable shadows
    if (settings.isMobile) {
        _renderer.shadowMap.enabled = false;
    } else {
        _renderer.shadowMap.enabled = true;
        _renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    // Set initial background
    _renderer.setClearColor(settings.bgColor, settings.bgOpacity);
    container.appendChild(_renderer.domElement);

    // WebGL context lost handler
    _renderer.domElement.addEventListener("webglcontextlost", function (event) {
        event.preventDefault();
        console.warn("WebGL context lost. Reloading...");
        location.reload();
    });

    // Scene & Fog
    _scene = new THREE.Scene();
    _scene.fog = new THREE.FogExp2(settings.bgColor, 0.01);

    // Camera
    _camera = new THREE.PerspectiveCamera(45, 1, 10, 3000);
    _camera.position.set(0, 200, 45);
    _camera.lookAt(0, 0, 0);

    // Initialize camera positions
    _currentCameraPosition.copy(_camera.position);
    _targetCameraPosition.copy(_camera.position);

    // Store in settings
    settings.camera = _camera;
    settings.cameraPosition = _camera.position;

    // Initialize other modules
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

    // If you want some default settings:
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

    // Add listeners
    window.addEventListener('resize', _onResize);
    window.addEventListener('mousemove', _onMove);
    window.addEventListener('touchmove', _bindTouch(_onMove));

    _onResize();

    // Decide if we should start animating right away
    if (settings.isAnimating) {
        startWebGLAnimation();
    }
}

function startWebGLAnimation() {
    console.log("Starting WebGL animation...");
    // Set the flag
    _animating = true;
    settings.isAnimating = true;
    _time = Date.now();
    requestAnimationFrame(_loop);
}

// A function to stop/pause the RAF loop
function stopWebGLAnimation() {
    console.log("Stopping WebGL animation...");
    _animating = false;
    settings.isAnimating = false;
}

function takeScreenshot() {
    const screenshotData = _renderer.domElement.toDataURL('image/png');
    return screenshotData;
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

// We keep a normal resize function
function _onResize() {
    _width = window.innerWidth;
    _height = window.innerHeight;

    // If you want to further scale down for mobile:
    // if (settings.isMobile) {
    //     _width = Math.floor(_width * 0.8);
    //     _height = Math.floor(_height * 0.8);
    // }

    postprocessing.resize(_width, _height);

    // Update camera
    _camera.aspect = _width / _height;
    _camera.updateProjectionMatrix();

    // Update renderer
    _renderer.setSize(_width, _height);
}

function _loop() {
    // If we flagged animation off mid-loop, just bail
    if (!_animating) return;

    let newTime = Date.now();
    let deltaTime = newTime - _time;
    _render(deltaTime, newTime);
    _time = newTime;

    requestAnimationFrame(_loop);
}

function _render(dt, newTime) {
    // We can skip certain heavy updates if not animating,
    // but since we check `_animating` in _loop, we only get here if animating.

    // Smooth camera movement
    _currentCameraPosition.x += (_targetCameraPosition.x - _currentCameraPosition.x) * _cameraLerpFactor;
    _currentCameraPosition.y += (_targetCameraPosition.y - _currentCameraPosition.y) * _cameraLerpFactor;
    _currentCameraPosition.z += (_targetCameraPosition.z - _currentCameraPosition.z) * _cameraLerpFactor;

    _camera.position.copy(_currentCameraPosition);
    _camera.lookAt(0, 0, 0);

    // Background
    _bgColor.setStyle(settings.bgColor);
    _renderer.setClearColor(_bgColor.getHex(), settings.bgOpacity);

    // Kickstart initAnimation
    _initAnimation = 1;
    simulator.initAnimation = _initAnimation;

    // Update lights, floor, etc.
    lights.update(dt, _camera);
    floor.mesh.visible = false;

    // Update mouse3D
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

    // Update simulation & particles
    simulator.update(dt);
    particles.update(dt);

    // Possibly disable postprocessing on mobile
    if (settings.isMobile) {
        fxaa.enabled = false;
        motionBlur.enabled = false;
        bloom.enabled = false;
    }

    // Render
    postprocessing.render(dt, newTime);
}

function updateSettings(newSettings) {
    // Basic merges
    if (newSettings.orbDisplay !== undefined) {
        settings.orbDisplay = newSettings.orbDisplay;
    }
    if (newSettings.speed !== undefined) {
        settings.speed = newSettings.speed;
    }
    if (newSettings.dieSpeed !== undefined) {
        settings.dieSpeed = newSettings.dieSpeed;
    }
    if (newSettings.curlSize !== undefined) {
        settings.curlSize = newSettings.curlSize;
    }
    if (newSettings.attraction !== undefined) {
        settings.attraction = newSettings.attraction;
    }
    if (newSettings.color1 !== undefined) {
        settings.color1 = newSettings.color1;
    }
    if (newSettings.color2 !== undefined) {
        settings.color2 = newSettings.color2;
    }
    if (newSettings.bgColor !== undefined) {
        settings.bgColor = newSettings.bgColor;
    }
    if (newSettings.bgOpacity !== undefined) {
        settings.bgOpacity = newSettings.bgOpacity;
    }
    if (newSettings.followMouse !== undefined) {
        settings.followMouse = newSettings.followMouse;
    }
    if (newSettings.lightIntensity !== undefined) {
        settings.lightIntensity = newSettings.lightIntensity;
    }
    if (newSettings.simulatorTextureWidth !== undefined) {
        settings.simulatorTextureWidth = newSettings.simulatorTextureWidth;
    }
    if (newSettings.simulatorTextureHeight !== undefined) {
        settings.simulatorTextureHeight = newSettings.simulatorTextureHeight;
    }
    if (newSettings.cameraTransitionSpeed !== undefined) {
        _cameraLerpFactor = 1 - Math.pow(0.1, 10 / (newSettings.cameraTransitionSpeed * 60));
    }
    if (
        newSettings.cameraX !== undefined &&
        newSettings.cameraY !== undefined &&
        newSettings.cameraZ !== undefined
    ) {
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
        // If we receive a new isAnimating state, respond accordingly
        settings.isAnimating = newSettings.isAnimating;
        if (settings.isAnimating && !_animating) {
            startWebGLAnimation();
        } else if (!settings.isAnimating && _animating) {
            stopWebGLAnimation();
        }
    }
}

module.exports = {
    init,
    startWebGLAnimation,
    stopWebGLAnimation,
    updateSettings,
    takeScreenshot
};
