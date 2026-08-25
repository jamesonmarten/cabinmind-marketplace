=== CabinMind Link Checker ===
Contributors: devcabintech
Tags: broken links, link checker, redirect mapper, sitemap crawler, SEO
Requires at least: 6.0
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Crawl any sitemap or URL, find broken links, and export a redirect map as CSV for quick fixes. Free tier included — no account required.

== Description ==

**CabinMind Link Checker** embeds a live link crawler on any page using one shortcode:

`[cabinmind_link_checker]`

Enter your site URL and the tool will:

* Auto-discover URLs from your sitemap.xml, sitemap_index.xml, or wp-sitemap.xml
* Fall back to crawling homepage links if no sitemap is found
* Check live HTTP status for every URL (HEAD request)
* Categorise results: OK, Broken, Redirect
* Show a broken-links table and a redirect-map table
* Let you export both as **CSV files** directly from the browser

= Free Tier =
* 1 crawl per day, per visitor — up to 100 URLs, no account required

= Upgrade =
Upgrade at [wp.devcabin.tech/agents/link-checker](https://wp.devcabin.tech/agents/link-checker) for:
* Unlimited crawls and URL counts
* Scheduled recurring scans
* WP Redirection plugin import file
* Email alerts on new broken links

= Shortcode =
`[cabinmind_link_checker]`

= External Services =
This plugin calls the CabinMind API to perform the crawl server-side. No executable code is downloaded.

Service endpoints:
* `https://products.devcabin.tech/api/wp/link-checker`

What is sent: the URL entered by the visitor and the maximum URL count.
What is received: JSON with HTTP status codes, broken link list, and redirect map.

Note: The CabinMind server makes HEAD requests to each URL discovered in the sitemap. No data from your WordPress database is sent.

Service terms: https://devcabin.tech/terms
Privacy policy: https://devcabin.tech/privacy

== Installation ==
1. Upload the `cabinmind-link-checker` folder to `/wp-content/plugins/`.
2. Activate **CabinMind Link Checker** from the Plugins screen.
3. Add `[cabinmind_link_checker]` to any page or post.

== Frequently Asked Questions ==

= Does this plugin require an account? =
No. The free tier (1 crawl/day, up to 100 URLs) works without any account or API key.

= Does the crawler log in to my WordPress admin? =
No. It only makes unauthenticated HEAD requests to public URLs found in your sitemap or homepage HTML.

= Can I export the results? =
Yes. Both the broken links table and the redirect map table have an "Export CSV" button that downloads the results to your computer.

= How does the free tier work? =
The free tier is enforced server-side by the CabinMind API based on the visitor's IP address. There are no artificial restrictions in the plugin code itself.

== Screenshots ==
1. Link checker form on the front end
2. Summary metrics and broken links table
3. Redirect map table with CSV export

== Changelog ==
= 1.0.0 =
* Initial release.

== Upgrade Notice ==
= 1.0.0 =
Initial release.
