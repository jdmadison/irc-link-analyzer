/*!
 * @module imgur
 */

'use strict';

var Base = require.main.require('./handlers/base').Base;

var IMGUR_ID_PATTERN = /(\w{5,7})(\.\w{3})*$/i;
var IMAGE_ENDPOINT = 'https://api.imgur.com/3/image/';              // + image_id
var ALBUM_ENDPOINT = 'https://api.imgur.com/3/album/';              // + album_id

function Imgur(handler_config) {
    Base.call(this, "Imgur");
    this.handlerConfig = handler_config;
    this.urlParser = require('url');
}

Imgur.prototype = Object.create(Base.prototype);

Imgur.prototype.canHandle = function (url) {
    var parsedUrl = this.urlParser.parse(url);

    return parsedUrl.hostname.toLowerCase().endsWith('imgur.com');
};

Imgur.prototype.processUrl = function (url) {
    Base.prototype.processUrl.call(this, url);
    this.processNext();
};

Imgur.prototype.processNext = function () {
    var url = this._queue.shift(),
        parsedUrl = this.urlParser.parse(url.url),
        imageId = parsedUrl.path.match(IMGUR_ID_PATTERN);

    if (imageId == null) {
        return this.urlProcessed(url);
    }

    var options = {
        headers: {
            'Authorization': 'Client-ID ' + this.handlerConfig.clientId
        }
    };

    if (imageId[1].length == 5) {
        options.url = ALBUM_ENDPOINT + imageId[1];
        return this.request(options, this.apiRequestAlbumCallback(this, url));
    }

    options.url = IMAGE_ENDPOINT + imageId[1];
    this.request(options, this.apiRequestImageCallback(this, url));

};

/**
 * 2016-09-14: Update URL w/ direct image link
 */
Imgur.prototype.apiRequestImageCallback = function (self, url) {
    return function (error, response, body) {
        if (error) {
            return self.urlProcessed(url);
        }

        var data = JSON.parse(body).data;

        url.url = data.link;
        url.handledBy = 'Imgur';
        url.result.title = data.title;
        url.result.type = 'Image';
        if (data.nsfw) url.result.tags.push('NSFW');
        if (data.is_ad) url.result.tags.push('Advertisement');

        self.urlProcessed(url);
    }
};

Imgur.prototype.apiRequestAlbumCallback = function (self, url) {
    return function (error, response, body) {
        if (error) {
            return self.urlProcessed(url);
        }

        var data = JSON.parse(body).data;

        url.result.title = data.title;
        url.result.type = 'Album (' + data.images_count + ')';
        url.handledBy = 'Imgur';
        if (data.nsfw) url.result.tags.push('NSFW');
        if (data.is_ad) url.result.tags.push('Advertisement');

        self.urlProcessed(url);
    }
};

Imgur.prototype.urlProcessed = function(url) {
    url.warn = url.result.tags.length > 0;
    url.processed = url.warn;
    Base.prototype.urlProcessed.call(this, url);
};

module.exports = Imgur;
