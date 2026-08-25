/* CabinMind Maintenance Report — bundled JS v1.0.0 */
( function () {
	'use strict';

	function escHtml( s ) {
		var d = document.createElement( 'div' );
		d.appendChild( document.createTextNode( String( s || '' ) ) );
		return d.innerHTML;
	}

	function upgradeBox( msg, url ) {
		return '<div class="cm-upgrade-box"><p>' + escHtml( msg ) + '</p>' +
			'<a class="cm-upgrade-link" href="' + escHtml( url ) + '" target="_blank" rel="noopener noreferrer">Upgrade &rarr;</a></div>';
	}

	function statusIcon( ok ) { return ok ? '&#9989;' : '&#10060;'; }

	function init( config ) {
		var now    = new Date();
		var months = [ 'January','February','March','April','May','June','July','August','September','October','November','December' ];
		var defPeriod = months[ now.getMonth() ] + ' ' + now.getFullYear();

		var wrap = document.getElementById( config.id );
		if ( ! wrap ) return;

		wrap.innerHTML = [
			'<div class="cm-wrap">',
				'<div class="cm-header">',
					'<span class="cm-icon">&#128203;</span>',
					'<div><h2 class="cm-title">WP Maintenance Report</h2>',
					'<p class="cm-subtitle">Generate a branded monthly report for your client in seconds.</p></div>',
				'</div>',
				'<span class="cm-free-badge">&#10003; Free sample &mdash; 1 report per month, no account needed</span>',
				'<hr class="cm-divider">',
				'<form class="cm-form" id="' + escHtml( config.id ) + '-form" novalidate>',
					'<div class="cm-field">',
						'<label class="cm-label" for="' + escHtml( config.id ) + '-url">Client Website URL</label>',
						'<input class="cm-input" id="' + escHtml( config.id ) + '-url" type="url" placeholder="https://clientsite.com" required autocomplete="url">',
					'</div>',
					'<div class="cm-field">',
						'<label class="cm-label" for="' + escHtml( config.id ) + '-name">Client / Business Name</label>',
						'<input class="cm-input" id="' + escHtml( config.id ) + '-name" type="text" placeholder="Acme Corp" required>',
					'</div>',
					'<div class="cm-field">',
						'<label class="cm-label" for="' + escHtml( config.id ) + '-period">Report Period</label>',
						'<input class="cm-input" id="' + escHtml( config.id ) + '-period" type="text" placeholder="' + escHtml( defPeriod ) + '" value="' + escHtml( defPeriod ) + '">',
					'</div>',
					'<button class="cm-btn" type="submit">',
						'<span class="cm-btn-spinner"></span>',
						'<span class="cm-btn-label">Generate Report</span>',
					'</button>',
				'</form>',
				'<div class="cm-results" id="' + escHtml( config.id ) + '-results"></div>',
			'</div>',
		].join( '' );

		var form    = document.getElementById( config.id + '-form' );
		var results = document.getElementById( config.id + '-results' );
		var btn     = form.querySelector( '.cm-btn' );
		var label   = form.querySelector( '.cm-btn-label' );

		form.addEventListener( 'submit', function ( e ) {
			e.preventDefault();
			var urlVal    = document.getElementById( config.id + '-url' ).value.trim();
			var nameVal   = document.getElementById( config.id + '-name' ).value.trim();
			var periodVal = document.getElementById( config.id + '-period' ).value.trim();
			if ( ! urlVal || ! nameVal ) return;

			btn.disabled = true;
			btn.classList.add( 'loading' );
			label.textContent = 'Generating\u2026';
			results.innerHTML = '<p class="cm-loading-msg">Fetching live performance data and generating your report\u2026 usually 15\u201320 seconds.</p>';

			fetch( config.apiUrl, {
				method:  'POST',
				headers: { 'Content-Type': 'application/json' },
				body:    JSON.stringify( { siteUrl: urlVal, businessName: nameVal, period: periodVal } ),
			} )
				.then( function ( r ) { return r.json().then( function ( d ) { return { ok: r.ok, status: r.status, d: d }; } ); } )
				.then( function ( res ) {
					btn.disabled = false;
					btn.classList.remove( 'loading' );
					label.textContent = 'Generate Report';

					if ( res.status === 429 ) {
						results.innerHTML = upgradeBox( 'Free tier: 1 sample report per month. Upgrade for unlimited white-label reports.', config.upgradeUrl );
						return;
					}
					if ( ! res.ok ) {
						results.innerHTML = '<div class="cm-error-box">' + escHtml( res.d.error || 'Report generation failed.' ) + '</div>';
						return;
					}
					renderResults( results, res.d, config.upgradeUrl );
				} )
				.catch( function () {
					btn.disabled = false;
					btn.classList.remove( 'loading' );
					label.textContent = 'Generate Report';
					results.innerHTML = '<div class="cm-error-box">Network error. Please try again.</div>';
				} );
		} );
	}

	function renderResults( container, resp, upgradeUrl ) {
		var d   = resp.data || {};
		var out = [];

		// Report header
		out.push( '<div style="padding:18px 20px;background:linear-gradient(135deg,#7c3aed,#4f46e5);border-radius:12px;color:#fff;margin-bottom:20px">' );
		out.push( '<div style="font-size:12px;text-transform:uppercase;letter-spacing:.5px;opacity:.75">' + escHtml( d.period || '' ) + ' Maintenance Report</div>' );
		out.push( '<div style="font-size:20px;font-weight:800;margin-top:4px">' + escHtml( d.clientName || '' ) + '</div>' );
		out.push( '<div style="font-size:12px;opacity:.75;margin-top:2px">' + escHtml( d.websiteUrl || '' ) + '</div>' );
		out.push( '</div>' );

		if ( d.executiveSummary ) {
			out.push( '<div class="cm-summary-box">' + escHtml( d.executiveSummary ) + '</div>' );
		}

		// Key metrics
		var perf   = d.performance || {};
		var uptime = d.uptime      || {};
		var sec    = d.security    || {};
		var bk     = d.backups     || {};
		var upd    = d.updates     || {};

		out.push( '<div class="cm-metrics">' );
		out.push( '<div class="cm-metric"><div class="cm-metric-val">' + escHtml( uptime.percentage || '—' ) + '</div><div class="cm-metric-label">Uptime</div></div>' );
		out.push( '<div class="cm-metric"><div class="cm-metric-val">' + escHtml( perf.currentScore || '—' ) + '</div><div class="cm-metric-label">Perf Score</div></div>' );
		out.push( '<div class="cm-metric"><div class="cm-metric-val">' + escHtml( ( upd.pluginUpdates || 0 ) + ( upd.coreUpdates || 0 ) ) + '</div><div class="cm-metric-label">Updates</div></div>' );
		out.push( '<div class="cm-metric"><div class="cm-metric-val">' + escHtml( bk.count || '—' ) + '</div><div class="cm-metric-label">Backups</div></div>' );
		out.push( '</div>' );

		// Sections
		var sections = [
			{ title: 'Performance', icon: '&#9889;', rows: [
				[ 'Performance Score', ( perf.currentScore || '—' ) + ' / 100' ],
				[ 'Previous Score',    ( perf.previousScore || '—' ) + ' / 100' ],
				[ 'Trend',             perf.trend || '—' ],
				[ 'LCP',               perf.lcp   || '—' ],
				[ 'CLS',               perf.cls   || '—' ],
			] },
			{ title: 'Updates', icon: '&#128260;', rows: [
				[ 'WordPress Core',  upd.coreUpdates   || 0 ],
				[ 'Plugins Updated', upd.pluginUpdates || 0 ],
				[ 'Themes Updated',  upd.themeUpdates  || 0 ],
				[ 'All Current',     upd.allCurrent    ? 'Yes &#9989;' : 'No &#10060;' ],
			] },
			{ title: 'Security', icon: '&#128274;', rows: [
				[ 'Scans Passed',    sec.scansPassed    || 0 ],
				[ 'Issues Found',    sec.issuesFound    || 0 ],
				[ 'Malware',         sec.malwareDetected ? 'Detected &#10060;' : 'None &#9989;' ],
				[ 'SSL Status',      sec.sslStatus      || '—' ],
				[ 'SSL Expires',     sec.sslExpiry      || '—' ],
			] },
			{ title: 'Backups', icon: '&#128190;', rows: [
				[ 'Backup Count',    bk.count            || '—' ],
				[ 'Last Successful', bk.lastSuccessful   || '—' ],
				[ 'Storage Used',    bk.storageUsed      || '—' ],
				[ 'Offsite Copy',    bk.offsite ? 'Yes &#9989;' : 'No &#10060;' ],
			] },
		];

		sections.forEach( function ( sec ) {
			out.push( '<div class="cm-section"><div class="cm-section-title">' + sec.icon + ' ' + escHtml( sec.title ) + '</div>' );
			out.push( '<div class="cm-table-wrap"><table class="cm-table">' );
			sec.rows.forEach( function ( row ) {
				out.push( '<tr><td style="font-weight:600;width:50%">' + escHtml( row[0] ) + '</td><td>' + row[1] + '</td></tr>' );
			} );
			out.push( '</table></div></div>' );
		} );

		// Recommendations
		var recs = Array.isArray( d.recommendations ) ? d.recommendations : [];
		if ( recs.length ) {
			out.push( '<div class="cm-section"><div class="cm-section-title">Recommendations</div><ul class="cm-item-list">' );
			recs.forEach( function ( r ) {
				var icon = r.priority === 'high' ? '&#128680;' : ( r.priority === 'medium' ? '&#128308;' : '&#128309;' );
				out.push( '<li class="cm-item"><span class="cm-item-icon">' + icon + '</span>' );
				out.push( '<div><div class="cm-item-title">' + escHtml( r.action ) + '</div>' );
				out.push( '<div class="cm-item-desc">' + escHtml( r.reason ) + '</div></div></li>' );
			} );
			out.push( '</ul></div>' );
		}

		if ( d.nextMonthFocus ) {
			out.push( '<div style="padding:12px 16px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;font-size:13px;color:#5b21b6;margin-bottom:16px">' );
			out.push( '<strong>Next month focus:</strong> ' + escHtml( d.nextMonthFocus ) + '</div>' );
		}

		out.push( upgradeBox( 'Upgrade for unlimited white-label reports with your branding, PDF export, and recurring delivery.', upgradeUrl ) );
		container.innerHTML = out.join( '' );
	}

	( window.cmMrInstances || [] ).forEach( init );
}() );
