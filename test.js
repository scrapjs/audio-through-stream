var Through = require('./');
// var Source = require('audio-source');
// var Speaker = require('audio-speaker');
var Sink = require('audio-sink');
var AudioBuffer = require('audio-buffer');
var util = require('audio-buffer-utils');
var Generator = require('audio-generator');
// var test = it;
var test = require('tst').only();


test.only('PassThrough', function (done) {
	Through(function (input) {
		if (this.time > 0.1) {
			this.end();
		}
	})
	.on('end', done)
	.pipe(Through())
	.pipe(Through(function () {
		// this.end();
	}))
	.pipe(Through(function (input) {
		return input
	}))
	.pipe(Sink(function (data) {
		console.log(data.length)
	}));
});

test('Source', function (done) {
	//weird-saw wave generator
	Through(function (input) {
		var len = 1024;

		util.fill(input, function (value, channel, idx) {
			if (channel === 1) {
				return 1 - idx/len * 2;
			}
			return idx/len * 2 - 1;
		});

		if (this.time > 0.1) {
			this.end(input);
		}
	})
	.on('end', done)
	.pipe(Sink(function (data) {
		// console.log('fin', data.length)
	}))
	// .pipe(Speaker())
});

test('Processor', function () {

});

test('Destination', function () {
	Through(function (input) {

	}).pipe(Through(function (input) {

	}));
});

test('WebAudioNode', function () {

});

test.skip('Errors in processing', function (done) {

});

test.skip('error', function (done) {

});

test('throttle', function () {

});

test('mute', function () {

});

test('solo', function () {

});

test('schedule', function () {

});

test('Multiple inputs', function () {

});

test('Multiple outputs', function () {

});

test('pause/resume', function () {

});

test('end', function () {

});