# @goodwaygroup/lib-hapi-rollbar

[![CircleCI](https://circleci.com/gh/GoodwayGroup/lib-hapi-rollbar.svg?style=svg)](https://circleci.com/gh/GoodwayGroup/lib-hapi-rollbar)

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
} else {
    // passthru helper method to clean up code when rollbar is not configured
    server.decorate('request', 'sendRollbarMessage', () => {});
}
```

## Configuration Options

> When passing a configuration option, it will overwrite the defaults.

You can pass in any configuration option for the [Rollbar](https://github.com/rollbar/rollbar.js) library.

Custom options:

- `omittedResponseCodes`: An `ARRAY` of HTTP codes (as integers) to not report to Rollbar.
    - Defaults to `[]`, but we recommend `[400, 401, 404, 409]` to avoid spam exceptions.

### Person Tracking

The plugin uses the standard [Person Tracking](https://docs.rollbar.com/docs/person-tracking) features. To ensure you are passing the correct info to Rollbar, place the data you want to track in the `request.auth.credentials` object. This will be copied to `request.rollbar_person` when pushing the exception to Rollbar.

### Send Custom Message

You can send custom messages to Rollbar via the `request.sendRollbarMessage` decorator. It will default to the `error` level. You use any Rollbar supported level:

```
debug
info
warning
error
critical
```

Example call:

```js
request.sendRollbarMessage({
    level: 'warning', // defaults to 'error'
    message: 'Custom Message',
    payload: { custom: { payload: 'data' } }
})
```

### Send Custom object

Rollbar allows a custom object to be passed through and sent in the payload delivered to a Rollbar occurence (see [here](https://docs.rollbar.com/docs/nodejs#section-caught-exceptions)). In `lib-hapi-rollbar`, we couple this to Boom such that any data passed in as an argument to a Boom error will be delivered through to Rollbar. For example, `Boom.badImplementation('message', data)` will result in the contents of `data` landing as part of the Rollbar occurence report.

## Running Tests

To run tests, just run the following:

```
yarn test
```

All commits are tested on [CircleCI](https://circleci.com/gh/GoodwayGroup/workflows/lib-hapi-rollbar)

## Linting

To run `eslint`:

```
yarn lint
```

To auto-resolve:

```
yarn lint:fix
```

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## Versioning

We use milestones and `npm` version to bump versions. We also employ [auto-changelog](https://www.npmjs.com/package/auto-changelog) to manage the [CHANGELOG.md](CHANGELOG.md). For the versions available, see the [tags on this repository](https://github.com/GoodwayGroup/lib-hapi-rollbar/tags).

To initiate a version change:

```
yarn version
```

## Authors

* **Derek Smith** - *Initial work* - [@clok](https://github.com/clok)

See also the list of [contributors](https://github.com/GoodwayGroup/lib-hapi-rollbar/contributors) who participated in this project.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

## Acknowledgments

* [yayuhh](https://github.com/yayuhh) and their work on [icecreambar](https://github.com/yayuhh/icecreambar)

## Sponsors

[![goodwaygroup][goodwaygroup]](https://goodwaygroup.com)

[goodwaygroup]: https://s3.amazonaws.com/gw-crs-assets/goodwaygroup/logos/ggLogo_sm.png "Goodway Group"
