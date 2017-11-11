## 2.0.7 (November 11, 2017)
* Don't pack unncessary files

## 2.0.6 (November 11, 2017)
* Updated all dependencies.
* Modernized the code and the types.
* Fix the tests and code to conform with the new typescript and jest versions.

## 2.0.5 (August 21, 2017)
* Hopefully types are properly generated and distributed.
* Keep all dependencies fully up-to-date.

## 2.0.4 (August 18, 2017)
* "Properly" extend `Error` classes, in order to make instanceof checks on catched errors.

## 2.0.3 (August 16, 2017)
* Types are now generated in the `types/` directory and referenced correctly in `package.json`.
* Declare modules for ES2015 with the `module` directive in `package.json`, this convension
  is used by both `webpack` and `rollup` and probably more, this enables better tree-shaking
  when uses build tools.
* **Breaking chagne**: The required validation is no longer special cased
  the null/empty case need to be handled by validators it self,
  I have provided the old required validator behavior as a helper.

## 2.0.2 (Febrary 24, 2017)
* Nothing happened, just testing publishing through CI.

## 2.0.1 (February 24, 2017)
* Fix type mappings for npm package

## 2.0.0 (February 23, 2017)
* Complex live validation is now possible,
  we now have the same power of expression as the static validation (#1, #2, !1)
* Added DOM helpers, to remove some boilerplate when validating HTML forms (#6, !2)
* **Breaking change**: `errorHandler` in live validation becomes `changeMap`,
  not only errors are emitted now, all touched nodes and their error state is returned. (!2)

## 1.0.2 (February 16, 2017)
* Regression: fix error in build process.
  Don't depend on yarn in npm scripts

## 1.0.1 (February 16, 2017)

* Simple live validation.
  It is now possible to hook up live validators on a node/field
  and run them when the node/field changes

## 1.0.0 (February 13, 2017)

* Asynchronous values are resolved before passed to the validators
* Initial public API for constraint based user input validation
* Implemented dependency graph
