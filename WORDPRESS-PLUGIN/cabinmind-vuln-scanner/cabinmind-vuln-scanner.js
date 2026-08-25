/* CabinMind Vulnerability Scanner — bundled JS v1.0.0 */
( function () {
	'use strict';

	function escHtml( s ) {
		var d = document.createElement( 'div' );
		d.appendChild( document.createTextNode( String( s || '' ) ) );
		return d.innerHTML;
	}

	function badgeHtml( level ) {
		var l = String( level || 'info' ).toLowerCase();
		return '<span class="cm-badge cm-badge-' + escHtml( l ) + '">' + escHtml( l ) + '</span>';
	}

	function scoreClass( n ) {
		if ( n >= 80 ) return 'good';
		if ( n >= 50 ) return 'ok';
		return 'poor';
	}

	function upgradeBox( msg, url ) {
		return '<div class="cm-upgrade-box"><p>' + escHtml( msg ) + '</p>' +
			'<a class="cm-upgrade-link" href="' + escHtml( url ) + '" target="_blank" rel="noopener noreferrer">Upgrade &rarr;</a></div>';
	}

	function init( config ) {
		var wrap = document.getElementById( config.id );
		if ( ! wrap ) return;

		wrap.innerHTML = [
			'<div class="cm-wrap">',
				'<div class="cm-header">',
					'<span class="cm-icon">&#128274;</span>',
					'<div><h2 class="cm-title">WP Vulnerability Scanner</h2>',
					'<p class="cm-subtitle">Detect exposed plugins, CVEs, and missing security headers.</p></div>',
				'</div>',
				'<span class="cm-free-badge">&#10003; Free &mdash; 1 scan per day, no account needed</span>',
				'<hr class="cm-divider">',
				'<form class="cm-form" id="' + escHtml( config.id ) + '-form" novalidate>',
					'<div class="cm-field">',
						'<label class="cm-label" for="' + escHtml( config.id ) + '-url">WordPress Site URL</label>',
						'<input class="cm-input" id="' + escHtml( config.id ) + '-url" type="url" placeholder="https://yoursite.com" required autocomplete="url">',
					'</div>',
					'<button class="cm-btn" type="submit">',
						'<span class="cm-btn-spinner"></span>',
						'<span class="cm-btn-label">Run Security Scan</span>',
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
			var urlVal = document.getElementById( config.id + '-url' ).value.trim();
			if ( ! urlVal ) return;

			btn.disabled = true;
			btn.classList.add( 'loading' );
			label.textContent = 'Scanning\u2026';
			results.innerHTML = '<p class="cm-loading-msg">Fetching page and analysing security headers\u2026 this may take 10\u201315 seconds.</p>';

			fetch( config.apiUrl, {
				method:  'POST',
				headers: { 'Content-Type': 'application/json' },
				body:    JSON.stringify( { url: urlVal } ),
			} )
				.then( function ( r ) { return r.json().then( function ( d ) { return { ok: r.ok, status: r.status, d: d }; } ); } )
				.then( function ( res ) {
					btn.disabled = false;
					btn.classList.remove( 'loading' );
					label.textContent = 'Run Security Scan';

					if ( res.status === 429 ) {
						results.innerHTML = upgradeBox(
							'You have used your free scan for today. Upgrade for unlimited scans and per-site tracking.',
							config.upgradeUrl
						);
						return;
					}
					if ( ! res.ok ) {
						results.innerHTML = '<div class="cm-error-box">' + escHtml( res.d.error || 'Scan failed. Please try again.' ) + '</div>';
						return;
					}

					renderResults( results, res.d, config.upgradeUrl );
				} )
				.catch( function () {
					btn.disabled = false;
					btn.classList.remove( 'loading' );
					label.textContent = 'Run Security Scan';
					results.innerHTML = '<div class="cm-error-box">Network error. Please check your connection and try again.</div>';
				} );
		} );
	}

	function renderResults( container, resp, upgradeUrl ) {
		var d   = resp.data || {};
		var out = [];

		// Summary
		if ( d.summary ) {
			out.push( '<div class="cm-summary-box">' + escHtml( d.summary ) + '</div>' );
		}

		// Overall risk + meta
		out.push( '<div class="cm-metrics">' );
		out.push( '<div class="cm-metric"><div class="cm-metric-val">' + badgeHtml( d.overallRisk || 'info' ) + '</div><div class="cm-metric-label">Overall Risk</div></div>' );
		out.push( '<div class="cm-metric"><div class="cm-metric-val">' + escHtml( d.wordpressVersion || 'Unknown' ) + '</div><div class="cm-metric-label">WP Version</div></div>' );
		out.push( '<div class="cm-metric"><div class="cm-metric-val">' + escHtml( ( d.plugins || [] ).length ) + '</div><div class="cm-metric-label">Plugins Detected</div></div>' );
		out.push( '<div class="cm-metric"><div class="cm-metric-val">' + escHtml( ( d.exposedEndpoints || [] ).length ) + '</div><div class="cm-metric-label">Exposed Endpoints</div></div>' );
		out.push( '</div>' );

		// Plugins
		if ( d.plugins && d.plugins.length ) {
			out.push( '<div class="cm-section"><div class="cm-section-title">Detected Plugins</div>' );
			out.push( '<div class="cm-table-wrap"><table class="cm-table"><thead><tr><th>Plugin</th><th>Version</th><th>Risk</th><th>Issue</th><th>CVE</th></tr></thead><tbody>' );
			d.plugins.forEach( function ( p ) {
				out.push( '<tr>' );
				out.push( '<td><strong>' + escHtml( p.name || p.slug ) + '</strong></td>' );
				out.push( '<td>' + escHtml( p.versionDetected || '—' ) + '</td>' );
				out.push( '<td>' + badgeHtml( p.riskLevel ) + '</td>' );
				out.push( '<td>' + escHtml( p.issue || '—' ) + '</td>' );
				out.push( '<td>' + escHtml( p.cve || '—' ) + '</td>' );
				out.push( '</tr>' );
			} );
			out.push( '</tbody></table></div></div>' );
		}

		// Exposed endpoints
		if ( d.exposedEndpoints && d.exposedEndpoints.length ) {
			out.push( '<div class="cm-section"><div class="cm-section-title">Exposed Endpoints</div><ul class="cm-item-list">' );
			d.exposedEndpoints.forEach( function ( ep ) {
				out.push( '<li class="cm-item">' );
				out.push( '<span class="cm-item-icon">&#128680;</span><div><div class="cm-item-title">' + escHtml( ep.path ) + ' ' + badgeHtml( ep.severity ) + '</div>' );
				out.push( '<div class="cm-item-desc">' + escHtml( ep.description ) + '</div></div></li>' );
			} );
			out.push( '</ul></div>' );
		}

		// Missing headers
		if ( d.missingHeaders && d.missingHeaders.length ) {
			out.push( '<div class="cm-section"><div class="cm-section-title">Missing Security Headers</div><ul class="cm-item-list">' );
			d.missingHeaders.forEach( function ( h ) {
				out.push( '<li class="cm-item">' );
				out.push( '<span class="cm-item-icon">&#9888;&#65039;</span><div><div class="cm-item-title">' + escHtml( h.header ) + ' ' + badgeHtml( h.severity ) + '</div>' );
				out.push( '<div class="cm-item-desc">' + escHtml( h.recommendation ) + '</div></div></li>' );
			} );
			out.push( '</ul></div>' );
		}

		// Upgrade CTA
		out.push( upgradeBox(
			'Upgrade for unlimited scans, per-site history, and client-ready PDF reports.',
			upgradeUrl
		) );

		container.innerHTML = out.join( '' );
	}

	( window.cmVsInstances || [] ).forEach( init );
}() );
