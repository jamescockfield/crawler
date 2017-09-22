var crawler = require("./crawler"),
	request = require("request");

exports.SitemapCrawler = function() {

	crawler.Crawler.apply(this,arguments);

	this.sitemapCrawlers = {};

	this.find = function(url, oldHtml, forceManual) {

		var scope = this,
			options = {
				url: url,
				headers: {
					"User-Agent": scope.userAgent
				}
			}

		request.apply(scope, [options, function(err, response, html) {

			if (!err) {
				var sitemap = html.split(/<loc>|<\/loc>/g);
			}

			if (err || 
				response.statusCode >= 400 || 
				sitemap.length === 1 && scope.hasOwnProperty("sitemap") === false || 
				forceManual) {

				//MANUAL SEARCH

				var sitemap = scope.manualSitemapSearch(oldHtml);
			} else {
				//SEARCH FROM XML

				sitemap = sitemap.filter(function(e) {

					return sitemap.indexOf(e) % 2 > 0;
				}).map(function(x) {

					// /[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b[-a-zA-Z0-9@:%_\+.~#?&//=]*/

					var match = x.match(/(https*:\/\/[a-z0-9\-_\.]*\/*)+([a-z0-9\/\-_]*)/i);

					return scope.url + "/" + match[match.length - 1];
				});
			}

			console.log("SITEMAP IS:", sitemap);

			scope.findNestedSitemaps(sitemap, oldHtml, forceManual, options.url);

		}]);
	}

	this.findNestedSitemaps = function(sitemap, oldHtml, forceManual, url) {

		var scope = this;

		for (var i in sitemap) {

			if (sitemap[i].slice(-3, this.length) === "xml" &&
			 sitemap[i] !== url &&
			 scope.sitemapCrawlers.hasOwnProperty(sitemap[i]) === false) {

				//ORIGINAL NESTED SITEMAP WAS FOUND

				if (!scope.hasOwnProperty("sitemap")) {

					//INITIALISE SCOPE.SITEMAP
					scope.sitemap = sitemap;
				}

				scope.iterateSitemaps(sitemap[i]);
			}
		}

		scope.waitSitemapResults(sitemap, oldHtml, forceManual);
	}

	this.waitSitemapResults = function(sitemap, oldHtml, forceManual) {

		//WAIT RESULTS IF ANY NESTED SITEMAPS

		var scope = this;

		var sitemapWait = setInterval(function() {

			var finishedCrawlingSitemaps = true;
			for (var i in scope.sitemapCrawlers) {

				if (scope.sitemapCrawlers[i] === false) {

					finishedCrawlingSitemaps = false;
				}
			}

			if (finishedCrawlingSitemaps) {

				clearInterval(sitemapWait);
				if (!scope.hasOwnProperty("sitemap")) {

					scope.sitemap = sitemap;
				}

				scope.findPages(scope.sitemap, oldHtml, forceManual);
			}
		}, 1000);
	}

	this.manualSitemapSearch = function(oldHtml) {
		// console.log("MANUAL SEARCH");

		var scope = this;

		var sitemap = oldHtml.split(/<a|<\/a>/g);

		

		sitemap = sitemap.filter(function(e) {

			return sitemap.indexOf(e) % 2 > 0 &&
			e.indexOf('href="') >= 0;
		});
		
		sitemap = sitemap.map(function(e) {

			e = e.split('href="')[1].split('"')[0];
			return scope.url + "/" + e;
		});

		return sitemap;
	}

	this.iterateSitemaps = function(sitemapURL) {

		var scope = this,
			options = {
				url: sitemapURL,
				headers: {
					"User-Agent": scope.userAgent
				}
			}

		scope.sitemapCrawlers[sitemapURL] = false;

		request(options, function(err, response, html) {

			if (!err) {

				var sitemap = html.split(/<loc>|<\/loc>/g);

				sitemap = sitemap.filter(function(e) {
					return sitemap.indexOf(e) % 2 > 0;

				});

				for (var i in sitemap) {
					scope.sitemap.push(sitemap[i]);
				}
			}
			scope.sitemapCrawlers[sitemapURL] = true;
		});
	}
}