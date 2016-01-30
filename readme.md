Through stream for audio processing.

* Compatible with node-streams.
* Can be piped right to [speaker](https://npmjs.org/package/speaker).
* Shares _AudioBuffer_ between streams instead of copying _Buffer_, which is 0-overhead.
* Uses zero-watermarks to avoid output delays.
* Provides an easy way to control the flow pressure, e. g. to bind processing to the real time, debug chunks, outsource processing to shaders/webworkers/audio-workers, etc.
* Provides debugging facilities.
* Provides simple audio data metrics.
* Can be used as a _Readable_, _Transform_ or _Writable_ stream.
* WIP: .plan method to schedule events by audio-time.


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

    //If time of the current chunk is more than 3s, end stream
    if (this.time > 3) return null;

    //simple throttling for debug
    setTimeout(done, 100);
  }?,

  //Optional buffer formats to use when connected to raw streams, like `node-speaker`.
  //By undefined, pcm-util default format is used.
  inputFormat?,
  outputFormat?
);

//End stream
through.end();

//Throw error, not breaking the pipe
through.error(error|string);

//Log buffer-related info
through.log(string);

//Current state: normal, paused, ended, muted, solo, error
through.state;



//invoke before processing the chunk
through.on('beforeProcess', function (buffer) {})

//call after processing the chunk
.on('afterProcess', function (buffer) {});


//Set true to display stream logs/errors in console
```

## Related

> [audio-buffer-utils](https://npmjs.org/package/audio-buffer-utils) — set of utils for audio buffers processing.<br/>
> [audio-buffer](https://github.com/audio-lab/buffer) — interface for any audio data holder.<br/>
> [audio-generator](https://github.com/audio-lab/audio-generator) — useful periodic signal generator stream.