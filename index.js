/**
 * Abstract audio node class.
 *
 * @module audio-node
 */


var Transform = require('stream').Transform;
var pcm = require('pcm-util');
// var find = require('array-find');
var inherits = require('inherits');
var extend = require('xtend/mutable');
var isPromise = require('is-promise');
var context = require('audio-context');
var AudioBuffer = require('audio-buffer');
var isAudioBuffer = require('is-audio-buffer');
var getUid = require('get-uid');
var now = require('performance-now');
var chalk = require('chalk');


module.exports = AudioNode;


var streamCount = 0;


/**
 * Create audio processor
 *
 * @constructor
 */
function AudioNode (processor, options) {
	if (!(this instanceof AudioNode)) return new AudioNode(processor, options);

	var self = this;

	//save started processing time
	self._creationTime = now();

	Transform.call(self, {
		//we need object mode to share passed AudioBuffer between piped streams
		objectMode: true,

		//to keep processing delays very short, in case if we need RT binding.
		//otherwise stream will hoard data and release only when it’s full.
		highWaterMark: 1
	});

	//just get unique id
	self._id = streamCount++;
	// self.log('create', self._id);

	//passed data count
	self.count = 0;

	//current processing time
	self.time = 0;


	// //table of planned time events
	// self._plan = [];

	// //table of scheduled events
	// self._schedule = [];

	//redefine _process method
	if (processor) {
		self._process = processor;
	}

	//take over options
	extend(self, options);

	//normalize format
	pcm.normalize(self);

	//manage input pipes number
	self.on('pipe', function (source) {
		self.inputsCount++;

		//manage end
		self.on('end', function () {
			source.unpipe(self)
		});

		//manage pipes
		self.on('resume', function () {
			source.resume();
		});
		self.on('pause', function () {
			source.pause();
		});
	}).on('unpipe', function (source) {
		self.inputsCount--;
	});

	//set state active
	self.state = 'normal';
}


/**
 * Set duplex behaviour
 */
inherits(AudioNode, Transform);


/**
 * Number active input connections
 */
AudioNode.prototype.inputsCount = 0;


Object.defineProperties(AudioNode.prototype, {
	/**
	 * Number of active output connections
	 */
	outputsCount: {
		get: function () {
			return this._readableState.pipesCount
		},
		set: function (value) {
			throw Error('outputsCount is read-only');
		}
	}
});


/**
 * PCM-stream format, not affected if nodes are connected in WAA
 */
extend(AudioNode.prototype, pcm.defaults);



/**
 * Current state of audio node, spec + extended by the methods.
 *
 * normal
 * paused
 * ended
 *
 * playing
 * connection
 * tail-time
 * muted
 * error
 * processing/waiting?
 * limit?
 * solo?
 * playing?
 */
AudioNode.prototype.state = undefined;


/**
 * Plan callback on time or event
 */
// AudioNode.prototype.on = function (time, cb) {
// 	var self = this;

// 	//if number - plan timed event
// 	if (typeof time === 'number') {
// 		var idx = find(this._plan, function (el, i) {
// 			return el[0] > time;
// 		});
// 		if (!idx) idx =
// 		this._plan.splice(idx, 0, [time, cb]);
// 	}
// 	//simple on
// 	else {
// 		self.on(time, cb);
// 	}

// 	return self;
// };


/**
 * Plan callback each N seconds
 */
// AudioNode.prototype.schedule = function (interval, offset, cb) {
// 	var self = this;

// 	if (typeof offset === 'Function') {
// 		cb = offset;
// 		offset = 0;
// 	}

// 	// var idx = self._schedule.
// };


/**
 * Cancel planned callback/event
 */
// AudioNode.prototype.off = function (event, cb) {
// 	var self = this;

// 	self.removeListeners(event, cb);
// };


/**
 * Cancel planned time callback
 */
// AudioNode.prototype.cancel = function (time, cb) {
// };


/**
 * Resume handling
 */
