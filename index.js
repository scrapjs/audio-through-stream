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


module.exports = AudioNode;


/**
 * Create audio processor
 *
 * @constructor
 */
function AudioNode (options) {
	if (!(this instanceof AudioNode)) return new AudioNode(options);

	var self = this;

	Transform.call(self, {
		objectMode: true,
		readableObjectMode: true,
		writableObjectMode: true
	});

	//just get unique id
	this._id = getUid();
	console.log('create', this._id)

	//passed data count
	this.count = 0;

	//current processing time
	this.time = 0;

	// //table of planned time events
	// this._plan = [];

	// //table of scheduled events
	// this._schedule = [];

	//redefine _process method
	if (options instanceof Function) {
		options = {_process: options};
	}

	//take over options
	extend(self, options);

	//normalize format
	pcm.normalize(self);

	//manage input pipes number
	self.on('pipe', function () {
		self.inputsCount++;
	}).on('unpipe', function () {
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
 * Update connection
 * If input is provided -
 */
// AudioNode.prototype.updateConnection = function () {

// };


/**
 * Context for WAA
 */
// AudioNode.prototype.context = context;


/**
 * WAA-compatible method of connection AudioNodes.
 * Passes unchanged audiobuffer instead of pipe.
 */
// AudioNode.prototype.connect = function (node) {
// };


/**
 *
 */
// AudioNode.prototype.disconnect = function () {
// };


/**
 * Current state of audio node, spec + extended by the methods.
 *
 * normal
 * playing
 * connection
 * tail-time
 *
 * paused
 * muted
 * ended
 * error
 *
 *
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
 * Plan playing at a time, or now
 */
// AudioNode.prototype.resume = function (time) {
// };


/**
 * Stop playing at a time, or now
 */
// AudioNode.prototype.pause = function (time) {
// 	var self = this;

// 	self.state = 'paused';
// };


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
AudioNode.prototype.end = function (chunk, cb) {
	var self = this;

	//FIXME quite ugly check.
	//`Transform.prototype.end` below calls `end` for all the further piped streams
	//and if they are also audio-through, they have non-zero `inputCount`
	//but the cannot be called `end` as such
	if (self.inputsCount) {
		if (self._processCb) {
			return self.error('Cannot end non-source stream.');
		}
	}

	//release callback, if any
	self._handleResult(chunk);

	//set state
	self.state = 'ended';
	Transform.prototype.end.call(this);

	return self;
};


/**
 * Throw inobstructive error
 */
AudioNode.prototype.error = function (error) {
	var self = this;

	//ensure error format
	error = error instanceof Error ? error : Error(error);

	console.error('Stream #' + self._id + ': ' + error.message);

	return self;
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
 * Meditate for a processor tick between chunks
 * Needed to slow down generation etc
 */
// AudioNode.prototype.throttle = false;


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

	//ensure buffer is AudioBuffer
	//FIXME: detect passed buffer format - not necessarily planar/2/etc
	if (!isAudioBuffer(buffer)) buffer = pcm.toAudioBuffer(buffer, self);

	//save awaiting cb
	self._processCb = cb;
	self._processBuffer = buffer;

	//send buffer to processor
	var result = self._process(buffer);

	//handle the result
	self._handleResult(result);
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
	if (self.state !== 'normal') {
		//release callback
		return;
	}

	if (self._processCb) {
		//TODO: detect whether we need to cast audioBuffer to buffer (connected 2 at least one plain stream)
		// if (isAudioBuffer(result)) result = pcm.toBuffer(result, self.format);

		//ensure callback is called
		self._processCb(result);

		self._processCb = null;
	}

	self._processBuffer = null;


	//update counters
	if (result) {
		self.count += result.length / self.channels;
		self.time = self.count / self.sampleRate;
	}
};


/**
 * Transformer method
 */
AudioNode.prototype._transform = function (chunk, enc, cb) {
	var self = this;

	//ignore bad states
	if (self.state !== 'normal') return;

	self._callProcess(chunk, function (chunk) {
		cb(null, chunk);
	});
};


/**
 * Generator method
 */
AudioNode.prototype._read = function (size) {
	var self = this;

	//ignore bad states
	if (self.state !== 'normal') return;

	//if no inputs but are outputs - be a generator
	if (!self.inputsCount && self.outputsCount) {
		//create buffer of needed size
		var buffer = new Buffer(self.samplesPerFrame);

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

	//ignore bad states (like, ended in between)
	if (self.state !== 'normal') return;

	//if no outputs but some inputs - be a sink
	if (!self.outputsCount && self.inputsCount) {
		self._callProcess(chunk, cb);
		self.emit('data', chunk);
	}

	//else be a transformer
	else {
		Transform.prototype._write.call(this, chunk, enc, cb);
	}
};