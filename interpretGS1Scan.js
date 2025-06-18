/* 
  A set of functions for interpreting the string of data in various GS1 formats, as found in barcodes of different types

  Dependecies:
    The GS1 Digital Link toolkit
    plausibleGS1DL

  Please note that the interpret scan function works for element syntax as well as GS1 Digital Link

  If there are no errors, the interpretScan function returns an object as follows

  AIbrackets: The equivalent GS1 element string in human-readable Emlement String syntax
  AIfnc1: The equivalent GS1 element strings with FNC1 (as used in barcodes)
  dl: The equivalent GS1 Digital Link URL (on id.gs1.org)
  ol: An ordered array of objects parsed/interpreted from the input string:
    ai:    the GS1 Application Identifier
    label: what that AI is used for
    value: the value

  The order for the ol list matches that found in a GS1 Digital Link URI
    - primary identifier
    - any applicable qualifiers
    - any data attributes
    - any non-GS1 AIs and their values

  Simply pass the string to be interpreted to the interpretScan() function.

  It can handle any of the 3 formats:
    - Human readable Element String syntax
    - Pure Element String syntax
    - GS1 Digital Link

  If the input string cannot be interpreted, i.e. it's not a valid GS1 string, then the returned object
  has a value for errmsg which is the system error message.

*/

async function interpretScan(scan) {
  let gtinRE = /^(\d{8})$|^(\d{12,14})$/;
  let e, gs1DigitalLinkURI, gs1ElementStrings, gs1Array, primaryKey, AIstringBrackets, AIstringFNC1, errmsg, gs1dlt;
  let dlOrderedAIlist = [];
  let dateAIs = ['11', '12', '13', '15', '17'];
  let doNotEscape = false;

  if (e = scan.match(gtinRE)) {  // So we just have a GTIN (from an EAN/UPC probably)
    scan = '(01)' + scan;
    doNotEscape = true;
  } else if (scan.indexOf(String.fromCharCode(29)) == 0) {
    scan = scan.substring(1);
    console.log('We have this ' + scan);
  }
  // Let's also see if it's a DL URI
  let plausibleDL = isPlausibleGs1DlUri(scan);
  // Either way, we're going to need the DL toolkit
  try {
    gs1dlt = new GS1DigitalLinkToolkit();
    if (plausibleDL.any) {
      if (!plausibleDL.uncompressedWithAlphas) {
        scan = gs1dlt.decompressGS1DigitalLink(scan,false,'https://id.gs1.org');  // Decompress if it's likely to be compressed
      }
      // If we're here, the input must have been a DL URI and scan must be decompressed
      try {
      	gs1ElementStrings = gs1dlt.gs1digitalLinkToGS1elementStrings(scan, true);
        gs1DigitalLinkURI = scan;
      } catch(err) {
      	console.log(err);
        errmsg = err;
      }
    } else {  // Hopefully scan is an element string then, which we can convert to a DL URI, remembering to escape reserved characters first
      try {
      	gs1DigitalLinkURI = doNotEscape ? gs1dlt.gs1ElementStringsToGS1DigitalLink(scan, false, 'https://id.gs1.org') : gs1dlt.gs1ElementStringsToGS1DigitalLink(escapeReservedCharacters(scan), false, 'https://id.gs1.org');
      } catch(err) {
     	  console.log(err);
        errmsg = err;
      }
    }
    //    console.log('We have a DL of ' + gs1DigitalLinkURI);
  } catch(err) {
    console.log(err);
    errmsg = err;
  }

  // Whatever the input, we have a DL or an error. If an error, the value of gs1DigitalLinkURI is undefined
  if (gs1DigitalLinkURI == undefined) {
    return {'errmsg' : errmsg}
  } else {
    try {
      gs1Array = gs1dlt.extractFromGS1digitalLink(gs1DigitalLinkURI);
    } catch(err) {
    	console.log(err);
      return {'errmsg' : err}  // Quit here if we have an error
    }

    // Want to find the primary identifier
    // We'll use the aitable 
    let done = [];  // Use this to keep track of what we've done
    for (i in gs1Array.GS1) {
      if (gs1dlt.aitable.find(x => x.ai === i).type === 'I') {
        primaryKey = i;
        console.log(`Primary key is ${primaryKey} and its value is ${gs1Array.GS1[primaryKey]}`);
        dlOrderedAIlist.push(getAIElement(i, gs1dlt, gs1Array.GS1, dateAIs));
        done.push(i);
      }
    }
    if (gs1dlt.aiQualifiers[primaryKey] !== undefined) {
      gs1dlt.aiQualifiers[primaryKey].forEach(function(i) {
        if (gs1Array.GS1[i] !== undefined) {
          dlOrderedAIlist.push(getAIElement(i, gs1dlt, gs1Array.GS1, dateAIs));
          done.push(i);
        }
      });
    }
    //console.log(dlOrderedAIlist); // These are the ones we have already got. We need to get the rest but these can be in any order
    for (i in gs1Array.GS1) {
      if (!done.includes(i)) {
        dlOrderedAIlist.push(getAIElement(i, gs1dlt, gs1Array.GS1, dateAIs));
        done.push(i);
      }
    }
    for (i in gs1Array.other) { // These are the non-GS1 elements that can occur in a DL URI. We don't know the labels
      if (!dlOrderedAIlist.includes(i)) {
        let temp = {};
        temp['ai'] = i;
        temp['value'] = gs1Array.other[i];
        dlOrderedAIlist.push(temp);
        done.push(i);
      }
    }
    let returnObject = sortElementString(gs1Array.GS1);
    returnObject['ol'] = dlOrderedAIlist;
    returnObject['dl'] = gs1DigitalLinkURI;
    returnObject['licensingMO'] = await getLicensingMO(primaryKey, gs1Array.GS1[primaryKey]);
    console.log(returnObject);
    return returnObject;
  }
}


