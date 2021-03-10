# Interpret GS1 scan

<p>Interpret GS1 scan is a JavaScript library that interprets a given string of data as its constituent GS1 application identifiers and their values. It accepts AI syntax, both human readable and using FNC1, as well as GS1 Digital Link URIs. The primary use case is the interpretation of a string captured by scanning a barcode.</p>
 
 # Dependency

<p>Interpret GS1 scan depends on the <a href="https://github.com/gs1/GS1DigitalLinkToolkit.js">GS1 Digital Link toolkit</a> and the <a href="plausibleGS1DL.js">plausibleGS1DL.js</a> function. The latter includes ample documentation within the code itself and exists to provide a simple way to
determine whether a given string plausibly is, or definitely is not, a GS1 Digital Link URI.</p>

# The Interpret Scan function

<p>If there are no errors, the <code>interpretScan()</code> function returns an object as follows</p><ul>
 <li><code>AIbrackets</code>: The equivalent GS1 element string in human-readable AI syntax</li>
<li><code>AIfnc1</code>: The equivalent GS1 element string in AI syntax with FNC1 (as used in barcodes)</li>
 <li><code>dl</code>: The equivalent GS1 Digital Link URL (on id.gs1.org)</li>
<li><code>ol</code>: An ordered array of objects parsed/interpreted from the input string:<ul>
 <li><code>ai</code>: the GS1 Application Identifier</li>
 <li><code>label</code>: what that AI is used for</li>
  <li><code>value</code>: the value</li></ul></li></ul>
 <p>The order for the <code>ol</code> list matches that found in a GS1 Digital Link URI</p><ol>
 <li>primary identifier</li>
 <li>any applicable qualifiers</li>
 <li>any data attributes</li>
 <li>any non-GS1 AIs and their values</li></ol>
 <p>Simply pass the string to be interpreted to the `interpretScan()` function.</p>
 <p>It can handle any of the 3 formats as input:</p><ul>
 <li>Human readable AI syntax (i.e. with brackets)</li>
 <li>Pure AI syntax (i.e. with the FNC1 character)</li>
 <li>GS1 Digital Link URI</li></ul>
<p>If the input string cannot be interpreted, i.e. it's not a valid GS1 string, then the returned object has a value for <code>errmsg</code> which is the system error message.</p>

# Display interpretation

<p>A second function, <code>displayInterpretation()</code> takes two parameters: the string (which it passes to <code>interpretScan()</code>) and the element in an HTML page to which it can write its interpretation (as a number of DOM elements).</p>

<p>A basic <a href="https://gs1.github.io/interpretGS1scan/">demo is available</a>.</p>

# Scanner demo

<p>You might want to head over to the <a href="https://gs1.github.io/interpretGS1scan/camera.html">scanner demo</a>.</p>
<img src="demoQR.gif" alt="QR code for https://gs1.github.io/interpretGS1scan/camera.html" style="width:116px; margin:0 auto; display:block; margin: 1em" />
<p>Sadly, <strong>this demo does not work in all browsers</strong>. It seems to work well with:</p><ul>
 <li>Samsung Internet on Android</li>
 <li>Chrome on Android</li></ul>
 <p>It is usable but without the beep or choice of camera when used with Safari on iOS</p>
 <p>It does not work with Chrome on iOS</p>
 <p>It does not work with Firefox on Windows</p>
 <p>We'll do what we can to improve this but a lot of it is down to the underlying libraries and the variance in implementation of the camera API across browsers and platforms.</p>

