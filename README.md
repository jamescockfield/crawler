# website crawler and email extractor  

Iterates through a spreadsheet of prospect websites, crawling the websites and extracting emails into the spreadsheet.

---
### TODO:

Store all "contact form" results in an array, and save as separate spreadsheet.
Store all results with error message in err spreadsheet

Logging function so we can have 1 line of status messages after the progress bar

---
### KNOWN BUGS:

spreadsheet.js write
	calls websocket request even on local file system