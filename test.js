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
var assert = require('assert');


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
		// console.log(data.length)
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
			this.end();
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

test.only('Speed regulation', function () {
	if (!isBrowser) return;

	var buf;

	//create sound renderer
	var sourceNode = ctx.createBufferSource();
	sourceNode.loop = true;
	sourceNode.buffer = new AudioBuffer(2, pcm.defaults.samplesPerFrame);
	sourceNode.start();
	var scriptNode = ctx.createScriptProcessor(pcm.defaults.samplesPerFrame);
	scriptNode.onaudioprocess = function (e) {
		buf = e.outputBuffer;

		//release stream
		stream.resume();
	};
	sourceNode.connect(scriptNode);
	scriptNode.connect(ctx.destination);


	var buf;

	//create pipe of sound processing streams with regulated speed
	var stream = Through(function (input) {
		util.noise(input);
		console.log('gen');
	}, {
		// throttle: 1000
	})
	.pipe(Through(function (input) {
		console.log('send');

		//place buffer to the output, if any
		if (buf) util.copy(input, buf);

		//to bind stream handling to the realtime,
		//we need to defer pipe till the output is "thinking"
		this.pause();
	}));
});


test('pause/receive', function (done) {
	this.timeout(false);

	//create pipe of sound processing streams with regulated speed
	var stream = Through(function (input) {
		var self = this;

		input.time = self.time;
		self.log('generate', self.time);

		//NOTE: calling pause here means that chunk will not be sent
		// self.pause();
		// setTimeout(function () {
		// 	self.resume();
		// }, 1000);
	}, {
		// throttle: 1000
	})
	.pipe(Through(function (input) {
		var self = this;
		self.log('receive', input.time)

		self.pause();
		setTimeout(function () {
			self.resume();
		}, 1000);
	}));
});

test.skip('WebAudioNode', function () {

});

test('Connected to simple node');
test('Connected from simple node');

test.skip('Errors in processing', function (done) {

});

test.skip('error', function (done) {

});

test('throttle source', function (done) {
	this.timeout(false);

	var count = 0;

	var stream = Through(function (input) {
		console.log('Generated', this.time);
		input.time = this.time;

		if (this.count > 3000) this.end();
	}, {
		throttle: 100
	})
	.on('end', function () {
		assert.equal(count, 4);
		done();
	})
	.pipe(Through(function (input) {
		console.log('Received', input.time);
		count++;
	}));

});

test('throttle destination', function (done) {
	this.timeout(false);

	var count = 0;

	var stream = Through(function (input) {
		console.log('Generated', this.time);
		input.time = this.time;
	})
	.pipe(Through())
	.pipe(Through(function (input) {
		console.log('Received', input.time);
		count++;

		if (this.count > 3000) this.end();
	}, {
		throttle: 100
	}))
	.on('end', function () {
		assert.equal(count, 4);
		done();
	});
});

test('single stream does not start generating, only when piped');

test.skip('mute', function () {

});

test.skip('solo', function () {

});

test.skip('schedule', function () {

});

test.skip('Multiple inputs', function () {

});

test.skip('Multiple outputs', function () {

});

test.skip('pause/resume', function () {

});

test.skip('end', function () {

});