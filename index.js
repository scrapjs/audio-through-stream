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


module.exports = AudioNode;


/**
 * @constructor
 */
function AudioNode (options) {
	if (!(this instanceof AudioNode)) return new AudioNode(options);

	Transform.call(this);

	//passed data count
	// this.count = 0;

	// //current processing time
	// this.time = 0;

	// //table of planned time events
	// this._plan = [];

	// //table of scheduled events
	// this._schedule = [];
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
 * Current state of audio node
 *
 * undefined
 * processing/waiting?
 * error
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
AudioNode.prototype.start = function (time) {

};


/**
 * Stop playing at a time, or now
 */
AudioNode.prototype.stop = function (time) {

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
AudioNode.prototype._process = function (buffer) {
	return buffer;
};


/**
 * Prepare chunk for processing
 */
AudioNode.prototype._callProcess = function (buffer, cb) {
	var self = this;

	var result = self._process(buffer);

	//if returned a promise - wait
	if (isPromise(result)) {
		result.then(cb, function (err) {
			throw err;
		});
	}
	//or invoke instantly
	else {
		cb(result);
	}
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
//TODO: fix this
// AudioNode.prototype._read = function (size) {
// 	var self = this;

// 	//if no inputs but are outputs - be a generator
// 	if (!self._writableState.pipesCount && self._readableState.pipesCount) {
// 		//generate new chunk with silence
// 		var chunk = new Buffer(0);
// 		self._callProcess(chunk, function (chunk) {
// 			self.push(chunk);
// 		});
// 	}

// 	//else be a transformer
// 	else {
// 		console.log(123)
// 		Transform.prototype._read.call(this, size);
// 	}
// };


/**
 * Sink method
 */
AudioNode.prototype._write = function (chunk, enc, cb) {
	var self = this;
	//if no outputs but some inputs - be a sink
	if (!self._readableState.pipesCount && self._writableState.pipesCount) {
		self._callProcess(chunk, cb);
		self.emit('data', chunk);
	}

	//else be a transformer
	else {
		Transform.prototype._write.call(this, chunk, enc, cb);
	}
};