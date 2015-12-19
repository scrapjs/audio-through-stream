## Doubts

* Deny extra-calculations (fft etc) if not required.
* Regulate speed of processing (slow down it to see in steps whats happening)
* Itd be nice to provide replaceable _transform(chunk,enc,cb), where chunk is AudioBuffer indeed. But it is impossible, as this method is taken. so anyways you have to tackle buffers in that method through pcm-util.
	* But what if call it _process(buffer, cb), where buffer is an AudioBuffer with ready utils?
* reading web-audio-api is not necessary to be in every node. It is better to create reader-streams, converting web-audio-api to stream, and delegate rest to streams.
	* But single-thread streams seems to render serious latency, which is a way better solved in web-audio.
* It introduces some obscure behaviour in constructor, whereas with pure streams it is clear.
	* Like hiding extending of options? But look at audio-spectrum - it is done perfectly, and it is even easier not to care about that.
* Debugging/profiling routines? But they are transforms’, so monkeypatch them
	* Seems that there are not too many of ready packages for audio, and those who are not may just provide simple fallback interfaces for audio-stream.
* Counting data? not difficult to make manually.
	* But it is useful to have some minimal stats methods.
* Sending all the data to webworkers? Webworker mode.
* Implementing scheduling of events based on time, like on(1.23s, cb), which will change the behaviour.
	* Scheduling is a bad idea, actually, because inner time can be scaled, and
* Limiting overall buffersize (in all instances), or the pcm-format.
* Logging overall instances flow.
* Redistributing processor priorities over the instances.
* Providing ongo utils like convolve(filter), gain(volume),
* Providing ongo metrics like loudness, frequencyData, etc (audio-meter).
* Providing detached-stream interface, i. e. make able recursive connection etc.
* Works as universal read/write/transform stream
	* If there is no output but piped input data - it sinks
	* If there is no input but piped to output - it generates
	* If there is both input/output - it processes
* Provides mute/solo methods.
* Number of input/output channels?
	* Seems that mixer channels concept does not really differ from spatial channels, so we actually need synchroniser node, not the mixer, as the mixer is basically can be this our node.
* Prerender export buffer (lock), if there are no planned controller actions.


SO SEEMS THAT THIS PACKAGE HAS NOT ENOUGH REASONS TO EXIST.
	Now it is questionable.

So this is universal building audio unit with interface from anything to anyhing.
It is very generalized and unified way of descpirting and directing audio flow, not really touching the flow, delegating it to powerful outside sources.
Also it transforms the way we deal with audio to the way similar to color - domains (same as color-spaces), metrics (color-metrics), manipulations (color-manipulations).