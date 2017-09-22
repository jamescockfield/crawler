const exceljs = require("exceljs"),
	Readable = require("stream").Readable,
	Writable = require("stream").Writable;

function read(path, callback, data, logging, ws) {

	var logging = logging || console.log;
	//READ BOTH CSV AND XLSX
	var extension = path.split(".");
	extension = extension[extension.length - 1];

	var workbook = new exceljs.Workbook();

	//OPEN SPREADSHEET
	logging("READING SPREADSHEET:",path);

	if (typeof data === "undefined") {

		var readFunction = "readFile";
		var file = path;
	} else {

		if (data instanceof Readable || data instanceof Writable) {

			var file = data;
		} else {

			var readFunction = "read";
			var file = new Readable();
			file._read = function noop(){}
			file.push(data);
			file.push(null);
		}
	}

	workbook[extension][readFunction](file).then(function() {

		logging("OPENED WORKBOOK");

		//BUILD GLOBAL VARIABLES
		var worksheet = workbook.getWorksheet(1);
		variables = {

			websiteColumn: worksheet.getRow(1).values.indexOf("website"),
			worksheet: worksheet,
			workbook: workbook,
			results: {},
			logging: logging,
			ws: ws,
			fileName: path
		}

		callback(variables);
	});
}

function sendRequests(variables, eachRow) {

	variables.logging("ROW COUNT:", variables.worksheet.rowCount);

	//START BUILDING CRAWLERS
	variables.logging("STARTING WEBSITE REQUESTS");

	var row = 2;
	var set = setInterval(function() {

		eachRow(variables, row, variables.logging);

		if (row === variables.worksheet.rowCount) {

			clearInterval(set);
		}


		row++;

	}, 100);

	
	//WAIT FOR CRAWLERS
	waitResults(variables, variables.logging);
}

function waitResults(variables) {

	//WAIT FOR CRAWLERS
	var waitCount = 1;
	var maxWaits = 10;
	var resultCount;

	var checkInterval = setInterval(function() {

		variables.logging(Object.keys(variables.results).length.toString(), "RESPONSES OF", variables.worksheet.rowCount - 1, "PROSPECTS ( Try",waitCount,"of",maxWaits,")");

		if (resultCount === Object.keys(variables.results).length) {

			waitCount++;
		} else {
			
			waitCount = 1;
		}

		resultCount = Object.keys(variables.results).length;

		if (Object.keys(variables.results).length + 1 === variables.worksheet.rowCount) {

			clearInterval(checkInterval);
			add(variables, variables.logging);

		} else if (waitCount - 1 >= maxWaits) {

			variables.logging("REQUEST TIMEOUT");
			clearInterval(checkInterval);
			add(variables, variables.logging);
		}

	},1000);
}

function add(variables) {

	variables.logging("GATHERING RESULTS");

	for (var i = 2; i <= Object.keys(variables.results).length + 1; i++) {

		variables.worksheet.getRow(i).getCell(variables.resultColumn).value = variables.results[i];
	}

	//CHANGE TO OVERWRITE WEBSITE COLUMN
	
	var i = 2;

	while (i < variables.worksheet.rowCount) {

		var emptyResults = [
			null,
			"http://none"
		]

		var websiteResult = variables.worksheet.getRow(i).getCell(variables.websiteColumn).value;

		if (emptyResults.indexOf(websiteResult) !== -1 ||
			websiteResult.match("houzz")) {

			variables.worksheet.spliceRows(i,1);

			i--;
		}

		i++;
	}

	write(variables.workbook, variables.logging);
}

function write(workbook) {

	var fileNameToWrite = variables.fileName.replace(/(_websites)*(.xlsx|.csv)$/gi, "_" + variables.appendix + ".csv");
	variables.logging("writing to file",fileNameToWrite);

	if (variables.logging !== console.log) {
		// HTTP REQUEST

			var data = new Writable();
			data.bufferArr = [Buffer.from("filename=" + fileNameToWrite + "&","utf8")];
			data._write = function(chunk, encoding, callback) {

				data.bufferArr.push(chunk);
				callback();
			}

			console.log("writing");

			workbook.csv.write(data).then(function() {

				console.log("write success");

				if (variables.appendix === "websites") {
					// CONTINUE REQUEST WITH EMAIL SEARCH

					require("./start").start(fileNameToWrite, data, variables.logging)
				} else {

					variables.ws.send(Buffer.concat(data.bufferArr));
				}
			});
	} else {

		// LOCAL FILE SYSTEM

		workbook.csv.writeFile(fileNameToWrite).then(function() {
			variables.logging("finished!");

			if (variables.appendix === "websites") {

				require("./start").start(fileNameToWrite);
			} else {
				
				process.exit();
			}
		});
	}
}

module.exports = {

	read: read,
	sendRequests: sendRequests,
	waitResults: waitResults,
	add: add,
	write: write
}