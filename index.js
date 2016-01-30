/**
 * @module audio-through
 */

var Transform = require('stream').Transform;
var pcm = require('pcm-util');
var inherits = require('inherits');
var extend = require('xtend/mutable');
var isPromise = require('is-promise');
var context = require('audio-context');
var AudioBuffer = require('audio-buffer');
var isAudioBuffer = require('is-audio-buffer');
var now = require('performance-now');
var chalk = require('chalk');


module.exports = Through;


var streamCount = 0;


/**
 * Create stream instance
 *
 * @constructor
 */
function Through (fn, options) {
	if (!(this instanceof Through)) return new Through(fn, options);

	var self = this;

	//save started processing time
	self._creationTime = now();

	Transform.call(self, {
		//we need object mode to share passed AudioBuffer between piped streams
		objectMode: true,

		//to keep processing delays very short, in case if we need RT binding.
		//otherwise each stream will hoard data and release only when it’s full.
		highWaterMark: 0
	});

	//just get unique id
	self._id = streamCount++;
	// self.log('create', self._id);

	//passed data count
	self.count = 0;

	//current processing time
	self.time = 0;

	//set of tasks to perform
	self._tasks = [];

	// //table of planned time events
	// self._plan = [];

	// //table of scheduled events
	// self._schedule = [];

	//handle options
	options = options || {};

	if (typeof fn === 'function') {
		options.process = fn;
	}
	else {
		options = fn;
	}

	//take over options, mostly the format ones
	extend(self, options);

	//normalize format
	pcm.normalize(self);

	//manage input pipes number
	self.on('pipe', function (source) {
		self.inputsCount++;
	}).on('unpipe', function (source) {
		self.inputsCount--;
	});

	//set state active
	self.state = 'normal';
}


/**
 * Set duplex behaviour
 */
inherits(Through, Transform);


/**
 * Number of active input connections
 */
Through.prototype.inputsCount = 0;


