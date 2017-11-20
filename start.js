const request = require("request"),
	cheerio = require("cheerio"),
	spreadsheet = require("./spreadsheet"),
	crawler = require("./crawler");
	
/**
 * Check if we need to scrape emails, or just extract websites from houzz first
 * then send appropriate task to sendRequests
 * 
 * @param string file, the filepath of the spreadsheet to read (.csv or .xlsx)
 */
function start(file, data, logging, ws)
{
	spreadsheet.read(file, function(variables)
	{
		var houzzCount = 0,
			eachRow,
			maxCount = 7

		for (var i = 2; i < maxCount; i++)
		{
			if (variables.worksheet.getRow(i).getCell(variables.websiteColumn).value === null &&
				maxCount < variables.worksheet.rowCount) maxCount++
				
			else if (variables.worksheet.getRow(i).getCell(variables.websiteColumn).value.indexOf("houzz") >= 0) houzzCount++;
		}

		if (houzzCount > 2)
		{
			variables.appendix = "websites";
			eachRow = scrapeHouzz;
			variables.resultColumn = variables.websiteColumn;
		}
		else
		{
			variables.appendix = "emails";
			eachRow = extractEmails;
			variables.resultColumn = variables.worksheet.getRow(1).values.indexOf("email");
		}
		spreadsheet.sendRequests(variables, eachRow);
	}, data, logging, ws);
}

function scrapeHouzz(variables, rowNumber) {

	var url = variables.worksheet.getRow(rowNumber).getCell(variables.websiteColumn).value;

	request(url, function(err,response,html) {

		if (err) {

			variables.results[rowNumber] = "ERR";
			return;
		}

		var redirectedURL = response.request.uri.host;

		var $ = cheerio.load(html);
		matches = $(".proWebsiteLink").attr("href");

		if (matches !== null) {

			//console.log("FOUND WEBSITE:",matches,rowNumber);

			variables.results[rowNumber] = matches;
		} else {
			//FOUND NO EMAIL

			variables.results[rowNumber] = "";
		}
	});
}

function extractEmails(variables, row, logging) {

	var url = variables.worksheet.getRow(row).getCell(variables.websiteColumn).value;

	if (url !== null) {

		var a = new crawler.Crawler(url, function(result) {

			variables.results[row] = result;
		}, logging);

		a.firstPage();
	}

}

module.exports = {
	start: start
}

if (process.argv.length > 2) {

	start(process.argv[2]);
}