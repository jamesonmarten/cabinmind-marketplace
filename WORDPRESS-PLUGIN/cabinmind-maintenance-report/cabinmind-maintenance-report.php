<?php
/**
 * Plugin Name:  CabinMind Maintenance Report
 * Plugin URI:   https://wp.devcabin.tech/agents/maintenance-report
 * Description:  Auto-generate branded monthly maintenance reports covering uptime, updates, backups, security, and performance — ready to send to clients. Free sample included.
 * Version:      1.0.0
 * Author:       Dev Cabin Technologies
 * Author URI:   https://devcabin.tech
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Text Domain:  cabinmind-maintenance-report
 * Domain Path:  /languages
 * License:      GPL-2.0-or-later
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'CM_MR_VERSION',     '1.0.0' );
define( 'CM_MR_API_URL',     'https://products.devcabin.tech/api/wp/maintenance-report' );
define( 'CM_MR_UPGRADE_URL', 'https://wp.devcabin.tech/agents/maintenance-report' );

/**
 * Load plugin text domain for translations.
 */
function cm_mr_load_textdomain() {
	load_plugin_textdomain(
		'cabinmind-maintenance-report',
		false,
		dirname( plugin_basename( __FILE__ ) ) . '/languages'
	);
}
add_action( 'plugins_loaded', 'cm_mr_load_textdomain' );

function cm_mr_register_assets() {
	wp_register_style(
		'cm-maintenance-report',
		plugin_dir_url( __FILE__ ) . 'cabinmind-maintenance-report.css',
		array(),
		CM_MR_VERSION
	);
	wp_register_script(
		'cm-maintenance-report',
		plugin_dir_url( __FILE__ ) . 'cabinmind-maintenance-report.js',
		array(),
		CM_MR_VERSION,
		true
	);
}
add_action( 'wp_enqueue_scripts', 'cm_mr_register_assets' );

/**
 * [cabinmind_maintenance_report] shortcode
 *
 * @param array $atts Shortcode attributes (none currently).
 * @return string HTML output.
 */
function cm_mr_shortcode( $atts ) {
	static $instance = 0;
	$instance++;

	shortcode_atts( array(), $atts, 'cabinmind_maintenance_report' );

	wp_enqueue_style( 'cm-maintenance-report' );
	wp_enqueue_script( 'cm-maintenance-report' );

	$container_id = 'cm-mr-' . $instance;

	$config = array(
		'id'         => $container_id,
		'apiUrl'     => CM_MR_API_URL,
		'upgradeUrl' => CM_MR_UPGRADE_URL,
	);

	$inline  = 'window.cmMrInstances = window.cmMrInstances || [];';
	$inline .= 'window.cmMrInstances.push(' . wp_json_encode( $config ) . ');';
	wp_add_inline_script( 'cm-maintenance-report', $inline, 'before' );

	return '<div id="' . esc_attr( $container_id ) . '"></div>';
}
add_shortcode( 'cabinmind_maintenance_report', 'cm_mr_shortcode' );
