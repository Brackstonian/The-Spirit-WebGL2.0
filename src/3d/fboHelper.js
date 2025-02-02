import THREE from '../utils/three';
var glslify = require('glslify');
var settings = require('../core/settings');
var undef;


var _renderer;
var _mesh;
var _scene;
var _camera;

var rawShaderPrefix = exports.rawShaderPrefix = undef;
var vertexShader = exports.vertexShader = undef;
var copyMaterial = exports.copyMaterial = undef;

exports.init = init;
exports.copy = copy;
exports.render = render;
exports.createRenderTarget = createRenderTarget;
exports.getColorState = getColorState;
exports.setColorState = setColorState;

function init(renderer) {

    // ensure it wont initialized twice
    if(_renderer) return;

    _renderer = renderer;

    rawShaderPrefix = exports.rawShaderPrefix = 'precision ' + _renderer.capabilities.precision + ' float;\n';

    _scene = new THREE.Scene();
    _camera = new THREE.Camera();
    _camera.position.z = 1;

    copyMaterial = exports.copyMaterial = new THREE.RawShaderMaterial({
        uniforms: {
            u_texture: { type: 't', value: undef }
        },
        vertexShader: vertexShader = exports.vertexShader = rawShaderPrefix + glslify('./quad.vert'),
        fragmentShader: rawShaderPrefix + glslify('./quad.frag')
    });

    _mesh = new THREE.Mesh( new THREE.PlaneGeometry( 2, 2 ), copyMaterial );
    _scene.add( _mesh );

}

function copy(inputTexture, ouputTexture) {
    _mesh.material = copyMaterial;
    copyMaterial.uniforms.u_texture.value = inputTexture;
    if(ouputTexture) {
		_renderer.setRenderTarget(ouputTexture);
        _renderer.render( _scene, _camera );
		_renderer.setRenderTarget(null);
    } else {
        _renderer.render( _scene, _camera );
    }
}
function render(material, renderTarget) {
    _mesh.material = material;

    if (renderTarget) {
        _renderer.setRenderTarget(renderTarget);
        _renderer.setClearColor(new THREE.Color(settings.bgColor), settings.bgOpacity); // Ensure clear color and alpha
        _renderer.clear(); // Clear the target before rendering
        _renderer.render(_scene, _camera);
        _renderer.setRenderTarget(null);
    } else {
        _renderer.render(_scene, _camera);
    }
}


function createRenderTarget(width, height, format, type, minFilter, magFilter) {
    var renderTarget = new THREE.WebGLRenderTarget(width || 1, height || 1, {
        format: THREE.RGBAFormat, // RGBA for transparency
        type: THREE.UnsignedByteType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        depthBuffer: true,
        stencilBuffer: false,
    });

    renderTarget.texture.generateMipmaps = false;

    return renderTarget;
}


function getColorState() {
    return {
        autoClearColor : _renderer.autoClearColor,
        clearColor : _renderer.getClearColor(new THREE.Color()).getHex(),
        clearAlpha : _renderer.getClearAlpha()
    };
}

function setColorState(state) {
    _renderer.setClearColor(state.clearColor, state.clearAlpha);
    _renderer.autoClearColor = state.autoClearColor;
}
