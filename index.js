/*!
 *
 */

'use strict';

var config = require('./config');

var irc = require('irc');
var gcloud = require('gcloud')(config.gcloud);

var queue = {};

var Url = require('./handlers/base').Url;

/*
 * Load url handlers
 */
var url_handlers = config.urlHandlers.map(function (v, i, a) {
    var handler = require('./handlers/' + v.name);
    return new handler(v.config);
});

/*
 * Wire-up handler events
 */
url_handlers.forEach(function (handler, idx, arr) {
    handler.on('processed', processResults);
});



/**
 *
 */
var handleMessage = function (client) {
    return function (nick, to, text, message) {

        var urls = getUrlsFromMessage(text);

        if (urls.length == 0) return;

        urls.forEach(function (url, idx, arr) {

            url_handlers.forEach(function (handler, _idx, _arr) {
                if (handler.canHandle(url)) {
                    var url_object = new Url(url);
                    queue[url_object.uuid] = {client: client, channel: to, from: nick};
                    return handler.processUrl(url_object);
                }
            });

        });
    }
};

function processResults(url) {

    console.log('Processed URL: ' + url.url);

    if (!url.warn) {
        return;
    }

    var warnings = url.result.tags,
        source = queue[url.uuid];

    delete queue[url.uuid];

    url.result.safeSearch.forEach(function (val, idx, arr) {
        var key = Object.keys(val)[0];
        warnings.push(key[0].toUpperCase() + key.slice(1) + ' (' + val[key][0] + val[key].slice(1).toLowerCase().replace(/_/, ' ') + ')');
    });

    url.result.safeBrowsing.forEach(function (val, idx, arr) {
        warnings.push(val['threatType'][0] + val['threatType'].slice(1).toLowerCase().replace(/_/, ' '));
    });

    var title = url.result.title ? ' | ' + url.result.title : '',
        message = 'Content Warning (' + url.short + title + '): ' + warnings.join(', ');

    if (source.client != undefined) {
        console.log(source.channel + ' => ' + message);
        source.client.say(source.channel, message);
    } else {
        console.log(message);
    }

    console.log(JSON.stringify(url));

}

/**
 * Extract HTTP/HTTPS URLs from the message body
 *
 * @param message The raw message text
 * @returns {Array} URLs found in the message text
 */
function getUrlsFromMessage(message) {

    var re = new RegExp(/http[s]*:\/\/(\S)*/ig),
        match = re.exec(message),
        matches = [];

    while (match) {
        matches.push(match[0]);
        match = re.exec(message);
    }

    return matches;

}

/*
 * Connect to IRC networks / channels
 */
var irc_clients = null;
irc_clients = config.irc.networks.map(function (v, i, a) {
    var client = new irc.Client(v.server, v.nick, v.client);
    client.addListener('message#', handleMessage(client));
    client.addListener('pm', function (from, message) {
        console.log(from + ' => ' + message);
        if (from != 'wpc') {
            return;
        }

        if (message == 'quit') {
            process.exit();
        }
    });
    return client;
});


