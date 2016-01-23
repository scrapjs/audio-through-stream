var Through = require('./');
var ctx = require('audio-context');
// var Source = require('audio-source');
// var Speaker = require('audio-speaker');
var Sink = require('audio-sink');
var AudioBuffer = require('audio-buffer');
var util = require('../audio-buffer-utils');
var pcm = require('pcm-util');
var Generator = require('audio-generator');
var isBrowser = require('is-browser');
// var test = it;
var test = require('tst').only();


test('PassThrough', function (done) {
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

});

test('Speed regulation', function () {
	if (!isBrowser) return;

	/*
	//create sound renderer
	var sourceNode = ctx.createBufferSource();
	sourceNode.loop = true;
	sourceNode.buffer = new AudioBuffer(2, pcm.defaults.samplesPerFrame);
	sourceNode.start();
	var scriptNode = ctx.createScriptProcessor(pcm.defaults.samplesPerFrame);
	scriptNode.onaudioprocess = function (e) {
		if (!buf) {
			//release blocking of the rendering stream.
			stream.resume();
		}

		if (buf) {
			//copy stream data (if any)
			util.copy(buf, e.outputData);
			buf = null;
		}

		stream.resume();
	};
	sourceNode.connect(scriptNode);
	scriptNode.connect(ctx.destination);
	*/

	var buf;

	//create pipe of sound processing streams with regulated speed
	var stream = Through(util.noise, {
		throttle: 1000
	})
	.pipe(Through(function (input) {
		//to bind stream handling to the realtime,
		//we need to defer pipe till the output is "thinking"
		buf = input;

		// self.pause();
	}));
});

test('WebAudioNode', function () {

});

test.skip('Errors in processing', function (done) {

});

test.skip('error', function (done) {

});

test.only('throttle', function (done) {
	this.timeout(false);
	var stream = Through(function (input) {
		// console.log('Generated', this.time);
		input.time = this.time;
	}, {
		throttle: 500
	})
	.pipe(Through(function (input) {
		// console.log('Received', input.time);
	}));
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