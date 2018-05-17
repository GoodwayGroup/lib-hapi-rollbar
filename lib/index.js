const Rollbar = require('rollbar');

exports.register = (server, options) => {
    const rollbarClient = options.rollbarClient || new Rollbar(options);
    rollbarClient.omittedResponseCodes = options.omittedResponseCodes || [];

    server.decorate('server', 'rollbar', rollbarClient);

    server.ext('onPreResponse', async (request, h) => {
        const response = request.response;
        const isError = response instanceof Error;
        const status = response.isBoom ? response.output.statusCode : response.statusCode;
        const omittedResponseCodes = rollbarClient.omittedResponseCodes;
        const shouldHandleError = isError && omittedResponseCodes.indexOf(status) === -1;

        if (shouldHandleError) {
            const cb = (rollbarErr) => {
                if (rollbarErr) {
                    request.log(['rollbar', 'error'], `Error reporting to rollbar, ignoring: ${rollbarErr}`);
                }
            };

            request.rollbar_person = request.auth.credentials;

            await rollbarClient.error(request.response, request, cb);

            return h.continue;
        }
        return h.continue;
    });
};

exports.pkg = require('../package.json');
