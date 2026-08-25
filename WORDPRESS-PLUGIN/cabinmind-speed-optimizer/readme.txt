=== CabinMind Speed Optimizer ===
Contributors: devcabintech
Tags: wordpress speed, core web vitals, pagespeed, performance, lighthouse
Requires at least: 6.0
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Live Core Web Vitals scores plus a prioritised WordPress fix list. Powered by Google PageSpeed Insights. Free tier included.

== Description ==

**CabinMind Speed Optimizer** embeds a live performance auditor on any page using one shortcode:

`[cabinmind_speed_optimizer]`

Enter a WordPress URL and get:

* Live Lighthouse scores (Performance, SEO, Accessibility, Best Practices)
* Core Web Vitals: LCP, CLS, FCP, TBT, TTI
* 5–7 prioritised, WordPress-specific fixes (names real plugins)
* Quick wins you can action in under 5 minutes
* Top plugin recommendation to install today

Results are sourced from live **Google PageSpeed Insights** data, with an AI fallback for unreachable URLs.

= Free Tier =
* 1 audit per day, per visitor — no account required

= Upgrade =
Upgrade at [wp.devcabin.tech/agents/speed-optimizer](https://wp.devcabin.tech/agents/speed-optimizer) for:
* Unlimited audits
* Multi-page tracking
* Historical score comparison
* Client-ready reports

= Shortcode =
`[cabinmind_speed_optimizer]`

= External Services =
This plugin calls the CabinMind API and Google PageSpeed Insights. No executable code is downloaded.

Service endpoints:
* `https://products.devcabin.tech/api/wp/speed-optimizer` (CabinMind API, calls Google PageSpeed server-side)

What is sent: the URL entered by the visitor.
What is received: JSON with Lighthouse scores, Core Web Vitals, and fix recommendations.

Service terms: https://devcabin.tech/terms
Privacy policy: https://devcabin.tech/privacy
Google PageSpeed Insights terms: https://developers.google.com/terms

== Installation ==
1. Upload the `cabinmind-speed-optimizer` folder to `/wp-content/plugins/`.
2. Activate **CabinMind Speed Optimizer** from the Plugins screen.
3. Add `[cabinmind_speed_optimizer]` to any page or post.

== Frequently Asked Questions ==

= Does this plugin require an account? =
No. The free tier (1 audit/day) works without any account or API key.

= Does this use my site's Google PageSpeed quota? =
No. The API call is made server-side by the CabinMind API, not from your WordPress installation.

= How does the free tier work? =
The free tier is enforced server-side by the CabinMind API. There are no artificial restrictions in the plugin code.

== Screenshots ==
1. Speed audit form on the front end
2. Lighthouse score bars with Core Web Vitals
3. Prioritised WordPress fix list

== Changelog ==
= 1.0.0 =
* Initial release.

== Upgrade Notice ==
= 1.0.0 =
Initial release.
