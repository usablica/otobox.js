#!/usr/bin/env node

var fs = require('fs'),
  compressor = require('node-minify');

new compressor.minify({
  type: 'gcc',
  fileIn: '../otobox.js',
  fileOut: '../minified/otobox.min.js',
  callback: function (err) {
    if (err) {
      console.log(err);
    } else {
      console.log("JS minified successfully.");
    }
  }
});

new compressor.minify({
  type: 'yui-css',
  fileIn: '../otobox.css',
  fileOut: '../minified/otobox.min.css',
  callback: function (err) {
    if (err) {
      console.log(err);
    } else {
      console.log("Main CSS minified successfully.");
    }
  }
});
