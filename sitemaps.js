var crawler = require("./crawler"),
	request = require("request");

exports.SitemapCrawler = function()
{
	crawler.Crawler.apply(this,arguments);

	this.sitemapCrawlers = {};

	/**
	 * Find emails from given page
	 *
	 * @param string url, url of the page to parse
	 * @param string oldHtml
	 * @param boolean forceManual, whether to force a manual sitemap search if no sitemap.xml was found
	 */
	this.find = function(url, oldHtml, forceManual)
	{
		var scope = this,
			options =
			{
				url: url,
				headers:
				{
					"User-Agent": scope.userAgent
				}
			}

		request.apply(scope, [options, function(err, response, html)
		{
			if (!err) var sitemap = html.split(/<loc>|<\/loc>/g);

			if (err || 
				response.statusCode >= 400 || 
				sitemap.length === 1 && scope.hasOwnProperty("sitemap") === false || 
				forceManual)
			{	
				var sitemap = scope.manualSitemapSearch(oldHtml); // sitemap.xml search failed, manual search
			}
			else // Search from sitemap.xml
			{
				sitemap = sitemap
				.filter(x => 
				{
					sitemap.indexOf(x) % 2 > 0 &&
					x.match(/(https*:\/\/[a-z0-9\-_\.]*\/*)+([a-z0-9\/\-_]*)/i) // Match URLs
				})
				.map(x =>
				{
					var match = x.match(/(https*:\/\/[a-z0-9\-_\.]*\/*)+([a-z0-9\/\-_]*)/i); 
					if (match) return scope.url + "/" + match[match.length - 1];
				});
			}
			scope.findNestedSitemaps(sitemap, oldHtml, forceManual, options.url);
		}]);
	}

	/**
	 * Searches the sitemap for original nested sitemaps, preparing calls to iterateSitemaps and waitSitemapResults if found
	 *
	 * @param array sitemap, the initial sitemap array
	 * @param string oldHtml
	 * @param boolean forceManual, whether to force a manual sitemap search if no sitemap.xml was found
	 * @param string url
	 */
	this.findNestedSitemaps = function(sitemap, oldHtml, forceManual, url)
	{
		var scope = this;
		for (var i in sitemap)
		{
			console.log("TEST", sitemap[i]);
			if (sitemap[i].slice(-3, this.length) === "xml" &&
				sitemap[i] !== url &&
				scope.sitemapCrawlers.hasOwnProperty(sitemap[i]) === false)
			{ // Original nested sitemap was found

				if (!scope.hasOwnProperty("sitemap")) scope.sitemap = sitemap; // Initialise scope.sitemap
				scope.iterateSitemaps(sitemap[i]);
			}
		}
		scope.waitSitemapResults(sitemap, oldHtml, forceManual);
	}

	/**
	 * Wait results in case any nested sitemaps are being parsed, then sends the call to findPages when ready
	 *
	 * @param array sitemap, the original sitemap array.
	 * @param string oldHtml
	 * @param boolean forceManual, whether to force a manual sitemap search if no sitemap.xml was found
	 */
	this.waitSitemapResults = function(sitemap, oldHtml, forceManual)
	{
		var scope = this;
		var sitemapWait = setInterval(function()
		{
			var finishedCrawlingSitemaps = true;
			for (var i in scope.sitemapCrawlers) if (scope.sitemapCrawlers[i] === false)
			{
				 finishedCrawlingSitemaps = false;
			}

			if (finishedCrawlingSitemaps)
			{
				clearInterval(sitemapWait);
				if (!scope.hasOwnProperty("sitemap")) scope.sitemap = sitemap;

				scope.findPages(scope.sitemap, oldHtml, forceManual);
			}
		}, 1000);
	}

	/**
	 * Forces building of a sitemap by finding <a></a> tags from the initial page
	 *
	 * @param string html, the html to parse from the initial page
	 * @returns the sitemap array
	 */
	this.manualSitemapSearch = function(html)
	{
		var scope = this;
		var sitemap = html.split(/<a|<\/a>/g);

		return sitemap.filter(e => sitemap.indexOf(e) % 2 > 0 && e.indexOf('href="') >= 0) // URL CONTENTS OF A TAG
					  .map(e => scope.url + "/" + e.split('href="')[1].split('"')[0]);
	}

	/**
	 * Iterates through the nested sitemap, appending it's urls to scope.sitemap, the global sitemap object
	 *
	 * @param string sitemapURL, url of the nested sitemap to parse
	 */
	this.iterateSitemaps = function(sitemapURL)
	{
		var scope = this,
			options =
			{
				url: sitemapURL,
				headers:
				{
					"User-Agent": scope.userAgent
				}
			}
		scope.sitemapCrawlers[sitemapURL] = false;

		request(options, function(err, response, html)
		{
			if (!err)
			{
				var sitemap = html.split(/<loc>|<\/loc>/g);
				sitemap = sitemap.filter(e => sitemap.indexOf(e) % 2 > 0);

				for (var i in sitemap) scope.sitemap.push(sitemap[i]);
			}
			scope.sitemapCrawlers[sitemapURL] = true;
		});
	}
}