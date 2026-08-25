<?php
/**
 * Plugin Name:  CabinMind Link Checker
 * Plugin URI:   https://wp.devcabin.tech/agents/link-checker
 * Description:  Crawl any sitemap or URL, check live HTTP status for every link, and export broken-link and redirect maps as CSV for quick fixes. Free tier included.
 * Version:      1.0.0
 * Author:       Dev Cabin Technologies
 * Author URI:   https://devcabin.tech
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Text Domain:  cabinmind-link-checker
 * Domain Path:  /languages
 * License:      GPL-2.0-or-later
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'CM_LC_VERSION',     '1.0.0' );
define( 'CM_LC_API_URL',     'https://products.devcabin.tech/api/wp/link-checker' );
define( 'CM_LC_UPGRADE_URL', 'https://wp.devcabin.tech/agents/link-checker' );

/**
 * Load plugin text domain for translations.
 */
function cm_lc_load_textdomain() {
	load_plugin_textdomain(
		'cabinmind-link-checker',
		false,
		dirname( plugin_basename( __FILE__ ) ) . '/languages'
	);
}
add_action( 'plugins_loaded', 'cm_lc_load_textdomain' );

function cm_lc_register_assets() {
	wp_register_style(
		'cm-link-checker',
		plugin_dir_url( __FILE__ ) . 'cabinmind-link-checker.css',
		array(),
		CM_LC_VERSION
	);
	wp_register_script(
		'cm-link-checker',
		plugin_dir_url( __FILE__ ) . 'cabinmind-link-checker.js',
		array(),
		CM_LC_VERSION,
		true
	);
}
add_action( 'wp_enqueue_scripts', 'cm_lc_register_assets' );

/**
 * [cabinmind_link_checker] shortcode
 *
 * @param array $atts Shortcode attributes (none currently).
 * @return string HTML output.
 */
function cm_lc_shortcode( $atts ) {
	static $instance = 0;
	$instance++;

	shortcode_atts( array(), $atts, 'cabinmind_link_checker' );

	wp_enqueue_style( 'cm-link-checker' );
	wp_enqueue_script( 'cm-link-checker' );

	$container_id = 'cm-lc-' . $instance;

	$config = array(
		'id'         => $container_id,
		'apiUrl'     => CM_LC_API_URL,
		'upgradeUrl' => CM_LC_UPGRADE_URL,
	);

	$inline  = 'window.cmLcInstances = window.cmLcInstances || [];';
	$inline .= 'window.cmLcInstances.push(' . wp_json_encode( $config ) . ');';
	wp_add_inline_script( 'cm-link-checker', $inline, 'before' );

	return '<div id="' . esc_attr( $container_id ) . '"></div>';
}
add_shortcode( 'cabinmind_link_checker', 'cm_lc_shortcode' );
