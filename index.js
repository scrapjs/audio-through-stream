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


module.exports = Through;


var streamCount = 0;


/**
 * Create audio processor
 *
 * @constructor
 */
function Through (processor) {
	if (!(this instanceof Through)) return new Through(processor);

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

	// //table of planned time events
	// self._plan = [];

	// //table of scheduled events
	// self._schedule = [];

	//redefine _process method
	if (processor) {
		self.process = processor;
	}

	//take over options
	// extend(self, options);

	//normalize format
	pcm.normalize(self);

	//manage input pipes number
	self.on('pipe', function (source) {
		self.inputsCount++;

		//manage end
		// self.on('end', function () {
		// 	source.unpipe(self)
		// });

		//manage pipes
		// self.on('resume', function () {
		// 	source.resume();
		// });
		// self.on('pause', function () {
		// 	source.pause();
		// });
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
 * Number active input connections
 */
Through.prototype.inputsCount = 0;


Object.defineProperties(Through.prototype, {
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
 * Manage piped to non-object streams flag
 */

Through.prototype.pipe = function (to) {
	var self = this;

	if (!to._writableState.objectMode) {
		self.writableObjectMode = false;
	}

	return Transform.prototype.pipe.call(self, to);
};


/**
 * Whether we need to cast AudioBuffer to Buffer in output.
 */
Through.prototype.writableObjectMode = true;


/**
 * PCM-stream format, not affected if nodes are connected in WAA
 */
extend(Through.prototype, pcm.defaults);



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
Through.prototype.state = undefined;


/**
 * Plan callback on time or event
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
 * Plan callback each N seconds
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
 * Cancel planned callback/event
 */
// Through.prototype.off = function (event, cb) {
// 	var self = this;

// 	self.removeListeners(event, cb);
// };


/**
 * Cancel planned time callback
 */
// Through.prototype.cancel = function (time, cb) {
// };


/**
 * Resume handling
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
 * Pause handling.
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
 * Indicate whether it is paused
 * (just overrides the Through’s method)
 */
/*
Through.prototype.isPaused = function (time) {
	var self = this;
	return self.state === 'paused';
};
*/



/**
 * Close audio node with final passed audiobuffer.
 * Overrides stream’s end.
 *
 * @param {AudioBuffer|Buffer} chunk final data
 */


Through.prototype.end = function (chunk) {
	var self = this;

	if (self.state === 'ended') return self;

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
	// self._handleResult(chunk);

	Transform.prototype.end.call(this);
	// self.log('ended');

	self.emit('end');

	//FIXME: the case for that is being connected to simple streams
	//this causes them throw error of after-write, weird.
	//From the other side, unconnecting turns prev stream into a sink, which is bad
	// self.unpipe();

	return self;
};




/**
 * WAA conventional methods to control stream.
 */
Through.prototype.start = function () {

};

Through.prototype.stop = function () {

};



/**
 * Throw inobstructive error. Does not stop stream.
 */
Through.prototype.error = function (error) {
	var self = this;

	//ensure error format
	error = error instanceof Error ? error : Error(error);

	console.error(self.pfx(), chalk.red(error.message));

	return self;
};


/**
 * Same as error, but for logging purposes
 */
Through.prototype.log = function () {
	var self = this;
	var args = [].slice.call(arguments);
	var str = [].join.call(args, ' ');
	console.log(self.pfx(), str);
	return self;
};


/**
 * Return prefix for logging
 */
Through.prototype.pfx = function () {
	var self = this;
	return chalk.gray('#' + self._id + ' ' + (now() - self._creationTime).toFixed(0) + 'ms');
};


/**
 * Fade out the node
 */
// Through.prototype.mute = function () {
// };


/**
 * Fade out all other nodes
 */
// Through.prototype.solo = function () {
// };


/**
 * Processing method, supposed to be overridden.
 * Basically provides a chunk with data and expects user to fill that.
 * If returned a promise, then will wait till it is resolved.
 */
Through.prototype.process = function (buffer) {
};


/**
 * Invoke _process for a chunk.
 */
Through.prototype._process = function (buffer, cb) {
	var self = this;
	// self.log('_call', self.state)

	//handle throttling
	//if is paused - plan processing after being release
	//FIXME: potential issue if lots of _processes being called during the pause
	//as such it is placing work of buffers to the events stack.
	// if (self._throttleTimeout) {
	// 	if (!self._plannedCall) {
	// 		self._plannedCall = true;
	// 		self.once('unblock', function () {
	// 			self._process(buffer, cb);
	// 		});
	// 	}
	// 	return;
	// }

	// self._plannedCall = false;

	//ensure buffer is AudioBuffer
	//FIXME: detect passed buffer format - not necessarily planar/2/etc
	if (!isAudioBuffer(buffer)) buffer = pcm.toAudioBuffer(buffer, self);

	//send buffer to processor
	//NOTE: why not promise? promise causes processor tick between executor and `then`.
	//if expected more than one argument - make execution async (like mocha)
	//also if no outputs - force awaiting the callback
	if (!self.outputsCount || self.process.length === 2) {
		self.process(buffer, _handleResult);
		return;
	}

	//otherwise - do sync processing
	var result = self.process(buffer);

	//if ended during the processing - just clear everything, ignore the chunk, as it is not actual anymore
	//FIXME: plan end, do not force it
	// if (self.state === 'ended') {
	// 	return;
	// }

	_handleResult(result);

	function _handleResult (result) {
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

		//if the state changed during the processing, like, end called - ignore cb
		//FIXME: test out other cases here, not only `ended` state
		// if (self.state === 'ended') {
		// 	return;
		// }

		//update counters
		self.count += result.length;
		self.time = self.count / self.sampleRate;

		//TODO: detect whether we need to cast audioBuffer to buffer (connected 2 at least one plain stream)
		if (!self.writableObjectMode && isAudioBuffer(result)) {
			result = pcm.toBuffer(result, self);
		}

		//if throttling - wait to release
		// if (self.throttle != null) {
		// 	self._throttleTimeout = setTimeout(function () {
		// 		self._throttleTimeout = null;
		// 		cb(result);
		// 	}, self.throttle);
		// } else {
		cb(result);
		// }

		// if (self._isFull) {
		// 	self._isFull = false;
		// 	self.emit('unblock');
		// }
	};
};




/**
 * Transformer method
 */
Through.prototype._transform = function (chunk, enc, cb) {
	var self = this;

	// self.log('_transform');

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


	// if (self._isFull) return;

	//ignore bad states
	if (self.state === 'ended') {
		return;
	}

	//in-middle case - be a transformer
	if (self.inputsCount) {
		return Transform.prototype._read.call(self, size);
	}

	// self.log('_read');

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

	//be a transformer
	if (self.outputsCount) {
		return Transform.prototype._write.call(self, chunk, enc, cb);
	}

	//if no outputs but some inputs - be a sink
	self._process(chunk, function (result) {
		self.emit('data', result);
		cb();
	});
};