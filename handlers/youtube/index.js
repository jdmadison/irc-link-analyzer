/*!
 * @module youtube
 */

'use strict';

var Base = require.main.require('./handlers/base').Base;

var LIST_ENDPOINT = 'https://www.googleapis.com/youtube/v3/videos';     //?part=contentDetails&id=TxIzXPgRIaY&key={YOUR_API_KEY}';

function YouTube(handler_config) {
    Base.call(this, "YouTube");
    this.google_config = require.main.require('./config').google;
    this.handler_config = handler_config;
    this.url_parser = require('url');
}

YouTube.prototype = Object.create(Base.prototype);

YouTube.prototype.canHandle = function(url) {
    var parsed_url = this.url_parser.parse(url);
    return parsed_url.hostname.contains('youtube');
};

YouTube.prototype.processUrl = function(url) {

};

YouTube.prototype.processNext = function() {

};

YouTube.prototype.apiRequestVideoCallback = function(self, url) {
    return function (error, response, body) {
        if (error) {
            return self.urlProcessed(url);
        }
    }
};

YouTube.prototype.urlProcessed = function(url) {
    Base.prototype.urlProcessed.call(this, url);
};

module.exports = YouTube;