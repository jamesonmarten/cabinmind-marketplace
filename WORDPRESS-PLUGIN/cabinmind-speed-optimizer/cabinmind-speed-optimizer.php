<?php
/**
 * Plugin Name:  CabinMind Speed Optimizer
 * Plugin URI:   https://wp.devcabin.tech/agents/speed-optimizer
 * Description:  Diagnose Core Web Vitals and get a prioritised WordPress-specific fix list using live Google PageSpeed data. Free tier included — no account required.
 * Version:      1.0.0
 * Author:       Dev Cabin Technologies
 * Author URI:   https://devcabin.tech
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Text Domain:  cabinmind-speed-optimizer
 * Domain Path:  /languages
 * License:      GPL-2.0-or-later
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'CM_SO_VERSION',     '1.0.0' );
define( 'CM_SO_API_URL',     'https://products.devcabin.tech/api/wp/speed-optimizer' );
define( 'CM_SO_UPGRADE_URL', 'https://wp.devcabin.tech/agents/speed-optimizer' );

/**
 * Load plugin text domain for translations.
 */
function cm_so_load_textdomain() {
	load_plugin_textdomain(
		'cabinmind-speed-optimizer',
		false,
		dirname( plugin_basename( __FILE__ ) ) . '/languages'
	);
}
add_action( 'plugins_loaded', 'cm_so_load_textdomain' );

function cm_so_register_assets() {
	wp_register_style(
		'cm-speed-optimizer',
		plugin_dir_url( __FILE__ ) . 'cabinmind-speed-optimizer.css',
		array(),
		CM_SO_VERSION
	);
	wp_register_script(
		'cm-speed-optimizer',
		plugin_dir_url( __FILE__ ) . 'cabinmind-speed-optimizer.js',
		array(),
		CM_SO_VERSION,
		true
	);
}
add_action( 'wp_enqueue_scripts', 'cm_so_register_assets' );

/**
 * [cabinmind_speed_optimizer] shortcode
 *
 * @param array $atts Shortcode attributes (none currently).
 * @return string HTML output.
 */
function cm_so_shortcode( $atts ) {
	static $instance = 0;
	$instance++;

	shortcode_atts( array(), $atts, 'cabinmind_speed_optimizer' );

	wp_enqueue_style( 'cm-speed-optimizer' );
	wp_enqueue_script( 'cm-speed-optimizer' );

	$container_id = 'cm-so-' . $instance;

	$config = array(
		'id'         => $container_id,
		'apiUrl'     => CM_SO_API_URL,
		'upgradeUrl' => CM_SO_UPGRADE_URL,
	);

	$inline  = 'window.cmSoInstances = window.cmSoInstances || [];';
	$inline .= 'window.cmSoInstances.push(' . wp_json_encode( $config ) . ');';
	wp_add_inline_script( 'cm-speed-optimizer', $inline, 'before' );

	return '<div id="' . esc_attr( $container_id ) . '"></div>';
}
add_shortcode( 'cabinmind_speed_optimizer', 'cm_so_shortcode' );
