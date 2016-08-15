/**
 * Created by jeremy on 8/13/16.
 */

'use strict';

var request = require('request');

function Default(config, options, gcloud) {
    this.config = config;
    this.options = options;
    this.gcloud = gcloud;

    this._queue_length = 0;
    this._results = [];
}

Default.prototype.processUrls = function(urls, callback) {

    this._queue_length = urls.length;

    urls.forEach(function(url_object, index, arr) {

        if (url_object.handled) {
            return this.urlProcessed(url_object, callback);
        }

        return request.head(url_object.url, this.headRequestCallback(this, url_object, callback));

    }, this);

};

Default.prototype.headRequestCallback = function(self, url_object, callback) {
    return function(error, response, body) {
        if (error) {
            return self.urlProcessed(url_object, callback);
        }

        if (response.headers['content-type'] == undefined || !response.headers['content-type'].startsWith('image')) {
            return self.urlProcessed(url_object, callback);
        }

        var vision = self.gcloud.vision();
        vision.detectSafeSearch(url_object.url, function(error, safeSearch, apiResponse) {
            if (!error) {
                url_object.result.safe_search = apiResponse.responses[0].safeSearchAnnotation;
            }
            self.urlProcessed(url_object, callback);
        });
    };
};

Default.prototype.urlProcessed = function (url_object, callback) {
    this._results.push(url_object);
    if (this._results.length == this._queue_length) {
        callback(this._results);
    }
};

module.exports = Default;