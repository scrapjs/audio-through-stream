var test = require('tst');
var audioCtx = require('audio-context');
var now = require('performance-now');
var AudioBuffer = require('audio-buffer');
var util = require('audio-buffer-utils');


test('scriptProcessorNode vs setInterval', function () {
	var sourceNode = audioCtx.createBufferSource();
	var scriptNode = audioCtx.createScriptProcessor(4096, 1, 1);
	var time = 0;

	//scriptProcessorNode counter
	var sppTimes = 0;
	scriptNode.onaudioprocess = function() {
		time && sppTimes++;
	}
	sourceNode.connect(scriptNode);
	scriptNode.connect(audioCtx.destination);
	sourceNode.start();

	//setIntervalCounter
	var iTimes = 0;
	var interval = setInterval(function () {
		time && iTimes++;
	});


	//Measure!
	time = -now();
	setTimeout(function () {
		time += now();
		console.log('scriptProcessorNode %s ops/s', sppTimes/time);
		console.log('setInterval %s ops/s', iTimes/time);

		clearInterval(interval);
		sourceNode.stop();
	}, 1000);

	//Results
	//Obviously scriptNode is slower, it has no need to fire nonstop, it is RT.
	//The question is whether the scriptNode is better than pooling transformers on AudioBufferSource?
});