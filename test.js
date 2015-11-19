var Node = require('./');
// var Source = require('audio-source');
var Speaker = require('audio-speaker');
var Generator = require('audio-generator');

it('PassThrough', function (done) {
	Generator({duration: 0.5 })
	.pipe(Node())
	.pipe(Speaker())
	.on('end', done);
});