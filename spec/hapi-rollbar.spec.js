const assert = require('assert');
const nock = require('nock');
const Hapi = require('@hapi/hapi');
const Boom = require('@hapi/boom');
const plugin = require('../lib');

describe('lib-hapi-rollbar plugin tests', () => {
    describe('general use case', () => {
        let server;
        let mockRollbarClient;

        beforeEach(async () => {
            mockRollbarClient = {
                error: jest.fn(),
                info: jest.fn()
            };

            server = new Hapi.Server({
                host: 'localhost',
                port: 8085
            });

            const get = () => 'Success!';
            const retBoom = () => Boom.badImplementation('bad');
            const retBoomSkip = () => Boom.badRequest('bad');
            const retErr = () => new Error();

            server.route({
                method: 'GET', path: '/', handler: get, config: { cors: true }
            });
            server.route({ method: 'GET', path: '/throwError', handler: retErr });
            server.route({ method: 'GET', path: '/boom', handler: retBoom });
            server.route({ method: 'GET', path: '/boomSkip', handler: retBoomSkip });

            server.route({
                method: 'GET',
                path: '/sendCustomMessage',
                handler: async (request) => {
                    await request.sendRollbarMessage({
                        level: 'info',
                        message: 'test message',
                        payload: { test: 'payload' }
                    });

                    return true;
                }
            });

            server.route({
                method: 'GET',
                path: '/sendErrorMessage',
                handler: async (request) => {
                    await request.sendRollbarMessage({ message: 'test error message' });

                    return true;
                }
            });

            server.route({
                method: 'GET',
                path: '/sendInvalidMessage',
                handler: async (request) => {
                    await request.sendRollbarMessage({ level: 'bad', message: 'test bad message' });

                    return true;
                }
            });

            return server.register({
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
            const args = mockRollbarClient.info.mock.calls[0];
            expect(args[2].path).toBe('/sendCustomMessage');
            expect(args[1]).toEqual({ test: 'payload' });
        });

        it('should add a message helper method to the server [default case]', async () => {
            await server.inject('/sendErrorMessage');
            expect(mockRollbarClient.error).toHaveBeenCalled();
            expect(mockRollbarClient.info).not.toHaveBeenCalled();
            // Check that the `this` is a request object
            const args = mockRollbarClient.error.mock.calls[0];
            expect(args[2].path).toBe('/sendErrorMessage');
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
                error: jest.fn()
            };

            server = new Hapi.Server({
                host: 'localhost',
                port: 8085
            });

            return server.register({ plugin });
        });

        it('should expose rollbar client to the hapi server', () => {
            assert.notEqual(server.rollbar, mockRollbarClient);
        });
    });

    describe('options', () => {
        let server;
        let mockRollbarClient;

        beforeEach(async () => {
            mockRollbarClient = {
                error: jest.fn()
            };

            server = new Hapi.Server({
                host: 'localhost',
                port: 8085
            });

            const get = () => 'Success!';
            const retBoom = () => Boom.badImplementation('bad');
            const retBoomSkip = () => Boom.badRequest('bad');
            const retErr = () => new Error();

            server.route({
                method: 'GET', path: '/', handler: get, config: { cors: true }
            });
            server.route({ method: 'GET', path: '/throwError', handler: retErr });
            server.route({ method: 'GET', path: '/boom', handler: retBoom });
            server.route({ method: 'GET', path: '/boomSkip', handler: retBoomSkip });

            return server.register({
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
    });

    describe('validate client creation', () => {
        let server;
        let mockRollbarClient;

        beforeEach(async () => {
            mockRollbarClient = {
                error: jest.fn()
            };

            server = new Hapi.Server({
                host: 'localhost',
                port: 8085
            });

            return server.register({ plugin });
        });

        it('should expose rollbar client to the hapi server', () => {
            assert.notEqual(server.rollbar, mockRollbarClient);
        });
    });

    describe('Rollbar callbacks', () => {
        let server;

        beforeAll(() => {
            nock.disableNetConnect();
        });

        afterAll(() => {
            nock.enableNetConnect();
        });

        beforeEach(async () => {
            server = new Hapi.Server({
                host: 'localhost',
                port: 8085
            });

            const retBoomPayload = () => Boom.badRequest('bad', { testkey: 'testval' });

            server.route({ method: 'GET', path: '/boom', handler: () => Boom.badRequest('bad') });
            server.route({ method: 'GET', path: '/boomPayload', handler: retBoomPayload });

            server.route({
                method: 'GET',
                path: '/realFailure',
                handler: async (request) => request.sendRollbarMessage({ message: 'gonna get nocked' })
            });

            return server.register({
                plugin,
                options: {}
            });
        });

        describe('#sendRollbarMessage', () => {
            // NOTE: This is a sideeffect test. By having the lifecycle complete without
            // error we are validating that the request.log method is functioning correctly
            it('should return cleanly and log an error when there is an issue reporting to Rollbar', async () => {
                // This will cause a failure due to the header not being set
                nock('https://api.rollbar.com').post('/api/1/item/');

                const response = await server.inject('/realFailure');
                expect(response.statusCode).toBe(200);
            });
        });

        describe('#onPreResponse', () => {
            // NOTE: This is a sideeffect test. By having the lifecycle complete without
            // error we are validating that the request.log method is functioning correctly
            it('should return cleanly and log an error when there is an issue reporting to Rollbar', async () => {
                // This will cause a failure due to the header not being set
                nock('https://api.rollbar.com').post('/api/1/item/');

                const response = await server.inject('/boom');
                expect(response.statusCode).toBe(400);
            });

            it('should return cleanly and log an error including a custom data object when there is an issue reporting to Rollbar', async () => {
                // This will cause a failure due to the header not being set
                nock('https://api.rollbar.com').post('/api/1/item/');

                const response = await server.inject('/boomPayload');
                expect(response.statusCode).toBe(400);
            });
        });
    });
});
