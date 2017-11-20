const crawler = require("./crawler");

// Regression Suite
var cases = 
[
	"http://www.morettiinteriordesign.com",
	"http://www.playinteriordesign.com",
	"http://elladewastney.co.uk/",
	"http://www.vanessabuirskiinteriors.com",
	"http://www.crystalstone.co.uk/",
	"http://www.jeffreyhitchcock.com",
	"http://www.eurofurniture.com",
	"http://harken-interiors.com"
];

for (var i in cases)
{
	var test = new crawler.Crawler(cases[i]);
	test.firstPage();
}