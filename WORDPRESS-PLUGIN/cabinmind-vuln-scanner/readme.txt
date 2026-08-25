=== CabinMind Vuln Scanner ===
Contributors: devcabintech
Tags: wordpress security, vulnerability scanner, plugin security, CVE, security audit
Requires at least: 6.0
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Scan any WordPress URL for exposed plugins, known CVEs, and missing security headers. Free tier included — no account required.

== Description ==

**CabinMind Vulnerability Scanner** lets you embed a full WordPress security scanner on any page or post using one shortcode:

`[cabinmind_vuln_scan]`

Enter a WordPress site URL and the tool will:

* Detect the WordPress version
* Identify active plugins from page source
* Flag known CVEs associated with detected plugins
* Check for exposed attack surfaces (wp-login, xmlrpc.php, readme.html)
* Audit HTTP security headers (X-Frame-Options, CSP, HSTS, etc.)
* Assign a plain-English overall risk level
* Show actionable recommendations

= Free Tier =
* 1 scan per day, per visitor — no account or API key required
* All results displayed inline on your page

= Upgrade =
Upgrade at [wp.devcabin.tech/agents/vulnerability-scanner](https://wp.devcabin.tech/agents/vulnerability-scanner) for:
* Unlimited scans
* Per-site history and tracking
* Client-ready PDF reports
* Scheduled recurring scans

= Shortcode =
`[cabinmind_vuln_scan]`

Place it on any page, post, or widget area.

= External Services =
This plugin calls the CabinMind API to perform its analysis. **No executable code is downloaded.** Only JSON results are returned.

Service endpoints:
* `https://products.devcabin.tech/api/wp/vuln-scan`

What is sent:
* The URL entered by the visitor

What is received:
* JSON data: detected plugins, CVE information, risk scores, recommendations

When requests happen:
* When a visitor submits the scan form on your page

Service terms: https://devcabin.tech/terms
Privacy policy: https://devcabin.tech/privacy

== Installation ==
1. Upload the `cabinmind-vuln-scanner` folder to `/wp-content/plugins/`.
2. Activate **CabinMind Vulnerability Scanner** from the Plugins screen.
3. Add `[cabinmind_vuln_scan]` to any page or post.

== Frequently Asked Questions ==

= Does this plugin require an account? =
No. The free tier (1 scan/day) works without any account or API key.

= What information is sent to the CabinMind API? =
Only the URL you enter in the form. No WordPress admin credentials, user data, or site configuration is ever sent.

= Is this a replacement for a full security plugin? =
No. This tool gives a fast, surface-level scan from the outside — ideal for client demos and quick health checks. For ongoing protection, use a dedicated security plugin (e.g. Wordfence, Solid Security) alongside this tool.

= How does the free tier work? =
The free tier is enforced server-side by the CabinMind API based on the visitor's IP address. There are no artificial restrictions in the plugin code itself.

== Screenshots ==
1. Scan form on the front end
2. Example scan results with risk badges and CVE table
3. Missing security headers report

== Changelog ==
= 1.0.0 =
* Initial release.

== Upgrade Notice ==
= 1.0.0 =
Initial release.
