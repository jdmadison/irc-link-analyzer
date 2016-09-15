/*!
 *
 */

'use strict';

var config = require('./config');

var irc = require('irc');
var gcloud = require('google-cloud')(config.gcloud);
var datastore = gcloud.datastore();

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

var default_handler = url_handlers[url_handlers.length - 1];

/**
 *
 */
var handleMessage = function (client) {
    return function (nick, to, text, message) {

        var urls = getUrlsFromMessage(text);

        if (urls.length == 0) return;

        urls.forEach(function (url, idx, arr) {

            var urlObject = new Url(url),
                key = datastore.key(['Link', urlObject.hash]);

            datastore.get(key, function (err, entity) {

                /*
                 * Check URL Cache First
                 */
                if (!err && entity != undefined) {
                    console.log('Loaded ' + url + ' from cache');
                    queue[entity.data.urlEntity.uuid] = {client: client, channel: to, from: nick};
                    return processResults(entity.data.urlEntity);
                }

                url_handlers.some(function (handler, _idx, _arr) {
                    if (handler.canHandle(url)) {
                        console.log('Queued ' + url + ' with ' + handler.name);
                        queue[urlObject.uuid] = {client: client, channel: to, from: nick};
                        handler.processUrl(urlObject);
                        return true;
                    }
                });
            });
        });
    }
};


var handlePM = function (client) {
    return function (from, message) {
        try {

            console.log(from + ' => ' + message);
            if (config.irc.control_nicks[client.conn._host].indexOf(from) == -1) {
                return;
            }

            if (message == 'quit') {
                irc_clients.forEach(function (client, idx, arr) {
                    client.disconnect();
                });
                process.exit();
            }

            if (message.startsWith('say')) {
                var say = message.split(':');
                client.say(say[1], say.slice(2).join(''));
                return;
            }

            handleMessage(client)(from, from, message, '');
        } catch (exception) {
            console.log(exception);
        }
    }
};

function processResults(url) {

    if (!url.processed) {
        console.log('Queued ' + url.url + ' with Default');
        return default_handler.processUrl(url);
    }

    console.log('Processed URL: ' + url.url);

    storeResults(url);

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

    // console.log(JSON.stringify(url));

}

function storeResults(url) {

    var key = datastore.key(['Link', url.hash]);

    datastore.save({
        key: key,
        data: {
            timestamp: new Date(),
            domain: url.domain,
            warn: url.warn,
            urlEntity: url
        }
    }, function (err, apiResponse) {
        if (!err) {
            console.log('Saved URL Result: ' + url.url);
        }
    });
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
    client.addListener('pm', handlePM(client));
    return client;
});


