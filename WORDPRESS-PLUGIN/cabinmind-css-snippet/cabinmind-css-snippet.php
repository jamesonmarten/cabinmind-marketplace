<?php
/**
 * Plugin Name:  CabinMind CSS Snippet
 * Plugin URI:   https://wp.devcabin.tech/agents/child-theme-builder
 * Description:  Describe a design change in plain English and get exact CSS or PHP snippets with conflict warnings for Divi, Elementor, Astra, and more. Free tier included.
 * Version:      1.0.0
 * Author:       Dev Cabin Technologies
 * Author URI:   https://devcabin.tech
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Text Domain:  cabinmind-css-snippet
 * Domain Path:  /languages
 * License:      GPL-2.0-or-later
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'CM_CS_VERSION',     '1.0.0' );
define( 'CM_CS_API_URL',     'https://products.devcabin.tech/api/wp/css-snippet' );
define( 'CM_CS_UPGRADE_URL', 'https://wp.devcabin.tech/agents/child-theme-builder' );

/**
 * Load plugin text domain for translations.
 */
function cm_cs_load_textdomain() {
	load_plugin_textdomain(
		'cabinmind-css-snippet',
		false,
		dirname( plugin_basename( __FILE__ ) ) . '/languages'
	);
}
add_action( 'plugins_loaded', 'cm_cs_load_textdomain' );

function cm_cs_register_assets() {
	wp_register_style(
		'cm-css-snippet',
		plugin_dir_url( __FILE__ ) . 'cabinmind-css-snippet.css',
		array(),
		CM_CS_VERSION
	);
	wp_register_script(
		'cm-css-snippet',
		plugin_dir_url( __FILE__ ) . 'cabinmind-css-snippet.js',
		array(),
		CM_CS_VERSION,
		true
	);
}
add_action( 'wp_enqueue_scripts', 'cm_cs_register_assets' );

/**
 * [cabinmind_css_snippet] shortcode
 *
 * @param array $atts Shortcode attributes (none currently).
 * @return string HTML output.
 */
function cm_cs_shortcode( $atts ) {
	static $instance = 0;
	$instance++;

	shortcode_atts( array(), $atts, 'cabinmind_css_snippet' );

	wp_enqueue_style( 'cm-css-snippet' );
	wp_enqueue_script( 'cm-css-snippet' );

	$container_id = 'cm-cs-' . $instance;

	$config = array(
		'id'         => $container_id,
		'apiUrl'     => CM_CS_API_URL,
		'upgradeUrl' => CM_CS_UPGRADE_URL,
	);

	$inline  = 'window.cmCsInstances = window.cmCsInstances || [];';
	$inline .= 'window.cmCsInstances.push(' . wp_json_encode( $config ) . ');';
	wp_add_inline_script( 'cm-css-snippet', $inline, 'before' );

	return '<div id="' . esc_attr( $container_id ) . '"></div>';
}
add_shortcode( 'cabinmind_css_snippet', 'cm_cs_shortcode' );
