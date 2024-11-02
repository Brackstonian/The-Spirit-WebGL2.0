const budo = require('budo');
const path = require('path');
const opn = require('opn');
const fs = require('fs');
const simpleHtml = require('simple-html-index');

var entryPath = path.resolve('src', 'index.js');
budo(entryPath, {
    serve: 'js/index.js',
    live: true,
    dir: __dirname + '/app',
    stream: process.stdout,
    defaultIndex: function (opt) {
        var html = 'index.html';
        if (!fs.existsSync(html)) return simpleHtml(opt);
        return fs.createReadStream(html);
    },
    browserify: {
        transform: [
            ['installify', { save: true }],
            ['glslify', { global: true }]
        ],
        debug: true,
        insertGlobalVars: {
            THREE: function () {
                return 'require("three")';
            }
        }
    }
}).on('connect', function (ev) {
    const uri = ev.uri + 'index.html';
    opn(uri);
});
