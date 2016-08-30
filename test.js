var Through = require('./');
var ctx = require('audio-context');
var Sink = require('stream-sink');
var AudioBuffer = require('audio-buffer');
var util = require('audio-buffer-utils');
var pcm = require('pcm-util');
var Generator = require('audio-generator');
var isBrowser = require('is-browser');
var assert = require('assert');
var Stream = require('stream');
var inherits = require('inherits');
var extend = require('xtend/mutable');
var Readable = require('stream').Readable;
var Writable = require('stream').Writable;
var test = require('tst');
var ASink = require('audio-sink');
var Speaker = require('audio-speaker');
var WAAStream = require('web-audio-stream');


Through.log = true;



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
		return input;
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
		console.log('fin', data.length)
	}))
	// .pipe(WAAStream(context.destination))
	// .pipe(Speaker())
});

test('Processor', function () {

});

test('Destination', function () {

});

test('Pressure regulation', function (done) {
	if (!isBrowser) return done();

	var buf, resume;

	//create sound renderer
	var sourceNode = ctx.createBufferSource();
	sourceNode.loop = true;
	sourceNode.buffer = new AudioBuffer(2, pcm.defaults.samplesPerFrame);
	sourceNode.start();
	var scriptNode = ctx.createScriptProcessor(pcm.defaults.samplesPerFrame);
	scriptNode.onaudioprocess = function (e) {
		buf = e.outputBuffer;

		//release stream
		resume && resume();

		if (e.playbackTime > 0.15) {
			done();
			scriptNode.disconnect();
		}
	};
	sourceNode.connect(scriptNode);
	scriptNode.connect(ctx.destination);


	var buf;

	//create pipe of sound processing streams with regulated speed
	var stream = Through(util.noise)
	.pipe(Through(function (input, cb) {
		//place buffer to the output, if any
		if (buf) util.copy(input, buf);

		resume = cb;
	}));
});


test.skip('pause/resume', function (done) {
	//Use-case for this test is obsolete.
	//Use process function callback for that, redefining these methods is not a good idea

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


test('Connected to AudioNode', function (done) {
	if (!isBrowser) return done();

	var count = 0;

	//create pipe of sound processing streams with regulated speed
	Through(util.noise, {context: ctx})
	.pipe(ASink(function (data, cb) {
		setTimeout(cb, 50);

		count++;
		if (count > 10) this.end();
	}))
	.pipe(WAAStream({ context: ctx }))
	.connect(ctx.destination);

	setTimeout(done, 1000);
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

	var stream = Through(function (input, done) {
		// console.log('Generated', this.time);
		input.time = this.time;

		if (this.count > 3000) this.end();

		setTimeout(done, 50);
	})
	.on('end', function () {
		assert.equal(count, 3);
		done();
	})
	.pipe(Through(function (input) {
		// console.log('Received', input.time);
		count++;
	}));

});

test('pipe to non-object stream', function (done) {
	this.timeout(false);

	var count = 0;

	var stream = Through(function (input) {
		// console.log('Generated', this.time);
		input.time = this.time;
	})
	.pipe(Stream.PassThrough({
		highWaterMark: 0
	}))
	.pipe(Through(function (input, done) {
		// console.log('Received', input.time);
		count++;

		if (this.count > 3000) this.end();

		done();
	}))
	.on('end', function () {
		assert.equal(count, 4);
		done();
	});
})

test('throttle destination', function (done) {
	this.timeout(false);

	var count = 0;

	Through(function (input) {
		// console.log('Generated', this.time);
		input.time = this.time;
	})
	.pipe(Through(
		function (input) {}
	))
	.pipe(Through(function (input, done) {
		// console.log('Received', input.time);
		count++;

		if (this.count > 3000) {
			this.end();
		}

		done();
		// setTimeout(done, 50);
	}))
	.on('end', function () {
		assert.equal(count, 4);
		done();
	});
});

test('beforeProcess, afterProcess hooks', function () {

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

test.skip('timeDelta, frameCount and other inner vars', function (done) {
	this.timeout(10e5);

	Through(function(chunk, done) {
		assert(this.timeDelta >= 0);
		assert(this.timeLapse >= 0);
		assert(this.frame >= 0);

		if (this.frame > 4) {
			//:( ☞ done(null, null);
		}

		setTimeout(done, 10);
	})
	.on('end', function () {
		done();
	})
	.pipe(Through());
});

test('sync/async turns', function (done) {
	this.timeout(10e5);

	Through(function(chunk, done) {
		if (this.time > 0.1) {
			return null
		}

		setTimeout(done, 10);
	})
	.on('end', function () {
		done();
	})
	.pipe(Through());
});

test('returning null stops stream', function (done) {
	var count = 0;
	Through(function () {
		if ( count >= 2 ) return null;
	})
	.on('end', function () {
		assert.equal(count, 2);
		done();
	})
	.on('data', function () {
		count++;
	})
	.pipe(Sink());
});

test.skip('convert pcm format', function (done) {
	//that is the only use-case for the bad API with input/output format.
	//if user need transformations - he should use pcm-transform or alike.
	this.timeout(Infinity);

	var n = 0;

	Readable({
		read: function (size) {
			var arr = new Float32Array(1024);
			arr.fill(1);
			var aBuf = new AudioBuffer(1, arr);

			var buf = pcm.toBuffer(aBuf, {
				float: true
			});

			if (n++ > 10) return this.push(null);
			this.push(buf);
		}
	})
	.on('end', done)
	.pipe(Through({
		channels: 1,
		float: true
	}, {
		channels: 1,
		float: false
	}))
	.pipe(Writable({
		write: function (chunk, enc, cb) {
			assert.equal(chunk.readInt16LE(0), 32767);
			cb();
			// setTimeout(cb, 1000);
		}
	}));
});


test('through-to-through', function () {
	Through(function () {
		if (this.time > 0.1) {
			return null;
		}
	})
	.pipe(Through(
		function (chunk) {
		}
	))
	.pipe(Writable({
		write: function (chunk, enc, cb) {
			setTimeout(cb, 0);
		}
	}))
});


test('various frame size', function () {
	Through(function () {
		if (this.time > 0.2) {
			return null;
		}
	}, {
		samplesPerFrame: 512
	})
	.pipe(Through(
		function (chunk) {
		}
	), {
		samplesPerFrame: 512
	})
	.pipe(Writable({
		write: function (chunk, enc, cb) {
			setTimeout(cb, 0);
		}
	}))
});

test('no autogenerator', function (done) {
	var count = 0;

	Through(function (buffer) {
		if (this.frame >= 2) this.end();
	}, {
		generator: false
	}).on('data', function () {count++}).pipe(Sink());

	setTimeout(function () {
		assert.equal(count, 0);
		done();
	}, 100);
});

test('sync error', done => {
	Through(b => {
		return Error(123)
	}).on('error', function (e) {
		assert(e.message == 123);
		this.end();
		done();
	}).pipe(Through());

	Through(b => {
		throw Error(123)
	}).on('error', function (e) {
		assert(e.message == 123);
		this.end();
		done();
	}).pipe(Through());
});
