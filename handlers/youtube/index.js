/*!
 * @module youtube
 */

'use strict';

var Base = require.main.require('./handlers/base').Base;

var LIST_ENDPOINT = 'https://www.googleapis.com/youtube/v3/videos';     //?part=contentDetails&id=TxIzXPgRIaY&key={YOUR_API_KEY}';

// https://developers.google.com/youtube/v3/docs/videos#contentDetails.contentRating
/*
acbRating: {},
catvRating: {},
chvrsRating: {},
mdaRating: {},
mekuRating: {},
mpaaRating: {},
tvpgRating: {},
*/
var RATINGS = {
    ytRating: {
        name: 'YouTube',
        ytAgeRestricted: 'Age-Restricted'
    }
};

function YouTube(handler_config) {
    Base.call(this, "YouTube");
    this.googleConfig = require.main.require('./config').google;
    this.handlerConfig = handler_config;
    this.urlParser = require('url');
}

YouTube.prototype = Object.create(Base.prototype);

YouTube.prototype.canHandle = function(url) {
    var parsedUrl = this.urlParser.parse(url);
    return parsedUrl.hostname.includes('youtube');
};

YouTube.prototype.processUrl = function(url) {
    Base.prototype.processUrl.call(this, url);
    this.processNext();
};

YouTube.prototype.processNext = function() {
    var url = this._queue.shift(),
        parsedUrl = this.urlParser.parse(url.url),
        parsedQuery = this.parseQuery(parsedUrl.query);

    if (!parsedQuery.hasOwnProperty('v')) {
        return this.urlProcessed(url);
    }

    var endpoint = LIST_ENDPOINT + '?part=contentDetails,snippet&id=' + parsedQuery.v + '&key=' + this.googleConfig.key;

    return this.request(endpoint, this.apiRequestVideoCallback(this, url));
};

YouTube.prototype.apiRequestVideoCallback = function(self, url) {
    return function (error, response, body) {
        if (error) {
            return self.urlProcessed(url);
        }

        var data = JSON.parse(body);

        data.items.forEach(function(val, idx, arr) {
            if (val.contentDetails.contentRating == undefined) {
                return;
            }

            var ratingBody = Object.keys(val.contentDetails.contentRating)[0],
                ratingValue = val.contentDetails.contentRating[ratingBody];

            if (RATINGS.hasOwnProperty(ratingBody) && RATINGS[ratingBody].hasOwnProperty(ratingValue)) {
                url.result.tags.push(RATINGS[ratingBody].name + ' Rating - ' + RATINGS[ratingBody][ratingValue]);
            }

            url.result.title = val.snippet.title;
            url.result.type = "Video";
        });

        self.urlProcessed(url);
    }
};

YouTube.prototype.urlProcessed = function(url) {
    url.warn = url.result.tags.length > 0;
    url.processed = url.warn;
    Base.prototype.urlProcessed.call(this, url);
};

module.exports = YouTube;