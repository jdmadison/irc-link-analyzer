'use strict';

module.exports = {

    /*
     * Custom URL Modules to load (imgur, photobucket, etc)
     */

    load_url_handlers: [
        {
            name: 'imgur',
            config: {
                client_id: 'YOUR_CLIENT_ID'
            }
        }
    ],

    handler_options: {
        vision_warning_threshold: 'POSSIBLE'
    },

    /*
     * Google Cloud
     *
     * https://googlecloudplatform.github.io/gcloud-node/#/docs/v0.37.0/guides/authentication
     */
    gcloud: {
        keyFilename: 'PATH_TO_KEY_FILE',
        projectId: 'PROJECT_ID'
    },

    /*
     * node-irc
     *
     * http://node-irc.readthedocs.io/en/latest/API.html
     */
    irc: {
        networks: [
            {
                name: 'FreeNode',
                server: 'irc.freenode.net',
                nick: 'nick',
                client: {
                    userName: 'username',
                    password: 'password',
                    channels: ['#channels'],
                    floodProtection: true,
                    floodProtectionDelay: 5000
                }
            }
        ]
    },

}
