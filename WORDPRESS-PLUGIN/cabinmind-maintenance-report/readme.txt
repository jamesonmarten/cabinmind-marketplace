=== CabinMind Maintenance Report ===
Contributors: devcabintech
Tags: wordpress maintenance, client report, white-label, maintenance plan, website report
Requires at least: 6.0
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Generate branded monthly maintenance reports for clients covering uptime, updates, backups, and performance. Free sample included.

== Description ==

**CabinMind Maintenance Report** embeds a white-label monthly report generator on any page using one shortcode:

`[cabinmind_maintenance_report]`

Enter a client site URL, client name, and report period — and receive a complete monthly maintenance report covering:

* Uptime percentage and incident count
* WordPress core, plugin, and theme update summary
* Security scan results and SSL status
* Backup count and offsite copy status
* Live performance score (via Google PageSpeed Insights)
* Prioritised recommendations for next month
* Professional executive summary

Built for **WordPress agencies and care plan providers** who need to deliver client reports quickly.

= Free Tier =
* 1 sample report per month, per visitor — no account required

= Upgrade =
Upgrade at [wp.devcabin.tech/agents/maintenance-report](https://wp.devcabin.tech/agents/maintenance-report) for:
* Unlimited white-label reports
* Your own branding (logo, colours)
* PDF and HTML export
* Recurring delivery automation

= Shortcode =
`[cabinmind_maintenance_report]`

= External Services =
This plugin calls the CabinMind API and Google PageSpeed Insights. No executable code is downloaded.

Service endpoints:
* `https://products.devcabin.tech/api/wp/maintenance-report`

What is sent: site URL, client name, and report period entered by the user.
What is received: JSON with report data (uptime, updates, security, performance).

Service terms: https://devcabin.tech/terms
Privacy policy: https://devcabin.tech/privacy

== Installation ==
1. Upload the `cabinmind-maintenance-report` folder to `/wp-content/plugins/`.
2. Activate **CabinMind Maintenance Report** from the Plugins screen.
3. Add `[cabinmind_maintenance_report]` to any page or post.

== Frequently Asked Questions ==

= Does this plugin require an account? =
No. The free tier (1 report/month) works without any account or API key.

= Is the report data real or generated? =
The performance scores are live data from Google PageSpeed Insights. Other metrics (uptime, backups, updates) are AI-generated estimates based on typical well-maintained WordPress sites. Upgrade to the full suite at wp.devcabin.tech for live integration with your monitoring stack.

= How does the free tier work? =
The free tier is enforced server-side. There are no artificial restrictions in the plugin code.

== Screenshots ==
1. Report generator form on the front end
2. Example report header with client branding
3. Performance and security sections

== Changelog ==
= 1.0.0 =
* Initial release.

== Upgrade Notice ==
= 1.0.0 =
Initial release.
