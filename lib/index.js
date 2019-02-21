const Rollbar = require('rollbar');

const validLevels = [
    'debug',
    'info',
    'warning',
    'error',
    'critical'
];

exports.register = (server, options) => {
    const rollbarClient = options.rollbarClient || new Rollbar(options);
    rollbarClient.omittedResponseCodes = options.omittedResponseCodes || [];

    // Add Rollbar client to server
    server.decorate('server', 'rollbar', rollbarClient);

    const sendRollbarMessage = async function sendRollbarMessage({ level = 'error', message, payload }) {
        if (validLevels.indexOf(level) === -1) {
            this.log(['rollbar', 'error'], `Invalid level provided: ${level}. Must be one of [${validLevels.join(', ')}]`);
            return false;
        }

        // Inject Person Tracking data
        this.rollbar_person = this.auth.credentials;

        return await rollbarClient[level](message, payload, this, (err) => {
            if (err) {
                this.log(['rollbar', 'error'], `Error reporting to rollbar, ignoring: ${err}`);
            }
        });
    };

    // Add helper method to request
    server.decorate('request', 'sendRollbarMessage', sendRollbarMessage);

    server.ext('onPreResponse', async (request, h) => {
        const response = request.response;
        const isError = response instanceof Error;
        const omittedResponseCodes = rollbarClient.omittedResponseCodes;
        const customData = {};
        let status = response.statusCode;

        if (response.isBoom) {
            if (response.data) {
                customData.data = response.data
            }

            status = response.output.statusCode
        };

        const shouldHandleError = isError && omittedResponseCodes.indexOf(status) === -1;
        
        if (shouldHandleError) {
            // Inject Person Tracking data
            request.rollbar_person = request.auth.credentials;

            await rollbarClient.error(request.response, request, customData, (err) => {
                if (err) {
                    request.log(['rollbar', 'error'], `Error reporting to rollbar, ignoring: ${err}`);
                }
            });

            return h.continue;
        }
        return h.continue;
    });
};

exports.pkg = require('../package.json');
