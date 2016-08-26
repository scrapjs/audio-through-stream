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


module.exports = Through;


var streamCount = 0;


/**
 * Display logs in console
 */
Through.log = false;


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

	//current processing time, in sound time
	self.time = 0;

	//passed frames counter
	self.frame = 0;

	//set of tasks to perform
	self._tasks = [];

	// //table of planned time events
	// self._plan = [];

	// //table of scheduled events
	// self._schedule = [];

	//handle options - which are the input format as well
	options = options || {};

	if (typeof fn === 'function') {
		options.process = fn;
	}
	//shift arguments (format-transform stream)
	else {
		format = options || {};
		options = fn || {};
	}

	//ensure input format
	var format = pcm.format(options);
	pcm.normalize(format);
	options.format = format;

	//take over options,
	extend(self, options);

	//ensure format values are present on self
	extend(self, self.format);

	//manage input pipes number
	self.on('pipe', function (source) {
		self.inputsCount++;

		//loose source virginity
		if (self.generator == null) self.generator = false;

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

	//detect if we need casting output to buffer (hits performance)
	if (self.writableObjectMode && (!to._writableState || !to._writableState.objectMode)) {
		self.writableObjectMode = false;
	}

	//lose sink virginity
	if (self.sink == null) self.sink = false;

	return Transform.prototype.pipe.call(self, to);
};


/**
 * Whether we need to cast AudioBuffer to Buffer in output.
 */
Through.prototype.writableObjectMode = true;


/**
 * Indicator of whether should be a sink.
 * Automatically set to false once the stream is connected to anything.
 */
Through.prototype.sink = undefined;

/**
 * Indicator whether it is a source
 * Auto-set to false once anything is connected to the stream.
 */
Through.prototype.generator = undefined;


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


Through.prototype.context = context;

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
 * TODO: Cancel planned time callback
 */
// Through.prototype.cancel = function (time, cb) {
// };



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

	//plan invocation of end
	self._tasks.push(function () {
		if (this.state === 'ended') return;

		this.state = 'ended';

		var triggered = false;
		this.once('end', function () {
			triggered = true;
		});
		Transform.prototype.end.call(this);

		//timeout cb, because native end emits after a tick
		var that = this;
		setTimeout(function () {
			if (!triggered) {
				that.emit('end');
			}
		});

		this.log('end');

		//FIXME: the case for that is when being connected to simple streams
		//this causes them throw error of after-write, weird.
		//I seems to be not the only who faced with that: https://twitter.com/yoshuawuyts/status/718256330197348356
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
	if (!Through.log) return self;

	var self = this;

	//ensure error format
	error = error instanceof Error ? error : Error(error);

	console.error(pfx(self), error.message);

	//emit error event
	self.emit('error', error);

	return self;
};


/**
 * Same as error, but for logging purposes
 */
Through.prototype.log = function () {
	if (!Through.log) return self;

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
	return '#' + self._id + ' ' + (now() - self._creationTime).toFixed(0) + 'ms';
};



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
	if (!isAudioBuffer(buffer)) buffer = pcm.toAudioBuffer(buffer, self.format);

	//provide hook
	self.emit('beforeProcess', buffer);

	//send buffer to processor - do sync or async altogether, define further steps after
	//because sync/async can vary
	//NOTE: why not promise? promise causes processor tick between executor and `then`.
	var result = self.process(buffer, _handleResult);

	//if expected more than one argument - execution was async (like mocha)
	//also if it is not a source and not destination with one arg - force awaiting the callback (no sinks by default)
	if (self.process.length === 2 || (!self.outputsCount && self.sink == false) ) {
		//but in case if result is not undefined - then it is still sync
		if (result === undefined) {
			return self;
		}
	}

	_handleResult(null, result);

	function _handleResult (err, result) {
		//ignore double-call of _handleResult (e. g. user mistakenly called 2 times)
		if (self.state === 'ended') return;

		//handle error
		if (err) {
			self.error(err);
		}

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
				_handleResult(null, result);
			}, self.error);

			return;
		}

		//update counters
		self.frame++;
		self.count += result.length;
		self.time = self.count / self.format.sampleRate;

		//hook
		self.emit('afterProcess', result);

		//convert to buffer, if at least one output is natural node-stream
		if (!self.writableObjectMode && isAudioBuffer(result)) {
			result = pcm.toBuffer(result, self.format);
		}

		//release data
		cb(err, result);

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

	self._process(chunk, function (err, result) {
		cb(err, result);
	});
};


/**
 * Generator method
 */
Through.prototype._read = function (size) {
	var self = this;

	//once been read - no more sink
	if (self.sink == null) self.sink = false;

	//in-middle case - be a transformer
	//note that once it was a transformer - it will always remain a transformer
	if (self.inputsCount || self.generator == false) {
		return Transform.prototype._read.call(self, size);
	}

	//create buffer of needed size
	var buffer = new AudioBuffer(self.format.samplesPerFrame);

	//generate new chunk with silence
	self._process(buffer, function (err, result) {
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

	//once been written - no more generator
	if (self.generator == null) self.generator = false;

	//be a transformer, if in-between
	if (self.outputsCount) {
		return Transform.prototype._write.call(self, chunk, enc, cb);
	}

	//if no outputs but some inputs - be a sink
	self._process(chunk, function (err, result) {
		self.emit('data', result);
		cb();
	});
};