function getAIElement(e, gs1dlt, values, dateAIs) {
  ro = {};
  ro['ai'] = e;
  ro['label'] = gs1dlt.aitable.find(x => x.ai === e).label;
  ro['value'] = dateAIs.includes(e) ? gs1ToISO(values[e]) : values[e];
  return ro;
}


function sortElementString(a) {
  // This creates two GS1 element string versions of the given array, one with brackets, one with FNC1
  // Order is:
  // Primary key
  // Fixed length
  // The rest

  let gs1dlt = new GS1DigitalLinkToolkit();
  let sortedBrackets = '';
  let sortedFNC1 = '';
//  const FNC1 = String.fromCharCode(29);
  const FNC1 = gs1dlt.groupSeparator;
  for (i in a) {    // Look for the primary key
    if (gs1dlt.aitable.find(x => x.ai == i).type == 'I') {
      sortedBrackets = '(' + i + ')' + a[i];
      sortedFNC1 = FNC1 + i + a[i];
    }
  }
  for (i in a) {    // Look for fixed length AIs
    if ((sortedBrackets.indexOf('('+ i + ')') == -1) && (gs1dlt.aitable.find(x => x.ai == i).fixedLength == true)) {
      sortedBrackets += '(' + i + ')' + a[i];
      sortedFNC1 += i + a[i];
    }
  }
  for (i in a) {    // Everything else
    if (sortedBrackets.indexOf('('+ i + ')') == -1) {
      sortedBrackets += '(' + i + ')' + a[i];
      sortedFNC1 += i + a[i] + FNC1;
    }
  }
  if (sortedFNC1.lastIndexOf(FNC1) == sortedFNC1.length -1) { sortedFNC1 = sortedFNC1.substring(0, sortedFNC1.length -1)}
  console.log(sortedBrackets);
  console.log(sortedFNC1);
  return {'AIbrackets' : sortedBrackets, 'AIfnc1' : sortedFNC1}
}
function gs1ToISO(gs1Date) {
  let rv="";
  let regexDate= new RegExp("^\\d{6}$");
  if (gs1Date !== undefined && regexDate.test(gs1Date)) {
    let doubleDigits = gs1Date.split(/(\d{2})/);
    let year=parseInt(doubleDigits[1]);
    let currentYear=new Date().getFullYear().toString();
    let currentLastYY=parseInt(currentYear.substr(-2));
    let currentFirstYY=parseInt(currentYear.substr(0,2));
    let diff=year-currentLastYY;
    let fullyear=currentFirstYY.toString()+year.toString();
    if (diff >=51 && diff <= 99) {
      fullyear=(currentFirstYY-1).toString()+year.toString();
    }
    if (diff >= -99 && diff <= -50) {
      fullyear=(currentFirstYY+1).toString()+year.toString();
    }
    if (fullyear !== undefined) {
      rv = fullyear + '-' + doubleDigits[3];
      if (doubleDigits[5] != '00') {
        rv += '-' + doubleDigits[5];
      }
    }
  }
  return rv;
}

// encodeURIComponent is too general. In particular, it will percent-encode the FNC1 character in an element string
// So this little function just %-encodes the ones we actually need to. There's probably a fancy way of doing this with
// a single regex but, well... I hope you'll forgive the verbosity.
function escapeReservedCharacters(str) {
  str = str.replace("#", "%23");
  str = str.replace("/", "%2F");
  str = str.replace("%", "%25");
  str = str.replace("&", "%26");
  str = str.replace("+", "%2B");
  str = str.replace(",", "%2C");
  str = str.replace("!", "%21");
  str = str.replace("(", "%28");
  str = str.replace(")", "%29");
  str = str.replace("*", "%2A");
  str = str.replace("'", "%27");
  str = str.replace(":", "%3A");
  str = str.replace(";", "%3B");
  str = str.replace("<", "%3C");
  str = str.replace("=", "%3D");
  str = str.replace("<", "%3E");
  str = str.replace("?", "%3F");
  return str;
}

const getLicensingMO = async (primaryKey, pkValue) => {
  let mo;
  /* We need the list of MO prefixes which comes from a separate file */
  await fetch("https://gs1.github.io/interpretGS1scan/MOprefixStrings.json")
    .then(response => response.json())
    .then(moPrefixes => {
      const offset = primaryKey === '01' ? 1:0;
      mo = moPrefixes.find(x => x.prefix === pkValue.substring(offset,x.prefix.length + offset)).mo;
    });
  return mo;
}

