# @goodwaygroup/lib-hapi-rollbar

> Please do not run this plugin within tests in your application

## Usage

This plugin will push exceptions to Rollbar.

```
$ yarn add @goodwaygroup/lib-hapi-rollbar
```

In your `index.js` for the Hapi server, register the plugin:

```js
// Rollbar
if (process.env.ROLLBAR_TOKEN && ['production', 'staging'].indexOf(process.env.NODE_ENV) > -1) {
    await server.register({
        plugin: require('@goodwaygroup/lib-hapi-rollbar'), // eslint-disable-line global-require
        options: {
            accessToken: process.env.ROLLBAR_TOKEN,
            captureEmail: true,
            captureUncaught: true,
            captureUnhandledRejections: true,
            omittedResponseCodes: [400, 401, 404, 409],
            codeVersion: require('../package.json').version // eslint-disable-line global-require
        }
    });
}
```

### Options

> When passing a configuration option, it will overwrite the defaults.

You can pass in any configuration option for the [Rollbar](https://github.com/rollbar/rollbar.js) library.

Custom options:

- `omittedResponseCodes`: An `ARRAY` of HTTP codes (as integers) to not report to Rollbar.
    - Defaults to `[]`, but we recommend `[400, 401, 404, 409]` to avoid spam exceptions.

#### Person Tracking

The plugin uses the standard [Person Tracking](https://docs.rollbar.com/docs/person-tracking) features. To ensure you are passing the correct info to Rollbar, place the data you want to track in the `request.auth.credentials` object. This will be copied to `request.rollbar_person` when pushing the exception to Rollbar.
