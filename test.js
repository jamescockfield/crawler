const crawler = require("./crawler");
// ERR WEBSITES
// http://www.morettiinteriordesign.com
// http://www.playinteriordesign.com
// http://elladewastney.co.uk/

// http://www.vanessabuirskiinteriors.com

// http://www.crystalstone.co.uk/
// http://www.jeffreyhitchcock.com

var test = new crawler.Crawler("http://www.crystalstone.co.uk/");

test.firstPage();