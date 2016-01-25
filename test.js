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
var assert = require('assert');
var Stream = require('stream');
var inherits = require('inherits');
var extend = require('xtend/mutable');
var test = require('tst')//.only();
// var test = it;



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
		// console.log('fin', data.length)
	}))
	// .pipe(Speaker())
});

test('Processor', function () {

});

test('Destination', function () {

});

test('Speed regulation', function (done) {
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


test.skip('pause/receive', function (done) {
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

	var stream = Through(function (input, done) {
		// console.log('Generated', this.time);
		input.time = this.time;

		if (this.count > 3000) this.end();

		setTimeout(done, 50);
	})
	.on('end', function () {
		assert.equal(count, 4);
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
	.pipe(Through())
	.pipe(Through(function (input, done) {
		// console.log('Received', input.time);
		count++;

		if (this.count > 3000) this.end();

		setTimeout(done, 50);
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


test.skip('Transform redefined', function () {
	//research on a weird bug of infinite generation
	//that happened if destination is unconnected and prev note automatically becomes sink
	//solved by sink "virginity" flag - once node is not sink, it is never a sink

	var id = 0;

	function Through (opts) {
		if (!(this instanceof Through)) return new Through(opts);

		this._id = id++;

		var self = this;
		Stream.Transform.call(self, {
			highWaterMark: 0,
			objectMode: true
		});

		//manage input pipes number
		self.on('pipe', function (source) {
			self.inputsCount++;
		}).on('unpipe', function (source) {
			self.inputsCount--;
		});
	}
	Through.prototype.inputsCount = 0;
	Object.defineProperties(Through.prototype, {
		outputsCount: {
			get: function () {
				return this._readableState.pipesCount
			},
			set: function (value) {
				throw Error('outputsCount is read-only');
			}
		}
	});
	extend(Through.prototype, pcm.defaults);


	Through.prototype._transform = function (chunk, enc, cb) {
		console.log(this._id, 'through', chunk.count);
		cb(null, chunk);
	};

	Through.prototype._write = function (chunk, enc, cb) {
		var self = this;
		if (self.outputsCount) {
			return Stream.Transform.prototype._write.call(self, chunk, enc, cb);
		}

		console.log(self._id, 'received', chunk.count)
		// setTimeout(function () {
			self.emit('data', chunk);
			cb();
		// }, 1000);
	};

	Through.prototype._read = function (size) {
		if (this.inputsCount) {
			return Stream.Transform.prototype._read.call(this, size);
		}

		count++
		this.push({count: count});
		console.log(this._id, 'generated', count);
	};

	Through.prototype.isPaused = function () {
		return false;
	};

	inherits(Through, Stream.Transform);


	var count = 0;

	Through()
	.pipe(Through())
	.pipe(Through());
});