Object.defineProperties(Through.prototype, {
	/**
	 * Number of active output connections - exists in readable stream
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
 * Extend piping
 */
Through.prototype.pipe = function (to) {
	var self = this;

	//detect if we need casting output to buffer (decreases performance)
	if (self.writableObjectMode && !to._writableState.objectMode) {
		self.writableObjectMode = false;
	}

	//loose sink virginity
	if (!self.sink) self.sink = false;

	return Transform.prototype.pipe.call(self, to);
};


/**
 * Whether we need to cast AudioBuffer to Buffer in output.
 */
Through.prototype.writableObjectMode = true;


/**
 * Indicator of whether it is sink.
 * Automatically set to false once the stream is connected to anything.
 */
Through.prototype.sink = true;


/**
 * PCM-stream buffer format to parse from input or cast to output
 */
extend(Through.prototype, pcm.defaults);


/**
 * Current state of audio node, spec + extended by the methods.
 *
 * normal
 * ended
 *
 * playing?
 * connection?
 * tail-time?
 * muted?
 * error?
 * processing/waiting?
 * limit?
 * solo?
 * playing?
 */
Through.prototype.state = undefined;


/**
 * TODO: Plan callback on time or event
 */
// Through.prototype.on = function (time, cb) {
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
 * TODO: Plan callback each N seconds
 */
// Through.prototype.schedule = function (interval, offset, cb) {
// 	var self = this;

// 	if (typeof offset === 'Function') {
// 		cb = offset;
// 		offset = 0;
// 	}

// 	// var idx = self._schedule.
// };


/**
 * TODO: Cancel planned callback/event
 */
// Through.prototype.off = function (event, cb) {
// 	var self = this;

// 	self.removeListeners(event, cb);
// };


/**
 * TODO: Cancel planned time callback
 */
// Through.prototype.cancel = function (time, cb) {
// };


/**
 * TODO: Resume handling
 */
/*
Through.prototype.resume = function () {
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
*/


/**
 * TODO: Pause handling.
 */
/*
Through.prototype.pause = function (time) {
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
*/


/**
 * TODO: Indicate whether it is paused
 * (just overrides the Through’s method)
 */
/*
Through.prototype.isPaused = function (time) {
	var self = this;
	return self.state === 'paused';
};
*/



/**
 * Plan stream closing.
 * Overrides stream’s end.
 */
Through.prototype.end = function () {
	var self = this;

	//plan invokation of end
	self._tasks.push(function () {
		if (this.state === 'ended') return;

		this.state = 'ended';

		var triggered = false;
		this.once('ended', function () {
			triggered = true;
		});
		Transform.prototype.end.call(this);
		!triggered && this.emit('end');

		this.log('end');

		//FIXME: the case for that is when being connected to simple streams
		//this causes them throw error of after-write, weird.
		this.unpipe();
	});

	return self;
};


/**
 * Just call the planned tasks
 */
Through.prototype.doTasks = function () {
	var self = this;
	var task;
	while(task = self._tasks.shift()) {
		task.call(self);
	}
	return self;
};


/**
 * Throw inobstructive error. Does not stop stream.
 */
Through.prototype.error = function (error) {
	var self = this;

	//ensure error format
	error = error instanceof Error ? error : Error(error);

	console.error(pfx(self), chalk.red(error.message));

	return self;
};


/**
 * Same as error, but for logging purposes
 */
Through.prototype.log = function () {
	var self = this;
	var args = [].slice.call(arguments);
	var str = [].join.call(args, ' ');
	console.log(pfx(self), str);
	return self;
};


/**
 * Return prefix for logging
 */
function pfx (self) {
	return chalk.gray('#' + self._id + ' ' + (now() - self._creationTime).toFixed(0) + 'ms');
};


/**
 * TODO: Fade out the node
 */
// Through.prototype.mute = function () {
// };


/**
 * TODO: Fade out all other nodes
 */
// Through.prototype.solo = function () {
// };


/**
 * Processing method, supposed to be overridden.
 * Basically provides a chunk with data and expects user to fill that.
 * If returned a promise, then will wait till it is resolved.
 */
Through.prototype.process = function (buffer) {};


/**
 * Invoke _process for a chunk.
 */
Through.prototype._process = function (buffer, cb) {
	var self = this;

	//ensure buffer is AudioBuffer
	if (!isAudioBuffer(buffer)) buffer = pcm.toAudioBuffer(buffer, self);

	//provide hook
	self.emit('beforeProcess', buffer);

	//send buffer to processor
	//NOTE: why not promise? promise causes processor tick between executor and `then`.
	//if expected more than one argument - make execution async (like mocha)
	//also if it lost sink virginity - force awaiting the callback (no sinks by default)
	if (!self.sink || self.process.length === 2) {
		self.process(buffer, _handleResult);
		return;
	}

	//otherwise - do sync processing
	var result = self.process(buffer);

	_handleResult(result);

	function _handleResult (result) {
		//if result is null - just finish the processing
		if (result === null) {
			return self.end().doTasks();
		}

		//if no return - then user is wisely just modified input buffer
		if (!result) {
			result = buffer;
		}

		//if returned a promise - wait
		if (isPromise(result)) {
			result.then(function (result) {
				_handleResult(result);
			}, self.error);

			return;
		}

		//update counters
		self.count += result.length;
		self.time = self.count / self.sampleRate;

		//provide hook
		self.emit('afterProcess', result);

		//convert to buffer, if at least one output is natural node-stream
		if (!self.writableObjectMode && isAudioBuffer(result)) {
			result = pcm.toBuffer(result, self);
		}

		//release data
		cb(result);

		//do planned tasks, if any
		self.doTasks();
	};
};


/**
 * Transformer method
 */
Through.prototype._transform = function (chunk, enc, cb) {
	var self = this;

	//ignore bad states
	if (self.state === 'ended') return;

	self._process(chunk, function (result) {
		cb(null, result);
	});
};


/**
 * Generator method
 */
Through.prototype._read = function (size) {
	var self = this;

	//in-middle case - be a transformer
	if (self.inputsCount) {
		return Transform.prototype._read.call(self, size);
	}

	//create buffer of needed size
	var buffer = new AudioBuffer(self.samplesPerFrame);

	//generate new chunk with silence
	self._process(buffer, function (result) {
		self.push(result);
	});
};


/**
 * Sink method
 */
Through.prototype._write = function (chunk, enc, cb) {
	var self = this;

	//ignore bad states (like, ended in between)
	if (self.state === 'ended') return;

	//be a transformer, if in-between
	if (self.outputsCount) {
		return Transform.prototype._write.call(self, chunk, enc, cb);
	}

	//if no outputs but some inputs - be a sink
	self._process(chunk, function (result) {
		self.emit('data', result);
		cb();
	});
};