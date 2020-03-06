# interpretGS1scan
A set of functions for interpreting the string of data in various GS1 formats, as found in barcodes of different types

It depends on the [GS1 Digital Link toolkit](https://github.com/gs1/GS1DigitalLinkToolkit.js)

If there are no errors, the `interpretScan()` function returns an object as follows

* `AIbrackets`: The equivalent GS1 element string in human-readable AI syntax
* `AIfnc1`: The equivalent GS1 element string in AI syntax with FNC1 (as used in barcodes)
* `dl`: The equivalent GS1 Digital Link URL (on id.gs1.org)
* `ol`: An ordered array of objects parsed/interpreted from the input string:
** `ai':    the GS1 Application Identifier
** `label`: what that AI is used for
** `value`: the value
The order for the `ol` list matches that found in a GS1 Digital Link URI
1. primary identifier
2. any applicable qualifiers
3. any data attributes
4. any non-GS1 AIs and their values
Simply pass the string to be interpreted to the interpretScan() function.

It can handle any of the 3 formats:
  * Human readable AI syntax
  * Pure AI syntax
  * GS1 Digital Link

If the input string cannot be interpreted, i.e. it's not a valid GS1 string, then the returned object has a value for `errmsg` which is the system error message.
