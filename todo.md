* throttling should be implemented not through pause/resume mechanism, but separately.
	* User may want pausing/resuming manually, but throttling thould persist.
* Combine connected AudioNodes in node into object streams with passed buffer, i. e. detect output connected node to transform to buffer (it takes time etc.)