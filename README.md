# interpretGS1scan
<p>A set of functions for interpreting the string of data in various GS1 formats, as found in barcodes of different types.</p>
<p>It depends on the <a href="https://github.com/gs1/GS1DigitalLinkToolkit.js">GS1 Digital Link toolkit</a>.</p>
<p>If there are no errors, the <code>interpretScan()</code> function returns an object as follows<p><ul>
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
 <p>Simply pass the string to be interpreted to the interpretScan() function.</p>
 <p>It can handle any of the 3 formats:</p><ul>
 <li>Human readable AI syntax (i.e. with brackets)</li>
 <li>Pure AI syntax (i.e. with the FNC1 character)</li>
 <li>GS1 Digital Link URI</li></ul>
<p>If the input string cannot be interpreted, i.e. it's not a valid GS1 string, then the returned object has a value for <code>errmsg</code> which is the system error message.</p>