AudioNode.prototype.resume = function () {
	var self = this;

	//NOTE: this method is used innerly as well, so we can’t really redefine it’s behaviour
	if (self.state === 'ended') return self;

	self.state = 'normal';

	//FIXME: a shitstory of ensuring the resume event is triggered
	var isTriggered = false;
	self.once('resume', function () {
		isTriggered = true;
	});

	//NOTE: ↓ emits `resume`, in case if actually resumed
	Transform.prototype.resume.call(self);

	//force emitting the event, if the readable above ignored it
	if (!isTriggered) {
		self.emit('resume');
	}

	return self;
};


/**
 * Pause handling.
 */
AudioNode.prototype.pause = function (time) {
	var self = this;
	// self.log('pause');

	if (self.state === 'ended') return self;

	self.state = 'paused';

	//FIXME: a shitstory of ensuring the resume event is triggered
	var isTriggered = false;
	self.once('pause', function () {
		isTriggered = true;
	});

	//call pause if stream is a source only.
	//FIXME: because if user pauses manually controlling stream - it causes generating twice
	//not sure why
	if (!self.inputsCount) {
		Transform.prototype.pause.call(self);
	}

	if (!isTriggered) {
		self.emit('pause');
	}

	return self;
};


/**
 * Indicate whether it is paused
 * (just overrides the Through’s method)
 */
AudioNode.prototype.isPaused = function (time) {
	var self = this;
	return self.state === 'paused';
};


/**
 * Supposed that isn’t started by default.
 * Called automatically by pipe.
 */
// AudioNode.prototype.start = function () {

// };


/**
 * Close audio node with final passed audiobuffer.
 * Overrides stream’s end.
 *
 * @param {AudioBuffer|Buffer} chunk final data
 */
AudioNode.prototype.end = function (chunk) {
	var self = this;

	if (self.state === 'ended') return self;

	//release planned guys
	clearTimeout(self._throttleTimeout);

	//FIXME quite ugly check.
	//`Transform.prototype.end` below calls `end` for all the further piped streams
	//and if they are also audio-through, they have non-zero `inputCount`
	//but the cannot be called `end` as such
	// if (self.inputsCount) {
	// 	if (self._processCb) {
			// return self.error('Cannot end non-source stream.');
	// 	}
	// }

	self.state = 'ended';

	//release callback, if any
	self._handleResult(chunk);

	Transform.prototype.end.call(this);
	// self.log('ended');

	self.emit('end');

	//FIXME: the case for that is being connected to simple streams
	//this causes them throw error of after-write, weird.
	self.unpipe();

	return self;
};


/**
 * Throw inobstructive error. Does not stop stream.
 */
AudioNode.prototype.error = function (error) {
	var self = this;

	//ensure error format
	error = error instanceof Error ? error : Error(error);

	console.error(self.pfx(), chalk.red(error.message));

	return self;
};


/**
 * Same as error, but for logging purposes
 */
AudioNode.prototype.log = function () {
	var self = this;
	var args = [].slice.call(arguments);
	var str = [].join.call(args, ' ');
	console.log(self.pfx(), str);
	return self;
};


/**
 * Return prefix for logging
 */
AudioNode.prototype.pfx = function () {
	var self = this;
	return chalk.gray('#' + self._id + ' ' + (now() - self._creationTime).toFixed(0) + 'ms');
};


/**
 * Fade out the node
 */
// AudioNode.prototype.mute = function () {
// };


/**
 * Fade out all other nodes
 */
// AudioNode.prototype.solo = function () {
// };


/**
 * Meditate for a processor tick each N ms.
 * Needed to slow down sink performance - otherwise it will just flush all the data w/o pauses, which will block main thread.
 * Also useful for debugging, where you want to see the chunk data. Just set throttle = 1000 to handle 1 chunk a second.
 */
AudioNode.prototype.throttle = false;


/**
 * Processing method, supposed to be overridden.
 * Basically provides a chunk with data and expects user to fill that.
 * If returned a promise, then will wait till it is resolved.
 */
AudioNode.prototype._process = function (buffer) {};


