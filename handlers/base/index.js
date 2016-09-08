/*!
 * module handlers/base
 *
 * URL handler base module/class
 */

'use strict';

var events = require('events');
var uuid = require('node-uuid');

function Base() {
    this.config = require.main.require('./config');

    this._queue = [];
    this._interval = null;

    this.request = require('request');

    events.EventEmitter.call(this);
}

Base.prototype.__proto__ = events.EventEmitter.prototype;

/**
 * Main entry point for all URL handlers.
 *
 * All handlers must provide their own implementation of this function
 *
 * @param url
 */
Base.prototype.processUrl = function (url) {
    this._queue.push(url);
};

/**
 * Called after each URL object has been processed.
 *
 * emits the `processed` event with the processed url_object
 *
 * @param url
 */
Base.prototype.urlProcessed = function (url) {
    this.emit('processed', url);
};

/*
 * Container object for the URLs being processed
 */
var Url = function(url) {
    return {
        uuid: uuid.v4(),
        url: url,
        short: url.length <= 30 ? url : url.substr(0, 13) + '....' + url.substr(-13, 13),
        handledBy: null,        // The name of the object that handled the URL
        result: {
            title: null,        // Image or Page Title
            type: null,         // Content Type (image, html, etc)
            safeSearch: [],     // Google detectSafeSearch response
            safeBrowsing: [],   // Google threatMatches response
            tags: []            // Handler-specific tags (nsfw, advertising, etc)
        },
        processed: false,       // Indicates that processing is complete
        warn: false             // Whether or not to send a warning to the channel
    };
};

module.exports = {
    Base: Base,
    Url: Url
};
