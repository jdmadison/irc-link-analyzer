/*!
 * module handlers/default
 * Default URL Handler
 */

'use strict';

var Base = require.main.require('./handlers/base').Base;

function Default(handler_config) {
    Base.call(this, "Default");
    this.gcloud = require('google-cloud')(this.config.gcloud);
}

Default.prototype = Object.create(Base.prototype);
// Default.constructor = Base;

Default.prototype.canHandle = function(url) {
    return true;
};

Default.prototype.processUrl = function (url) {
    Base.prototype.processUrl.call(this, url);
    this.processNext();
};

/**
 * Default URL processor function.
 *
 * Handles image/* and text/html content types not processed by the other handlers.
 * Images are run through the Google Cloud Vision API
 * HTML pages are run through the Google Safe Browsing API
 */
Base.prototype.processNext = function () {
    var url = this._queue.shift(),
        options = { timeout: this.config.handlerOptions.headTimeout };
    this.request.head(url.url, options, this.processUrlDefaultCallback(this, url));
};

/**
 * Default URL processor callback function
 *
 * @param self The current handler instance (this is scoped to the request object)
 * @param url
 */
Base.prototype.processUrlDefaultCallback = function (self, url) {
    return function (error, response, body) {
        if (error && error.code != 'ETIMEDOUT') {
            this.emit('error', error);
            return self.urlProcessed(url);
        }

        /*
         * HEAD request timed out or content-type is undefined. Send to SafeBrowsing
         * API just to be safe.
         */
        if (response == undefined || response.headers['content-type'] == undefined) {
            return self.gcloudSafeBrowsing(url);
        }

        if (response.headers['content-type'].startsWith('text/html')) {
            return self.gcloudSafeBrowsing(url);
        }

        if (response.headers['content-type'].startsWith('image/')) {
            return self.gcloudSafeSearch(url);
        }

        self.urlProcessed(url);
    }
};

/**
 * Process an image URL with the Google Cloud Vision API
 *
 * @param url
 */
Default.prototype.gcloudSafeSearch = function (url) {
    var vision = this.gcloud.vision();
    vision.detectSafeSearch(url.url, this.gcloudSafeSearchCallback(this, url));
};

Default.prototype.gcloudSafeSearchCallback = function (self, url) {
    return function (error, safeSearch, apiResponse) {
        if (error) {
            return self.urlProcessed(url);
        }

        /*
         * Only add the results that meet the minimum safeSearch warning threshold.
         */
        var annotations = apiResponse.responses[0].safeSearchAnnotation,
            likelihood = require('google-cloud').vision.likelihood,
            threshold = likelihood[self.config.handlerOptions.safeSearchWarningThreshold];

        Object.keys(annotations).forEach(function (val, idx, arr) {
            if (val !== 'spoof' && likelihood[annotations[val]] >= threshold) {
                var result = {};
                result[val] = annotations[val];
                url.result.safeSearch.push(result);
            }
        }, self);

        url.handledBy = 'Default';
        url.result.type = 'Image';
        url.warn = url.result.safeSearch.length > 0;

        self.urlProcessed(url);
    }
};

/**
 * Process a text/html URL with the Google Safe Browsing API
 *
 * @param url
 */
Default.prototype.gcloudSafeBrowsing = function (url) {

    // request body
    var body = {
        client: {
            clientId: this.config.google.clientId,
            clientVersion: this.config.app.version
        },
        threatInfo: {
            threatTypes: this.config.google.apis.safeBrowsing.threatTypes,
            platformTypes: this.config.google.apis.safeBrowsing.platformTypes,
            threatEntryTypes: ['URL'],
            threatEntries: [{url: url.url}]
        }
    };

    // request options
    var options = {
        headers: {'content-type': 'application/json'},
        url: this.config.google.apis.safeBrowsing.endPoint + '?key=' + this.config.google.key,
        body: JSON.stringify(body)
    };

    this.request.post(options, this.gcloudSafeBrowsingCallback(this, url));
};

Default.prototype.gcloudSafeBrowsingCallback = function (self, url) {
    return function (error, response, body) {
        if (error) {
            return self.urlProcessed(url);
        }

        var safeBrowsing = JSON.parse(body);

        // no matches found
        if (!safeBrowsing.hasOwnProperty('matches')) {
            return self.urlProcessed(url);
        }

        url.handledBy = 'Default';
        url.result.type = 'Page';
        url.result.safeBrowsing = safeBrowsing.matches;
        url.warn = true;

        self.urlProcessed(url);
    }
};

Default.prototype.urlProcessed = function(url) {
    url.processed = true;
    Base.prototype.urlProcessed.call(this, url);
};

module.exports = Default;