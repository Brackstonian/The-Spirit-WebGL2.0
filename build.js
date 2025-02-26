const browserify = require('browserify');
const fs = require('fs');
const UglifyJS = require('uglify-js');
const chokidar = require('chokidar');

function build() {
  console.log('\nStarting build...');
  Promise.all(['index.js'].map(runBuild))
    .catch(function (err) {
      console.error(err);
    })
    .then(function () {
      console.log("Finished");
    });
}

function runBuild(f) {
  return new Promise(function (resolve, reject) {
    console.log('Bundling', f);
    var b = browserify('src/' + f, {
      debug: false,
      standalone: 'spiritWebgl',
    });

    b.transform('babelify', {
      presets: ['@babel/preset-env'],
    });

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
      fs.mkdir('app/', { recursive: true }, function (err) {
        if (err) return reject(err);
        fs.writeFile('app/' + f, result.code, function (err) {
          if (err) return reject(err);
          resolve();
        });
      });
    });
  });
}



const isWatch = process.argv.includes('--watch') || process.argv.includes('-w');

if (isWatch) {
  console.log('Watching for changes...');

  const watcher = chokidar.watch('src/**/*', {
    ignored: /(^|[\/\\])\../,
    persistent: true
  });

  watcher
    .on('ready', () => {
      console.log('Initial scan complete. Ready for changes.');
      build(); // Initial build
    })
    .on('change', path => {
      console.log(`File ${path} has been changed`);
      build();
    })
    .on('add', path => {
      console.log(`File ${path} has been added`);
      build();
    })
    .on('unlink', path => {
      console.log(`File ${path} has been removed`);
      build();
    })
    .on('error', error => {
      console.error('Error happened', error);
    });
} else {
  build();
}