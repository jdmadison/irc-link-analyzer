'use strict';

var config = {};

config.app = {
    name: 'IRC Link Analyzer',
    version: '0.0.3'
};

/*
 * Custom URL Modules to load (imgur, photobucket, etc)
 */

config.urlHandlers = [
    {
        name: 'imgur',
        config: {
            clientId: '[ClientId]',
            delay: 500
        }
    },
    {
        name: 'default',
        config: {}
    }
];

config.handlerOptions = {
    defaultDelay: 500,
    headTimeout: 5000,
    safeSearchWarningThreshold: 'POSSIBLE'
};


/*
 * Google Cloud (Node Library)
 *
 * https://googlecloudplatform.github.io/gcloud-node/#/docs/v0.37.0/guides/authentication
 */
config.gcloud = {
    keyFilename: '/path/to/keyFile.json',
    projectId: '[gCloudProjectId]'
};

/*
 * Google Cloud (Standard API)
 */
config.google = {
    clientId: '[ClientId]',
    key: '[SecretKey]',
    apis: {
        safeBrowsing: {
            endPoint: 'https://safebrowsing.googleapis.com/v4/threatMatches:find',
            threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "THREAT_TYPE_UNSPECIFIED", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
            platformTypes: ["WINDOWS", "OSX", "ANDROID", "IOS"]
        },
        safeSearch: {
            warningThreshold: 'POSSIBLE'
        }
    }
};

/*
 * node-irc
 *
 * http://node-irc.readthedocs.io/en/latest/API.html
 */
config.irc = {
    networks: [
        {
            name: 'Freenode',
            server: 'irc.freenode.com',
            nick: 'myBot',
            client: {
                userName: '[nick]',
                password: '',
                channels: ['#channel'],
                floodProtection: true,
                floodProtectionDelay: 5000
            }
        }
    ]
};

module.exports = config;