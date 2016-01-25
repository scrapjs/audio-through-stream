Through stream for audio processing.

* Shares _AudioBuffer_ between streams instead of copying _Buffer_.
* Uses zero-buffering to avoid delays.
* Provides easy way to control the flow pressure, e. g. to bind processing to the real time, easily debug chunks, outsource processing to shaders/webworkers/audio-workers, etc.
* Provides debugging facilities.
* Provides simple audio data metrics.
* Compatible with node-streams.
* Can be used as a _Readable_, _Transform_ or _Writable_ stream.


## Usage

[![npm install audio-through](https://nodei.co/npm/audio-through.png?mini=true)](https://npmjs.org/package/audio-through/)

```js
var Through = require('audio-through');
var util = require('audio-buffer-utils');
var Speaker = require('speaker');

//generate noise
Through(util.noise)

//decrease volume
.pipe(Through(function (buffer) {
	var volume = 0.2;

	util.fill(buffer, function (sample) {
		return sample * volume;
	});
}))

//output
.pipe(Speaker());
```

## API

```js
var through = new Through(
	//`buffer` is an instance of AudioBuffer, used as input-output.
	//If other buffer is returned, it will replace the `buffer`.
	//If `done` argument is expected - the processor will wait for it to be executed,
	//otherwise - will sink the data.
	function (buffer, done?) {

		//number of sample-frames processed
		this.count;

		//If time of the current chunk is more than 3s, stop generation
		if (this.time > 3) this.end();

		//simple throttling
		setTimeout(done, 100);
	},

	//Optional buffer format to use when connected to raw streams, like `node-speaker`.
	//If undefined, pcm default format is used.
	format?
);

//End stream
through.end();

//Throw error, not breaking the pipe
through.error(error|string);

//Log buffer-related info
through.log(string);

//Current state: normal, paused, ended, muted, solo, error
through.state;


through

//invoke before processing the chunk
.on('beforeProcess')

//call after processing the chunk
.on('afterProcess')
```

## Related

> [audio-buffer-utils](https://npmjs.org/package/audio-buffer-utils) — set of utils for audio buffers processing.<br/>
> [audio-buffer](https://github.com/audio-lab/buffer) — interface for any audio data holder.<br/>