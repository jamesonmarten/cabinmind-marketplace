<?php
/**
 * Plugin Name:  CabinMind Plugin Recommender
 * Plugin URI:   https://wp.devcabin.tech/agents/plugin-recommender
 * Description:  Describe your business and get a hand-picked, conflict-free WordPress plugin stack with setup order and compatibility checks. Free tier included.
 * Version:      1.0.0
 * Author:       Dev Cabin Technologies
 * Author URI:   https://devcabin.tech
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Text Domain:  cabinmind-plugin-recommender
 * Domain Path:  /languages
 * License:      GPL-2.0-or-later
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'CM_PR_VERSION',     '1.0.0' );
define( 'CM_PR_API_URL',     'https://products.devcabin.tech/api/wp/plugin-recommender' );
define( 'CM_PR_UPGRADE_URL', 'https://wp.devcabin.tech/agents/plugin-recommender' );

/**
 * Load plugin text domain for translations.
 */
function cm_pr_load_textdomain() {
	load_plugin_textdomain(
		'cabinmind-plugin-recommender',
		false,
		dirname( plugin_basename( __FILE__ ) ) . '/languages'
	);
}
add_action( 'plugins_loaded', 'cm_pr_load_textdomain' );

function cm_pr_register_assets() {
	wp_register_style(
		'cm-plugin-recommender',
		plugin_dir_url( __FILE__ ) . 'cabinmind-plugin-recommender.css',
		array(),
		CM_PR_VERSION
	);
	wp_register_script(
		'cm-plugin-recommender',
		plugin_dir_url( __FILE__ ) . 'cabinmind-plugin-recommender.js',
		array(),
		CM_PR_VERSION,
		true
	);
}
add_action( 'wp_enqueue_scripts', 'cm_pr_register_assets' );

/**
 * [cabinmind_plugin_recommender] shortcode
 *
 * @param array $atts Shortcode attributes (none currently).
 * @return string HTML output.
 */
function cm_pr_shortcode( $atts ) {
	static $instance = 0;
	$instance++;

	shortcode_atts( array(), $atts, 'cabinmind_plugin_recommender' );

	wp_enqueue_style( 'cm-plugin-recommender' );
	wp_enqueue_script( 'cm-plugin-recommender' );

	$container_id = 'cm-pr-' . $instance;

	$config = array(
		'id'         => $container_id,
		'apiUrl'     => CM_PR_API_URL,
		'upgradeUrl' => CM_PR_UPGRADE_URL,
	);

	$inline  = 'window.cmPrInstances = window.cmPrInstances || [];';
	$inline .= 'window.cmPrInstances.push(' . wp_json_encode( $config ) . ');';
	wp_add_inline_script( 'cm-plugin-recommender', $inline, 'before' );

	return '<div id="' . esc_attr( $container_id ) . '"></div>';
}
add_shortcode( 'cabinmind_plugin_recommender', 'cm_pr_shortcode' );
