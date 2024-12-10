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
        antialias: true,
        alpha: true, 
        preserveDrawingBuffer: true,
    });
    _renderer.setClearColor(settings.bgColor, settings.bgOpacity);
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

let previousPosition = null;


const patternPoints = [];
const dotMeshes = [];
let line;
let initialPoint = null; 
let initialDot = null; 


function _onMouseDown(event) {
    const mouse = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, _camera);

    const intersects = raycaster.intersectObjects(_scene.children, true);

    if (event.shiftKey) { 
        _undoLastPoint();
    } else if (intersects.length > 0) {
        const position = intersects[0].point;
        const intersectedObject = intersects[0].object;

        if (intersectedObject === initialDot) {
            console.log("Loop detected: logging complete pattern");
            logPatternPoints();
            return;
        }

        if (patternPoints.length === 0) {
            initialPoint = position.clone();


            const initialDotGeometry = new THREE.SphereGeometry(12, 16, 16); 
            const initialDotMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); 
            initialDot = new THREE.Mesh(initialDotGeometry, initialDotMaterial);
            initialDot.position.copy(initialPoint);
            _scene.add(initialDot);

            dotMeshes.push(initialDot);
        }

        patternPoints.push(position.clone());

        const dotGeometry = new THREE.SphereGeometry(10, 16, 16);
        const dotMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const dotMesh = new THREE.Mesh(dotGeometry, dotMaterial);
        dotMesh.position.copy(position);
        _scene.add(dotMesh);

        dotMeshes.push(dotMesh);

        _updateLine();
    }
}

function _undoLastPoint() {
    if (patternPoints.length === 0 || dotMeshes.length === 0) return;
    patternPoints.pop();
    const lastDot = dotMeshes.pop();
    _scene.remove(lastDot);

    _updateLine();

    if (patternPoints.length === 0) {
        initialPoint = null;
        initialDot = null;
    }
}

function _updateLine() {
    if (line) _scene.remove(line);

    if (patternPoints.length > 1) {
        const curve = new THREE.CatmullRomCurve3(patternPoints);
        const points = curve.getPoints(50);
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
        line = new THREE.Line(lineGeometry, lineMaterial);
        _scene.add(line);
    }
}

function logPatternPoints() {
    console.log("Pattern Points:");
    patternPoints.forEach((point) => {
        console.log(`new THREE.Vector3(${point.x.toFixed(2)}, ${point.y.toFixed(2)}, ${point.z.toFixed(2)}),`);
    });
}

function _onKeyUp(evt) {
    if (evt.key === 'p') {
        // window.addEventListener('mousedown', _onMouseDown);
        // takeScreenshot();
    }
}

function takeScreenshot(blurAmount = 0.5) {
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

    // motionBlur.skipMatrixUpdate = !(settings.dieSpeed || settings.speed) && settings.motionBlurPause;

    var ratio;
    _bgColor.setStyle(settings.bgColor);
    var tmpColor = floor.mesh.material.color;
    tmpColor = _bgColor;
    _scene.fog.color.copy(tmpColor);
    _renderer.setClearColor(tmpColor.getHex(), settings.bgOpacity);

    _initAnimation = Math.min(_initAnimation + dt * 0.00025, 1);
    simulator.initAnimation = _initAnimation;

    lights.update(dt, _camera);


    // Floor visibility
    floor.mesh.visible = false;

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
        settings.orbDisplay = newSettings.orbDisplay;
        settings.speed = newSettings.speed;
        settings.dieSpeed = newSettings.dieSpeed;
        settings.radius = newSettings.radius;
        settings.curlSize = newSettings.curlSize;
        settings.attraction = newSettings.attraction;
        settings.color1 = newSettings.color1;
        settings.color2 = newSettings.color2;

        settings.bgColor = newSettings.bgColor;
        settings.bgOpacity = newSettings.bgOpacity;
        settings.followMouse = newSettings.followMouse;
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
        if (newSettings.pattern !== undefined) {
            settings.pattern = newSettings.pattern;
            simulator.setPattern(newSettings.pattern);
        }
        if (newSettings.bloomAmount !== undefined) {
            settings.bloomAmount = newSettings.bloomAmount;
            bloom.updateBloomAmount(settings.bloomAmount);
        }
    },
    takeScreenshot: takeScreenshot
};
