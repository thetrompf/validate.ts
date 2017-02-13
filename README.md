Validate.ts
===========

This library is heavily inspired by [validate.js](https://validatejs.org/).
It is a data source agnostic user input validation library.

The public API and how constraints are configured is stolen from validate.js,
the internal implementation however is a ground-up rework, to be able
to leverage asynchronous values retrieved from promises, and declaratively
configure field based data dependency in validators.

### WARNING: This readme is far from complete. ###
