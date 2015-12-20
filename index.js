/**
 * Abstract audio node class
 *
 * @module audio-node
 */


// var metric = require('audio-metric');
// var manip = require('audio-manipulation');
var Transform = require('stream').Transform;
var pcm = require('pcm-util');
var find = require('array-find');
var inherits = require('inherits');
var extend = require('xtend/mutable');
var isPromise = require('is-promise');
var AudioBuffer = require('audio-buffer');


module.exports = AudioNode;


/**
 * @constructor
 */
function AudioNode (options) {
	if (!(this instanceof AudioNode)) return new AudioNode(options);

	var self = this;

	Transform.call(self);

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

	//obtain correct format
	extend(self, options);
	pcm.normalizeFormat(self);


	//store pipe-ins
	self.inputsCount = 0;
	self
	.on('pipe', function () {
		self.inputsCount++
	})
	.on('unpipe', function () {
		self.inputsCount--
	});

	//store pipe-outs
	Object.defineProperties(self, {
		outputsCount: {
			get: function () {
				return this._readableState.pipesCount
			},
			set: function (value) {
				throw Error('outputsCount is read-only');
			}
		}
	});

	//set state active
	self.state = 'active';
}


/**
 * Set duplex behaviour
 */
inherits(AudioNode, Transform);


/**
 * Get default format options
 */
extend(AudioNode.prototype, pcm.defaultFormat);


/**
 * Provide metrics methods
 */
// extend(AudioNode.prototype, metrics);


/**
 * Provide manipulations methods
 */
// extend(AudioNode.prototype, metrics);


/**
 * Current state of audio node, instead of a bunch of flags.
 *
 * paused
 * muted
 * ended
 * error
 *
 *
 * processing/waiting?
 * limit
 * muted/solo?
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
AudioNode.prototype.schedule = function (interval, offset, cb) {
	var self = this;

	if (typeof offset === 'Function') {
		cb = offset;
		offset = 0;
	}

	// var idx = self._schedule.
};


/**
 * Cancel planned callback/event
 */
AudioNode.prototype.off = function (event, cb) {
	var self = this;

	self.removeListeners(event, cb);
};


/**
 * Cancel planned time callback
 */
AudioNode.prototype.cancel = function (time, cb) {

};


/**
 * Plan playing at a time, or now
 */
AudioNode.prototype.resume = function (time) {

};


/**
 * Stop playing at a time, or now
 */
AudioNode.prototype.pause = function (time) {
	var self = this;

	self.state = 'paused';
};


/**
 * Close audio node with final passed audiobuffer.
 * Overrides stream’s end.
 *
 * @param {AudioBuffer} chunk AudioBuffer instance with data
 */
AudioNode.prototype.end = function (chunk) {
	var self = this;

	//set state
	self.state = 'ended';

	if (!(chunk instanceof AudioBuffer)) chunk = AudioBuffer(chunk);

	Transform.prototype.end.call(this, chunk.rawData);
	console.log('end')
};


/**
 * Fade out the node
 */
AudioNode.prototype.mute = function () {

};


/**
 * Fade out all other nodes
 */
AudioNode.prototype.solo = function () {

};


/**
 * Regulate the gain
 */
AudioNode.prototype.volume = 1;


/**
 * Meditate for a processor tick each
 */
AudioNode.prototype.throttle = false;


/**
 * Number of workers to split calculation to
 */
AudioNode.prototype.workers = 0;


/**
 * Max size of data to store.
 * If undefined - none, i. e. only current processing chunk.
 */
AudioNode.prototype.bufferSize = 0;


/**
 * Frequency domain data to store.
 * If 0 - fft is calculated by the request.
 */
AudioNode.prototype.fftSize = 0;



/**
 * Get the frequencies data
 */
//TODO: maybe replace with color-space like object? Like, perform conversion in _process, not here
AudioNode.prototype.getFrequencyData
AudioNode.prototype.getTimeData




/**
 * Processing method, supposed to be overridden.
 * Basically provides a chunk with data and expects user to fill that.
 * If returned a promise, then will wait till it is resolved.
 */
AudioNode.prototype._process = function (buffer) {};


/**
 * Prepare chunk for processing
 */
AudioNode.prototype._callProcess = function (buffer, cb) {
	var self = this;

	//convert buffer to array
	var data = AudioBuffer(buffer, this);

	var result = self._process(data);

	//if returned a promise - wait
	if (isPromise(result)) {
		result.then(function (chunk) {
			chunk = AudioBuffer(chunk);

			cb(chunk.rawData);

			self.count += chunk.length;
			self.time = self.count / self.sampleRate;
		}, function (err) {
			throw err;
		});

		return;
	}

	//fall back to result
	result = result === undefined ? buffer : (result instanceof AudioBuffer) ? result : AudioBuffer(result);

	cb(result.rawData);

	self.count += result.length;
	self.time = self.count / self.sampleRate;
};


/**
 * Transformer method
 */
AudioNode.prototype._transform = function (chunk, enc, cb) {
	var self = this;
	self._callProcess(chunk, function (chunk) {
		cb(null, chunk);
	});
};


/**
 * Generator method
 */
AudioNode.prototype._read = function (size) {
	var self = this;

	//if no inputs but are outputs - be a generator
	if (!self.inputsCount && self.outputsCount) {
		//generate new chunk with silence
		var chunk = new Buffer(self.samplesPerFrame);
		self._callProcess(chunk, function (chunk) {
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