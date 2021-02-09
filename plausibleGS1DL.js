/*
This simple function tests whether an incoming string plausbily is or definitely isn't, a GS1 Digital link URI.
This uses the regular expressions provided in GS1 Digital Link URI syntax vesion 1.2, ratified January 2021 (see section 6 of that document)
Please note the caveats in the standard. The *only* way to be *sure* that an incoming string is a conformant GS1 Digital Link URI
is to parse it and check each element (for example, using the GS1 Digital link toolkit).

If the 'any' term is false, the incoming string is definitely not a DL URI.

Please note that convenience alphas will be removed in version 1.3 so their use is not recommended

*/

function isPlausibleGs1DlUri(s) {
  const RE1 = /^https?:(\/\/((([^\/?#]*)@)?([^\/?#:]*)(:([^\/?#]*))?))?([^?#]*)(((\/(01|gtin|8006|itip|8013|gmn|8010|cpid|414|gln|417|party|8017|gsrnp|8018|gsrn|255|gcn|00|sscc|253|gdti|401|ginc|402|gsin|8003|grai|8004|giai)\/)(\d{4}[^\/]+)(\/[^/]+\/[^/]+)?[/]?(\?([^?\n]*))?(#([^\n]*))?))/;
  const RE2 = /^https?:(\/\/((([^\/?#]*)@)?([^\/?#:]*)(:([^\/?#]*))?))?([^?#]*)(((\/(01|8006|8013|8010|414|417|8017|8018|255|00|253|401|402|8003|8004)\/)(\d{4}[^\/]+)(\/[^/]+\/[^/]+)?[/]?(\?([^?\n]*))?(#([^\n]*))?))/;
  const RE3 = /^https?:(\/\/((([^\/?#]*)@)?([^\/?#:]*)(:([^\/?#]*))?))?([^?#]*)((\/[0-9A-Za-z_-]{10,}$))/;
  let op ={};
  op.uncompressedWithAlphas = RE1.test(s);  // true if string plausibly is an uncomprssed DL URI. Allows primary key to be defined using a convenience alpha (e.g. 'gtin')
  op.uncompressed = RE2.test(s);    // true if string plausibly is an uncomprssed DL URI. Convenience alphas not allowed for primary key. *Assumes* but does not check key qualifiers are also numeric only
  op.compressed = RE3.test(s);              // true if string plausibly is a compressed DL URI. Please note that this is a weaker test than the prevous two.
  op.any = op.uncompressedWithAlphas || op.compressed;  // true if either 1 or 3 is true
  op.anyNoAlphas = op.uncompressed || op.compressed;  // true if either 2 or 3 is true
  console.log(op);
  return op;
}