const getCoO = async (numeric) => {
  let country;
  /* We need the list of numeric country codes which comes from a separate file */
  /* Original source is https://github.com/lukes/ISO-3166-Countries-with-Regional-Codes */
  await fetch("https://gs1.github.io/interpretGS1scan/slim-2.json")
    .then(response => response.json())
    .then(isoCodes => {
      country = isoCodes.find(x => x['country-code'] === numeric).name;
    });
  return `${numeric} (${country})`;
}


async function displayInterpretation(scan, outputNode) {
  let scanObj = await interpretScan(scan);
  outputNode.innerHTML = '';

  // We can test whether we have any errors at this point by looking for a value of errmsg

  if (scanObj.errmsg !== undefined) {
    console.log('From GS1 Digital Link toolkit: ' + scanObj.errmsg);
    let p = document.createElement('p');
    p.classList.add('error');
    p.appendChild(document.createTextNode(scanObj.errmsg));
    outputNode.appendChild(p);   
  } else {    
    let label = document.createElement('label');
    label.classList.add('sectionHeader');
    label.htmlFor = 'identifiers';
    label.appendChild(document.createTextNode('GS1 identifiers'));
    outputNode.appendChild(label);
    let div = document.createElement('div');
    div.id = 'identifiers';
    for (i in scanObj.ol) { // scanObj.ol is the ordered list we want to go through
      let p = document.createElement('p');
      p.id = '_' + scanObj.ol[i].ai;
      p.classList.add('aiDisplay');
      let span = document.createElement('span');
      span.classList.add('ai');
      let ai = (scanObj.ol[i].ai == undefined) ? '' : scanObj.ol[i].ai;
      span.appendChild(document.createTextNode(ai));
      p.appendChild(span);
      span = document.createElement('span');
      span.classList.add('aiLabel');
      label = (scanObj.ol[i].label == undefined) ? '' : scanObj.ol[i].label;
      span.appendChild(document.createTextNode(label));
      p.appendChild(span);
      span = document.createElement('span');
      p.appendChild(span);
      span = document.createElement('span');
      span.classList.add('aiValue');
      let v = '';
      if (scanObj.ol[i].value !== undefined) {
        console.log(`scanObj.ol[i].ai is ${scanObj.ol[i].ai} and the value is ${scanObj.ol[i].value}`)
        v = (scanObj.ol[i].ai === "422") ? await getCoO(scanObj.ol[i].value) : scanObj.ol[i].value;
      }
      span.appendChild(document.createTextNode(v));
      p.appendChild(span);
      div.appendChild(p);
    }
    outputNode.appendChild(div);

    // Now we want to show the different formats of the scanned string.

    label = document.createElement('label');
    label.htmlFor = 'syntaxes';
    label.classList.add('sectionHeader');
    label.appendChild(document.createTextNode('Equivalent identifiers'));
    outputNode.appendChild(label);
    div = document.createElement('div');
    div.id = 'syntaxes';
    let p = document.createElement('p');
    label = document.createElement('label');
    label.htmlFor = 'aiBrackets';
    label.appendChild(document.createTextNode('Human-readable GS1 Element String syntax'));
    let span = document.createElement('span');
    span.classList.add('syntax');
    span.id = 'aiBrackets';
    span.appendChild(document.createTextNode(scanObj.AIbrackets));
    p.appendChild(label);
    p.appendChild(span);
    div.appendChild(p);

    p = document.createElement('p');
    label = document.createElement('label');
    label.htmlFor = 'aiFNC1';
    label.appendChild(document.createTextNode('Native GS1 Element String syntax'));
    span = document.createElement('span');
    span.classList.add('syntax');
    span.id = 'aiFNC1';
    span.appendChild(document.createTextNode(scanObj.AIfnc1));
    p.appendChild(label);
    p.appendChild(span);
    div.appendChild(p);

    p = document.createElement('p');
    label = document.createElement('label');
    label.htmlFor = 'dl';
    label.appendChild(document.createTextNode('GS1 Digital Link URI'));
    span = document.createElement('span');
    span.classList.add('syntax');
    span.id = 'dl';
    let a = document.createElement('a');
    a.href = scanObj.dl;
    a.appendChild(document.createTextNode(scanObj.dl));
    span.appendChild(a);
    p.appendChild(label);
    p.appendChild(span);
    div.appendChild(p);

    outputNode.appendChild(div);

    label = document.createElement('label');
    label.htmlFor = 'licensingMO';
    label.classList.add('sectionHeader');
    label.appendChild(document.createTextNode('Licensing GS1 Member Organisation'));
    outputNode.appendChild(label);
    div = document.createElement('div');
    div.id = 'licensingMO';
    p = document.createElement('p');
    p.appendChild(document.createTextNode(scanObj.licensingMO));
    div.appendChild(p);

    outputNode.appendChild(div);

  }
}

