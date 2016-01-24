Through stream for audio processing streams.


## Usage

[![npm install audio-through](https://nodei.co/npm/audio-through.png?mini=true)](https://npmjs.org/package/audio-through/)

```js
var Through = require('audio-through');
var Speaker = require('speaker');
var util = require('audio-buffer-utils');
var AudioBuffer = require('audio-buffer');

//generator
Through(util.noise)

//processor
.pipe(Through(function (buffer) {
	var volume = 0.2;

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
var audioNode = new Through(
	//processing function
	function (buffer) {
		//buffer is an instance of AudioBuffer, used as input-output.
		//if other buffer is returned, the returned value will replace the buffer.
		//if a promise is returned, the stream will wait for it.

		//number of sample-frames processed
		this.count;

		//If time of the current chunk is more than 3s, stop generation
		if (this.time > 3) this.end();
	},
	//options
	{
		//process chunk each N ms, useful for debugging to slow down processing
		throttle: false
	}
);

//End stream, optionally sending final data
audioNode.end(buffer?);

//Pause processing
audioNode.pause();

//Continue processing
audioNode.resume();

//Throw error, not breaking the pipe
audioNode.error(error|string);

//Current state: normal, paused, ended, muted, solo, error
audioNode.state;
```

## Related

> [audio-buffer-utils](https://npmjs.org/package/audio-buffer-utils) — set of utils for audio buffers processing.<br/>
> [audio-buffer](https://github.com/audio-lab/buffer) — interface for any audio data holder.<br/>