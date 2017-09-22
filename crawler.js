const request = require("request"),
	sitemaps = require("./sitemaps");

exports.Crawler = function(url, callback, logging) {

	this.url = url.split("/").splice(0,3).join("/");

	this.userAgent = "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:54.0) Gecko/20100101 Firefox/54.0";

	this.finalRequestResults = {};

	this.callback = callback || function(result) {
		console.log(result);
	}
	this.logging = logging || function(result) {
		console.log(result);
	}

	this.search = function(html) {

		//MUST NOT RETURN EMPTY STRING

		if (html === null) {
			return null;
		}

		var emailRegex = /([a-z0-9._-]+@[a-z0-9._-]+\.[a-z0-9._-]+)/i

		var matches = html.match(emailRegex);

		if (matches === null) {
			return null;
		}

		var i = 0;
		var images = ["png","jpg","peg","gif","pdf"];

		while (i < matches.length) {

			var extension = matches[i].slice(-3, matches[i].length);

			if (images.indexOf(extension) >= 0) {
				
				matches.splice(i, 1);
				i--;
			}

			i++;
		}
		
		if (matches.length === 0) {
			return null;
		}

		return matches[0];
	}

	this.firstPage = function() {

		var scope = this;
		var	options = {
				url: scope.url,
				headers: {
					"User-Agent": scope.userAgent
				}
			}

		request.apply(scope, [options, function(err, response, html) {

			// scope.logging("FIRST REQUEST");

			if (err) {

				scope.callback("ERR NO RESPONSE");
				return;
			}

			if (response.statusCode >= 400) {

				scope.callback("ERR " + response.statusCode.toString());
				return;
			}

			var match = scope.search(html);

			if (match !== null) {

				scope.logging("FOUND ON FIRST PAGE:",match);
				scope.callback(match);
				return;

			} else if (response.request.href.indexOf("facebook") !== -1) {

				scope.callback("FACEBOOK");
				return;
			} else {

				var sitemapCrawler = new sitemaps.SitemapCrawler(options.url, scope.callback, scope.logging);
				sitemapCrawler.find(options.url + "/sitemap.xml", html, false);
			}
		}]);
	}

	this.findPages = function(sitemap, oldHtml, forced) {

		var scope = this;

		if (sitemap.length === 0) {

			scope.callback("NO SITEMAP FOUND");
			return;
		}

		// CAN IMPLEMENT /ABOUT PAGE SEARCHING HERE IF IT HELPS
		// PASS IN A LIST OF PAGES TO SEARCH TO CONTACTPAGE, HAVE IT CALL ITSELF RECURSIVELY UNSHIFTING THE LIST

		for (var i in sitemap) {
			if (sitemap[i].match(/contact/i) !== null) {

				scope.logging("FOUND CONTACT PAGE", sitemap[i]);

				scope.contactPage(sitemap[i]);
				return;
			}
		}

		var requestCount = 0,
			maxRequests = 30;
			// maxRequests = sitemap.length - 1;

		var requestInterval = setInterval(function() {

			scope.finalPages(sitemap[requestCount], requestCount);

			if (requestCount === maxRequests) {

				clearInterval(requestInterval);
			}

			requestCount++;
		},100);

		scope.waitEmailResults(sitemap, oldHtml, forced);
		//WAIT RESULTS
	}

	this.waitEmailResults = function(sitemap, oldHtml, forced) {

		var scope = this;

		var requestCheckInterval = setInterval(function() {

			var requestKeys = Object.keys(scope.finalRequestResults);
			

			if (requestKeys.length === sitemap.length) {
				clearInterval(requestCheckInterval);

				for (var i in requestKeys) {

					if (scope.finalRequestResults[requestKeys[i]] !== null) {

						var result = scope.finalRequestResults[requestKeys[i]];
						
					}
				}

				if (result) {

					scope.logging("FOUND ON FINAL PAGE: ",result,scope.url);
					scope.callback(result);
				} else if (forced) {

					scope.callback("NO EMAIL FOUND IN SITEMAP");
				} else {

					//NO EMAIL FOUND IN XML, TRY FORCE: MANUALLY BUILD SITEMAP FROM A-TAGS ON FIRST PAGE
					var sitemapCrawler = new sitemaps.SitemapCrawler(scope.url, scope.callback, scope.logging);
					sitemapCrawler.find(scope.url, oldHtml, true);
				}

				
			}
		},300);
	}

	this.contactPage = function(url) {

		var scope = this,
			options = {
				url: url,
				headers: {
					"User-Agent": scope.userAgent
				}
			}

		request.apply(scope, [options, function(err,response,html) {

			// scope.logging("CONTACT REQUEST");

			console.log(options);

			if (err) {
				scope.callback("CONTACT ERR");
				return;
			}

			var match = scope.search(html);
			//scope.logging(matches);

			if (match !== null) {

				scope.logging("FOUND EMAIL FROM CONTACT:",match);
				scope.callback(match);

			} else {

				scope.callback("CONTACT FORM");
			}
		}]);
	}

	this.finalPages = function(url, requestCount) {

		var scope = this,
			options = {
				url: url,
				headers: {
					"User-Agent": scope.userAgent
				}
			}

		//scope.logging("URL IS",url);

		request.apply(scope, [options, function(err,response,html) {

			if (err) {
				scope.finalRequestResults[requestCount] = null;
				return;
			}

			var match = scope.search(html);

			if (match !== null) {

				//TODO: REMOVE MULTIPLE EVENT LOGGING FOR EVERY FINAL REQUEST SUCCESS
				scope.finalRequestResults[requestCount] = match;
			} else {

				scope.finalRequestResults[requestCount] = null;
			}
		}]);
	}

}