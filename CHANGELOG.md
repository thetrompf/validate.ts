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
