Streams-based [AudioNode](https://developer.mozilla.org/en-US/docs/Web/API/AudioNode) implementation. Useful both as stream and web audio node.


## Usage

[![npm install audio-node](https://nodei.co/npm/audio-node.png?mini=true)](https://npmjs.org/package/audio-node/)

```js
var AudioNode = require('audio-node');
var Speaker = require('speaker');
var util = require('audio-buffer-utils');
var AudioBuffer = require('audio-buffer');

//generator
AudioNode(function (e) {
	var buffer = new AudioBuffer(1024);

	//create noise
	util.fill(buffer, function () {
		return Math.random() * 2 - 1;
	});

	return buffer;
})
//processor
.connect(AudioNode(function (buffer) {
	var volume = 0.2;

	//change noise value
	return util.map(buffer, function (sample) {
		return sample * volume;
	});
}))
//output
.pipe(Speaker());
```

## API

```js
//Create new audio node instance with passed options
var audioNode = new AudioNode({
	//processor function, can be passed to constructor instead of options, as in usage examples
	_process: function (buffer) {
		//buffer is an instance of AudioBuffer.
		//Return processed audio buffer
		//or promise (object with .then method) to process asynchronously.
		//If no return, the input buffer will be returned automatically as pass-through.

		//number of sample-frames processed
		this.count;

		//If time of the current chunk is more than 3s, stop generation
		if (this.time > 3) this.end();
	}
});

//End stream, optionally sending final data
audioNode.end(buffer?);

//Pause processing
audioNode.pause();

//Continue processing
audioNode.resume();

//Throw error, not breaking the pipe
audioNode.error(error|string);

//Current state: active, paused, ended, muted, error
audioNode.state;

//Connect to other AudioNode — pass own AudioBuffer to the next AudioNode
audioNode.connect(audioCtx.destination);

//Pipe to stream — transform own AudioBuffer to Buffer
audioNode.pipe(speaker);
```

## Related

> [audio-buffer](https://github.com/audio-lab/buffer) — interface for any audio data holder.<br/>