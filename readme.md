Audio-node is a generic stream class for any audio-processing tasks: generation of audio-stream, processing, output, analysis, conversion etc.

## Usage

[![npm install audio-node](https://nodei.co/npm/audio-node.png?mini=true)](https://npmjs.org/package/audio-node/)

```js
var AudioNode = require('audio-node');
var Speaker = require('speaker');

//generator
AudioNode(function (buffer) {
	var samplesNumber = 1024;
	for (var i = 0; i < samplesNumber; i++) {
		buffer.set(0, i, Math.random() * 2 - 1);
		buffer.set(1, i, Math.random() * 2 - 1);
	}

	return buffer;
})
//processor
.pipe(AudioNode(function (buffer) {
	var volume = 0.2;
	return buffer.map(function (sample) {
		return sample * volume;
	});
}))
//transformer
.pipe(AudioNode(function (buffer) {
	return buffer.toFormat({
		signed: true,
		float: false,
		bitDepth: 16,
		channels: 2
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

//End stream
audioNode.end();

//Pause processing
audioNode.pause();

//Continue processing
audioNode.resume();
```

## Related

> [audio-buffer](https://github.com/audio-lab/buffer) — interface for any audio data holder.<br/>