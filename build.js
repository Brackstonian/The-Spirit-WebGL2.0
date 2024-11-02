const browserify = require('browserify');
const fs = require('fs');
const UglifyJS = require('uglify-js');

Promise.all(['index.js'].map(runBuild)).catch(function (err) {
  console.error(err);
}).then(function () {
  console.log("Finished");
});

function runBuild(f) {
  return new Promise(function (resolve, reject) {
    console.log('Bundling', f);
    var b = browserify('src/' + f, {
      debug: false,
    });
    b.plugin(require('bundle-collapser/plugin'));
    var transforms = [['glslify', { global: true }]];
    transforms.forEach(function (t) {
      b.transform(t);
    });
    b.bundle(function (err, src) {
      if (err) return reject(err);
      console.log('Compressing', f);
      var result = UglifyJS.minify(src.toString(), {
        compress: true,
        mangle: true
      });
      if (result.error) return reject(result.error);
      console.log('Writing', f);
      fs.mkdir('app/js', { recursive: true }, function(err) {
        if (err) return reject(err);
        fs.writeFile('app/js/' + f, result.code, function (err) {
          if (err) return reject(err);
          resolve();
        });
      });
    });
  });
}