/**
 * Invoke _process for a chunk.
 */
AudioNode.prototype._callProcess = function (buffer, cb) {
	var self = this;
	// self.log('_call', self.state)

	//handle throttling
	if (self.throttle || self.state === 'paused') {
		//if is paused - plan processing after being release
		//FIXME: potential issue if lots of _callProcesses being called during the pause
		//as such it is placing work of buffers to the events stack.
		if (self.state === 'paused' && !self._plannedCall) {
			self.once('resume', function () {
				self._callProcess(buffer, cb);
				self._plannedCall = true;
			});
			return self;
		}

		self._plannedCall = false;
	}

	//ensure buffer is AudioBuffer
	//FIXME: detect passed buffer format - not necessarily planar/2/etc
	if (!isAudioBuffer(buffer)) buffer = pcm.toAudioBuffer(buffer, self);

	//save awaiting cb
	self._processCb = cb;
	self._processBuffer = buffer;

	//send buffer to processor
	var result = self._process(buffer);

	//if ended during the processing - just clear everything, ignore the chunk as it is not actual anymore
	if (self.state === 'ended') {
		return;
	}

	//just set throttle flag for N ms, if required
	if (self.throttle) {
		if (self.inputsCount) {
			self.pause();
			self._handleResult(result);
		}
		//FIXME: In source-streams we need to call pause after releasing result
		else {
			self._handleResult(result);
			self.pause();
		}

		self._throttleTimeout = setTimeout(function () {
			self.resume();
		}, self.throttle);
	} else {
		//handle the result
		self._handleResult(result);
	}
};


/**
 * Result handler
 */
AudioNode.prototype._handleResult = function (result) {
	var self = this;

	//if no return - then user is wisely just modified input buffer
	if (!result) {
		result = self._processBuffer;
	}

	//if returned a promise - wait
	if (isPromise(result)) {
		result.then(function (result) {
			self._handleResult(result);
		}, self.error);

		return;
	}

	//if the state changed during the processing, like, end called - ignore cb
	//FIXME: test out other cases here, not only `ended` state
	// if (self.state === 'ended') {
	// 	return;
	// }

	if (self._processCb) {
		//TODO: detect whether we need to cast audioBuffer to buffer (connected 2 at least one plain stream)
		// if (isAudioBuffer(result)) result = pcm.toBuffer(result, self.format);
		self._processCb(result);
		self._processCb = null;
	}

	self._processBuffer = null;


	//update counters
	if (result) {
		self.count += result.length;
		self.time = self.count / self.sampleRate;
	}
};


/**
 * Transformer method
 */
AudioNode.prototype._transform = function (chunk, enc, cb) {
	var self = this;

	//ignore bad states
	if (self.state === 'ended') return;

	self._callProcess(chunk, function (chunk) {
		cb(null, chunk);
	});
};


/**
 * Generator method
 */
AudioNode.prototype._read = function (size) {
	var self = this;

	// self.log('_read')

	//ignore bad states
	if (self.state === 'ended') {
		return;
	}

	//if no inputs but are outputs - be a generator
	if (!self.inputsCount && self.outputsCount) {
		//create buffer of needed size
		var buffer = new AudioBuffer(self.samplesPerFrame);

		//generate new chunk with silence
		self._callProcess(buffer, function (chunk) {
			self.push(chunk);
		});
	}

	//else be a transformer
	else {
		Transform.prototype._read.call(this, size);
	}
};


/**
 * Sink method
 */
AudioNode.prototype._write = function (chunk, enc, cb) {
	var self = this;

	// self.log('_write')

	//ignore bad states (like, ended in between)
	if (self.state === 'ended') return;

	//if no outputs but some inputs - be a sink
	if (!self.outputsCount && self.inputsCount) {
		self._callProcess(chunk, function (a, b) {
			//just emulate data event
			self.emit('data', chunk);
			cb();
		});
	}

	//else be a transformer
	else {
		Transform.prototype._write.call(self, chunk, enc, cb);
	}
};