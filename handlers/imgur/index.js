/*!
 * @module imgur
 */

'use strict';

var request = require('request');

var IMGUR_ID_PATTERN = /(\w{5,7})(\.\w{3})*$/i;
var IMAGE_ENDPOINT = 'https://api.imgur.com/3/image/';              // + image_id
var ALBUM_ENDPOINT = 'https://api.imgur.com/3/album/';              // + album_id

function Imgur(config, options, gcloud) {
    this.config = config;
    this.options = options;
    this.gcloud = gcloud;
    this.url_parser = require('url');

    this._queue_length = 0;
    this._results = [];
}

Imgur.prototype.processUrls = function (urls, callback) {

    this._queue_length = urls.length;

    urls.forEach(function (url_object, index, arr) {

        if (url_object.handled || !this.canHandle(url_object.url)) {
            return this.urlProcessed(url_object, callback);
        }

        var parsed_url = this.url_parser.parse(url_object.url),
            image_id = parsed_url.path.match(IMGUR_ID_PATTERN);

        if (image_id == null) {
            return this.urlProcessed(url_object, callback);
        }

        var options = {
            headers: {
                'Authorization': 'Client-ID ' + this.config.client_id
            }
        };

        if (image_id[1].length == 5) {
            options.url = ALBUM_ENDPOINT + image_id[1];
            return request(options, this.apiRequestAlbumCallback(this, url_object, callback));
        }

        options.url = IMAGE_ENDPOINT + image_id[1];
        return request(options, this.apiRequestImageCallback(this, url_object, callback));

    }, this);

};

Imgur.prototype.apiRequestImageCallback = function (self, url_object, callback) {
    return function (error, response, body) {
        if (error) {
            return self.urlProcessed(url_object, callback);
        }

        var data = JSON.parse(body).data;

        url_object.handled = true;
        url_object.handler = 'Imgur';
        url_object.result.title = data.title;
        url_object.result.type = 'Image';
        if (data.nsfw) url_object.result.tags.push('NSFW');
        if (data.is_ad) url_object.result.tags.push('Advertisement');

        /*
         * Image is already tagged as NSFW, no need for Vision API
         */
        if (data.nsfw) {
            return self.urlProcessed(url_object, callback);
        }

        /*
         * Content status still unknown, send to Vision API
         */
        var vision = self.gcloud.vision();
        vision.detectSafeSearch(data.link, function(error, safeSearch, apiResponse) {
            if (!error) {
                url_object.result.safe_search = apiResponse.responses[0].safeSearchAnnotation;
            }
            self.urlProcessed(url_object, callback);
        });
    }
};

Imgur.prototype.apiRequestAlbumCallback = function (self, url_object, callback) {
    return function (error, response, body) {
        if (error) {
            return self.urlProcessed(url_object, callback);
        }

        var data = JSON.parse(body).data;

        url_object.handled = true;
        url_object.handler = 'Imgur';
        url_object.result.title = data.title;
        url_object.result.type = 'Album (' + data.images_count + ')';
        if (data.nsfw) url_object.result.tags.push('NSFW');
        if (data.is_ad) url_object.result.tags.push('Advertisement');

        return self.urlProcessed(url_object, callback);
    }
};

Imgur.prototype.urlProcessed = function (url_object, callback) {
    this._results.push(url_object);
    if (this._results.length == this._queue_length) {
        callback(this._results);
    }
};

Imgur.prototype.canHandle = function (url) {

    var parsed_url = this.url_parser.parse(url);

    return parsed_url.hostname.toLowerCase().endsWith('imgur.com');

};

module.exports = Imgur;
