/* 
  A set of functions for interpreting the string of data in various GS1 formats, as found in barcodes of different types
  It depends on the GS1 Digital Link toolkit
  If there are no errors, the interpretScan function returns an object as follows

  AIbrackets: The equivalent GS1 element string in human-readable AI syntax
  AIfnc1: The equivalent GS1 element string in AI syntax with FNC1 (as used in barcodes)
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
    - Human readable AI syntax
    - Pure AI syntax
    - GS1 Digital Link

  If the input string cannot be interpreted, i.e. it's not a valid GS1 string, then the returned object
  has a value for errmsg which is the system error message.

*/

function interpretScan(scan) {
  let httpURIre = /^https:(\/\/((([^\/?#]*)@)?([^\/?#:]*)(:([^\/?#]*))?))?([^?#]*)(\?([^#]*))?(#(.*))?/;
  let gtinRE = /^(\d{8})$|^(\d{12,14})$/;
  let e, gs1DigitalLinkURI, gs1ElementStrings, gs1Array, primaryKey, AIstringBrackets, AIstringFNC1, errmsg, gs1dlt;
  let dlOrderedAIlist = [];
  let dateAIs = ['11', '12', '13', '15', '17'];

  if (e = scan.match(gtinRE)) {
    scan = '(01)' + scan;
  } else if (scan.indexOf(String.fromCharCode(29)) == 0) {
    scan = scan.substring(1);
    console.log('We have this ' + scan);
  }

  try {
    gs1dlt = new GS1DigitalLinkToolkit();
    if (e = scan.match(httpURIre)) {
      try {
      	gs1ElementStrings = gs1dlt.gs1digitalLinkToGS1elementStrings(scan, true);
        gs1DigitalLinkURI = scan;
      } catch(err) {
      	console.log(err);
        errmsg = err;
      }
    } else {
      try {
      	gs1DigitalLinkURI = gs1dlt.gs1ElementStringsToGS1DigitalLink(scan, false, 'https://id.gs1.org');
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
    }

    // Want to find the primary identifier
    // We'll use the aitable 
    let done = [];  // Use this to keep track of what we've done
    for (i in gs1Array.GS1) {
      if (gs1dlt.aitable.find(x => x.ai === i).type === 'I') {
        primaryKey = i;
        dlOrderedAIlist.push(getAIElement(i, gs1dlt, gs1Array.GS1, dateAIs));
        done.push(i);
      }
    }
    gs1dlt.aiQualifiers[primaryKey].forEach(function(i) {
      if (gs1Array.GS1[i] !== undefined) {
        dlOrderedAIlist.push(getAIElement(i, gs1dlt, gs1Array.GS1, dateAIs));
        done.push(i);
      }
    });
    //console.log(orderedAIlist); // These are the ones we have already got. We need to get the rest but these can be in any order
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
