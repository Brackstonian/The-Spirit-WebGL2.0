let settings = require('../core/settings');

exports.pass = pass;

let _callback;

function pass(func) {
    // if(settings.isMobile) {
        // _callback = func;
        // init();
    // } else {
        func();
    // }
}

let _container;
let _bypass;

function init() {
    //_container = document.querySelector('.mobile');
    //_container.style.display = 'block';

    //_bypass = document.querySelector('.mobile-bypass');
    //if(_bypass) _bypass.addEventListener('click', _onByPassClick);
}

function _onByPassClick() {
    //_container.parentNode.removeChild(_container);
    _callback();
}
