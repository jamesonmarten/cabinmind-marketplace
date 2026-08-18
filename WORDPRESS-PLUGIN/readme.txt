=== CabinMind AI Agents ===
Contributors: devcabintech
Tags: ai, chatbot, lead-generation, marketing, wordpress
Requires at least: 6.0
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: 1.3.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Embed the CabinMind AI Agent Marketplace on any page with one shortcode.

== Description ==
CabinMind AI Agents lets you display the CabinMind marketplace inside WordPress with a shortcode:

[cabinmind_agents]

The plugin fetches live agent cards from your CabinMind API and renders a responsive, lightweight grid.

Perfect for agencies, consultants, and creators who want to showcase AI tools without custom front-end work.

= Key Features =
* One shortcode to embed the marketplace
* Responsive 1/2/3-column layouts
* Live agent data from your API endpoint
* Category badge, feature bullets, and CTA buttons per card
* Loads the same Teddy AI chatbot used on products.devcabin.tech
* Works with classic editor and block editor shortcode block

= Shortcode Attributes =
* api_url: Override the API endpoint (default: https://products.devcabin.tech/api/agents)
* store_url: Override base marketplace URL (default: https://products.devcabin.tech/agents)
* columns: Grid columns (1, 2, or 3; default 3)

Examples:
[cabinmind_agents]
[cabinmind_agents columns="2"]
[cabinmind_agents api_url="https://example.com/api/agents" store_url="https://example.com/agents"]

= Freemium Positioning =
This plugin supports agents that expose freemium pricing labels from your API (for example, "Free + from $19/mo").

= External Services =
This plugin connects to CabinMind-hosted APIs to fetch agent listing data.

Service endpoint used by default:
* https://products.devcabin.tech/api/agents
* https://products.devcabin.tech/api/chat
* https://products.devcabin.tech/widget.js

What is sent:
* Standard HTTP request metadata required by WordPress hosting and networking stack

What is received:
* Public JSON data for agent cards (name, description, pricing labels, features, links)

When requests happen:
* When a page containing the shortcode is rendered in a visitor browser

Service terms and privacy:
* https://devcabin.tech/terms
* https://devcabin.tech/privacy

== Installation ==
1. Upload the plugin folder to /wp-content/plugins/.
2. Activate "CabinMind AI Agents" from Plugins.
3. Add [cabinmind_agents] to any page or post.

== Frequently Asked Questions ==
= Does this plugin require a CabinMind account? =
No account is required to install the plugin. You only need an accessible API endpoint returning agent JSON.

= Can I use my own API endpoint? =
Yes. Use the api_url shortcode attribute.

= Can I change where demo links open? =
Yes. Use the store_url shortcode attribute.

== Screenshots ==
1. Agent grid on desktop
2. Agent cards on mobile
3. Shortcode settings examples

== Changelog ==
= 1.2.0 =
* Added support for freemium price labels
* Added optional "Free tier available" badge
* Updated pricing presentation for WordPress-focused tools

= 1.3.0 =
* Added Dev Cabin + OpenAI key requirement message above the agent grid
* Embedded the same Teddy AI chatbot experience used on products.devcabin.tech

= 1.1.0 =
* Initial public release

== Upgrade Notice ==
= 1.3.0 =
Adds OpenAI key guidance and shared Teddy AI chatbot support.
