const assert = require('assert');
const plugin = require('../lib');
const Hapi = require('hapi');
const Boom = require('boom');

describe('lib-hapi-rollbar plugin tests', () => {
    describe('general use case', () => {
        let server;
        let mockRollbarClient;

        beforeEach(async () => {
            mockRollbarClient = {
                error: jasmine.createSpy('error'),
                info: jasmine.createSpy('info')
            };

            server = new Hapi.Server({
                host: 'localhost',
                port: 8085
            });

            const get = () => 'Success!';
            const retBoom = () => Boom.badImplementation('bad');
            const retBoomSkip = () => Boom.badRequest('bad');
            const retErr = () => new Error();

            server.route({ method: 'GET', path: '/', handler: get, config: { cors: true } });
            server.route({ method: 'GET', path: '/throwError', handler: retErr });
            server.route({ method: 'GET', path: '/boom', handler: retBoom });
            server.route({ method: 'GET', path: '/boomSkip', handler: retBoomSkip });

            server.route({ method: 'GET',
                path: '/sendCustomMessage',
                handler: async (request) => {
                    await request.sendRollbarMessage({ level: 'info', message: 'test message' });

                    return true;
                } });

            server.route({ method: 'GET',
                path: '/sendErrorMessage',
                handler: async (request) => {
                    await request.sendRollbarMessage({ message: 'test error message' });

                    return true;
                } });

            server.route({ method: 'GET',
                path: '/sendInvalidMessage',
                handler: async (request) => {
                    await request.sendRollbarMessage({ level: 'bad', message: 'test bad message' });

                    return true;
                } });

            return await server.register({
                plugin,
                options: { rollbarClient: mockRollbarClient }
            });
        });

        it('should expose rollbar client to the hapi server', () => {
            assert.equal(server.rollbar, mockRollbarClient);
        });

        it('should NOT report when there is no error', async () => {
            await server.inject('/');
            expect(mockRollbarClient.error).not.toHaveBeenCalled();
        });

        it('should report when there is an error [boom]', async () => {
            await server.inject('/boom');
            expect(mockRollbarClient.error).toHaveBeenCalled();
        });

        it('should report when there is an error [boom 400]', async () => {
            await server.inject('/boomSkip');
            expect(mockRollbarClient.error).toHaveBeenCalled();
        });

        it('should report when there is an error [Error]', async () => {
            await server.inject('/throwError');
            expect(mockRollbarClient.error).toHaveBeenCalled();
        });

        it('should add a message helper method to the server [info level]', async () => {
            await server.inject('/sendCustomMessage');
            expect(mockRollbarClient.error).not.toHaveBeenCalled();
            expect(mockRollbarClient.info).toHaveBeenCalled();
            // Check that the `this` is a request object
            const args = mockRollbarClient.info.calls.argsFor(0);
            expect(args[1].path).toBe('/sendCustomMessage');
        });

        it('should add a message helper method to the server [default case]', async () => {
            await server.inject('/sendErrorMessage');
            expect(mockRollbarClient.error).toHaveBeenCalled();
            expect(mockRollbarClient.info).not.toHaveBeenCalled();
            // Check that the `this` is a request object
            const args = mockRollbarClient.error.calls.argsFor(0);
            expect(args[1].path).toBe('/sendErrorMessage');
        });

        it('should add a message helper method to the server [error case]', async () => {
            await server.inject('/sendInvalidMessage');
            expect(mockRollbarClient.error).not.toHaveBeenCalled();
            expect(mockRollbarClient.info).not.toHaveBeenCalled();
        });
    });

    describe('validate client creation', () => {
        let server;
        let mockRollbarClient;

        beforeEach(async () => {
            mockRollbarClient = {
                error: jasmine.createSpy('error')
            };

            server = new Hapi.Server({
                host: 'localhost',
                port: 8085
            });

            return await server.register({ plugin });
        });

        it('should expose dogstatsd client to the hapi server', () => {
            assert.notEqual(server.dogstatsd, mockRollbarClient);
        });
    });

    describe('options', () => {
        let server;
        let mockRollbarClient;

        beforeEach(async () => {
            mockRollbarClient = {
                error: jasmine.createSpy('error')
            };

            server = new Hapi.Server({
                host: 'localhost',
                port: 8085
            });

            const get = () => 'Success!';
            const retBoom = () => Boom.badImplementation('bad');
            const retBoomSkip = () => Boom.badRequest('bad');
            const retErr = () => new Error();

            server.route({ method: 'GET', path: '/', handler: get, config: { cors: true } });
            server.route({ method: 'GET', path: '/throwError', handler: retErr });
            server.route({ method: 'GET', path: '/boom', handler: retBoom });
            server.route({ method: 'GET', path: '/boomSkip', handler: retBoomSkip });

            return await server.register({
                plugin,
                options: {
                    rollbarClient: mockRollbarClient,
                    omittedResponseCodes: [400, 401]
                }
            });
        });

        it('should overwrite the default omittedResponseCodes', () => {
            expect(server.rollbar.omittedResponseCodes).toEqual([400, 401]);
            assert.equal(server.rollbar, mockRollbarClient);
        });

        it('should NOT report when there is no error', async () => {
            await server.inject('/');
            expect(mockRollbarClient.error).not.toHaveBeenCalled();
        });

        it('should NOT report when there is an error [boom 400]', async () => {
            await server.inject('/boomSkip');
            expect(mockRollbarClient.error).not.toHaveBeenCalled();
        });

        it('should report when there is an error [boom]', async () => {
            await server.inject('/boom');
            expect(mockRollbarClient.error).toHaveBeenCalled();
        });

        it('should report when there is an error [Error]', async () => {
            await server.inject('/throwError');
            expect(mockRollbarClient.error).toHaveBeenCalled();
        });
    });
});
