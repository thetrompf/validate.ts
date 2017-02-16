Validate.ts
===========

This library is heavily inspired by [validate.js](https://validatejs.org/).
It is a data source agnostic user input validation library.

The public API and how constraints are configured is stolen from validate.js,
the internal implementation however is a ground-up rework, to be able
to leverage asynchronous values retrieved from promises, and declaratively
configure field based data dependency in validators.

## Support ##

The project is fully tested with node 6.x and 7.x and work under those environment
it probably works under 4.x and 5.x as well, but the ts-jest does not work
with `node < 6.x`, so the tests will not run through `ts-jest`.
The builded project will propabbly run if using either commonjs (`lib`)
or one of the browser builds through module bundlers, but again I haven't tested it.

### WARNING: This readme is far from complete. ###
