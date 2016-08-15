/*!
 *
 */

'use strict';

var config = require('./config');

var irc = require('irc');
var gcloud = require('gcloud')(config.gcloud);

/*
 * Load url handlers
 */
var url_handlers = config.load_url_handlers.map(function (v, i, a) {
    return {
        fn: require('./handlers/' + v.name),
        config: v.config
    };
});

/*
 * Push default handler to the end of the array so it will run last
 */
url_handlers.push({
    fn: require('./handlers/default'),
    config: config.handler_config
});

/*
 * Connect to IRC networks / channels
 */
var irc_clients = null;
irc_clients = config.irc.networks.map(function (v, i, a) {
    var client = new irc.Client(v.server, v.nick, v.client);
    client.addListener('message#', handleMessage);
    return client;
});


/**
 *
 * @param nick Sender
 * @param to Recipient (user or channel)
 * @param text The raw message text
 * @param message Message Object
 */
function handleMessage(nick, to, text, message) {

    var urls = getUrlsFromMessage(text).map(function (v, i, a) {
        return {
            url: v,
            short: v.length <= 30 ? v : v.substr(0, 13) + '....' + v.substr(-13, 13),
            handled: false,
            handler: null,          // the name of the url handler
            result: {
                title: null,        // image/page/gallery title
                type: null,         // image, gallery, page, etc
                safe_search: {},    // google detectSafeSearch response
                tags: []            // handler-specific tags (nsfw, advertising, etc)
            },
            report: null            // content report to send back to IRC
        }
    });

    if (urls.length == 0) return;

    /*
     * Run url handlers one at a time, so each subsequent one will only have to examine urls not processed
     * by the previeus handlers.
     */
    var runHandler = function (handler, urls, handlers, irc_client, irc_to) {

        /*
         * handler will be undefined when `shift` is run on an empty array
         */
        if (handler == undefined) {
            return processResults(urls, irc_client, irc_to);
        }

        var handler_fn = new handler.fn(handler.config, config.handler_options, gcloud);
        handler_fn.processUrls(urls, function (results) {
            urls = results;
            runHandler(handlers.shift(), urls, handlers, irc_client, irc_to);
        });

    };

    var handlers = url_handlers.slice(0)

    runHandler(handlers.shift(), urls, handlers, this || null, to);

}

function processResults(results, client, to) {

    var vision = require('gcloud').vision;

    results.forEach(function (result, index, arr) {

        console.log('Processed URL: ' + result.url);

        var safe_search = result.result.safe_search,
            warnings = result.result.tags;

        for (var key in safe_search) {
            if (vision.likelihood[safe_search[key]] >= vision.likelihood[config.handler_options.vision_warning_threshold]) {
                warnings.push(key[0].toUpperCase() + key.slice(1) + ' (' + safe_search[key][0] + safe_search[key].slice(1).toLowerCase().replace(/_/, ' ') + ')');
            }
        }

        if (warnings.length == 0) {
            return;
        }

        var title = result.result.title ? ' | ' + result.result.title : '',
            message = 'Content Warning (' + result.short + title + '): ' + warnings.join(', ');

        console.log(to + ' => ' + message);
        if (client) {
            client.say(to, message);
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


