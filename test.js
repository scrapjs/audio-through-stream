var AudioNode = require('./');
// var Source = require('audio-source');
var Speaker = require('audio-speaker');
// var Generator = require('audio-generator');

it('PassThrough', function (done) {
	Generator({duration: 0.5 })
	.pipe(Node())
	.pipe(Speaker())
	.on('end', done);
});

it.only('Generator', function (done) {
	//weird-saw wave generator
	AudioNode(function (chunk) {
		for (var i = 0; i < chunk.length; i++) {
			chunk.set(0, i, i/chunk.length * 2 - 1);
			chunk.set(1, i, 1 - i/chunk.length * 2);
		}

		if (this.time > 0.1) return this.end(chunk);

		return chunk;
	})
	.pipe(Speaker())
	.on('end', done);
});

it.skip('Throw error', function (done) {

});

it('Return collection, not AudioBuffer');