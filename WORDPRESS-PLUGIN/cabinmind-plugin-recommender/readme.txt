=== CabinMind Plugin Recommender ===
Contributors: devcabintech
Tags: wordpress plugins, plugin recommendations, plugin stack, wordpress setup, plugin finder
Requires at least: 6.0
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Describe your business and get a hand-picked, conflict-free WordPress plugin stack. Free tier included — no account required.

== Description ==

**CabinMind Plugin Recommender** embeds an AI-powered plugin advisor on any page using one shortcode:

`[cabinmind_plugin_recommender]`

Select your business type, describe what you do, and receive a curated plugin stack with:

* 8–10 conflict-free plugins sorted by install order
* Purpose, pricing, and compatibility notes for each
* Direct links to each plugin on WordPress.org
* Warnings about common conflicts and gotchas
* Estimated setup time

= Free Tier =
* 2 recommendations per month, per visitor — no account required
* Full plugin stack delivered each time

= Upgrade =
Upgrade at [wp.devcabin.tech/agents/plugin-recommender](https://wp.devcabin.tech/agents/plugin-recommender) for:
* Unlimited recommendations
* Compatibility matrix reports
* Proposal-ready exports

= Shortcode =
`[cabinmind_plugin_recommender]`

= External Services =
This plugin calls the CabinMind API to generate recommendations. No executable code is downloaded.

Service endpoints:
* `https://products.devcabin.tech/api/wp/plugin-recommender`

What is sent: business type and description entered by the visitor.
What is received: JSON data with plugin names, purposes, and WordPress.org URLs.

Service terms: https://devcabin.tech/terms
Privacy policy: https://devcabin.tech/privacy

== Installation ==
1. Upload the `cabinmind-plugin-recommender` folder to `/wp-content/plugins/`.
2. Activate **CabinMind Plugin Recommender** from the Plugins screen.
3. Add `[cabinmind_plugin_recommender]` to any page or post.

== Frequently Asked Questions ==

= Does this plugin require an account? =
No. The free tier (2 recommendations/month) works without any account or API key.

= Are the recommended plugins from WordPress.org? =
The AI prioritises free and freemium plugins hosted on WordPress.org. Paid alternatives are only suggested when no good free option exists.

= How does the free tier work? =
The free tier is enforced server-side by the CabinMind API. There are no artificial feature gates in the plugin code.

== Screenshots ==
1. Recommendation form on the front end
2. Example plugin stack with install order and WP.org links
3. Warnings and setup time summary

== Changelog ==
= 1.0.0 =
* Initial release.

== Upgrade Notice ==
= 1.0.0 =
Initial release.
