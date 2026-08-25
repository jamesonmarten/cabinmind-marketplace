/* CabinMind Speed Optimizer — bundled JS v1.0.0 */
( function () {
	'use strict';

	function escHtml( s ) {
		var d = document.createElement( 'div' );
		d.appendChild( document.createTextNode( String( s || '' ) ) );
		return d.innerHTML;
	}

	function scoreClass( n ) {
		var num = parseInt( n, 10 );
		if ( isNaN( num ) ) return 'ok';
		if ( num >= 80 ) return 'good';
		if ( num >= 50 ) return 'ok';
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
					'<span class="cm-icon">&#9889;</span>',
					'<div><h2 class="cm-title">WordPress Speed Optimizer</h2>',
					'<p class="cm-subtitle">Live Core Web Vitals + prioritised WordPress-specific fix list.</p></div>',
				'</div>',
				'<span class="cm-free-badge">&#10003; Free &mdash; 1 audit per day, no account needed</span>',
				'<hr class="cm-divider">',
				'<form class="cm-form" id="' + escHtml( config.id ) + '-form" novalidate>',
					'<div class="cm-field">',
						'<label class="cm-label" for="' + escHtml( config.id ) + '-url">WordPress Site URL</label>',
						'<input class="cm-input" id="' + escHtml( config.id ) + '-url" type="url" placeholder="https://yoursite.com" required autocomplete="url">',
					'</div>',
					'<button class="cm-btn" type="submit">',
						'<span class="cm-btn-spinner"></span>',
						'<span class="cm-btn-label">Run Speed Audit</span>',
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
			label.textContent = 'Auditing\u2026';
			results.innerHTML = '<p class="cm-loading-msg">Running Google PageSpeed Insights\u2026 typically 15\u201325 seconds.</p>';

			fetch( config.apiUrl, {
				method:  'POST',
				headers: { 'Content-Type': 'application/json' },
				body:    JSON.stringify( { url: urlVal } ),
			} )
				.then( function ( r ) { return r.json().then( function ( d ) { return { ok: r.ok, status: r.status, d: d }; } ); } )
				.then( function ( res ) {
					btn.disabled = false;
					btn.classList.remove( 'loading' );
					label.textContent = 'Run Speed Audit';

					if ( res.status === 429 ) {
						results.innerHTML = upgradeBox( 'You have used your free audit for today. Upgrade for unlimited audits.', config.upgradeUrl );
						return;
					}
					if ( ! res.ok ) {
						results.innerHTML = '<div class="cm-error-box">' + escHtml( res.d.error || 'Audit failed. Please try again.' ) + '</div>';
						return;
					}
					renderResults( results, res.d, config.upgradeUrl );
				} )
				.catch( function () {
					btn.disabled = false;
					btn.classList.remove( 'loading' );
					label.textContent = 'Run Speed Audit';
					results.innerHTML = '<div class="cm-error-box">Network error. Please try again.</div>';
				} );
		} );
	}

	function renderResults( container, resp, upgradeUrl ) {
		var d   = resp.data || {};
		var out = [];

		if ( d.summary ) {
			out.push( '<div class="cm-summary-box">' + escHtml( d.summary ) + '</div>' );
		}

		// Lighthouse scores
		var scores = d.scores || {};
		var scoreLabels = [
			[ 'Performance',   scores.performance ],
			[ 'SEO',           scores.seo ],
			[ 'Accessibility', scores.accessibility ],
			[ 'Best Practices', scores.bestPractices ],
		];

		out.push( '<div class="cm-section"><div class="cm-section-title">Lighthouse Scores</div>' );
		out.push( '<div class="cm-score-wrap">' );
		scoreLabels.forEach( function ( pair ) {
			var label = pair[0];
			var val   = pair[1];
			var display = ( val !== null && val !== undefined ) ? val : '—';
			var cls   = ( val !== null && val !== undefined ) ? scoreClass( val ) : 'ok';
			var pct   = ( val !== null && val !== undefined ) ? val : 0;
			out.push( '<div class="cm-score-row">' );
			out.push( '<span class="cm-score-label">' + escHtml( label ) + '</span>' );
			out.push( '<div class="cm-score-track"><div class="cm-score-fill ' + cls + '" style="width:' + escHtml( pct ) + '%"></div></div>' );
			out.push( '<span class="cm-score-val">' + escHtml( display ) + '</span>' );
			out.push( '</div>' );
		} );
		out.push( '</div></div>' );

		// Core Web Vitals
		var cwv = d.cwv || {};
		out.push( '<div class="cm-section"><div class="cm-section-title">Core Web Vitals</div>' );
		out.push( '<div class="cm-metrics">' );
		[ [ 'LCP', cwv.lcp ], [ 'CLS', cwv.cls ], [ 'FCP', cwv.fcp ], [ 'TBT', cwv.tbt ], [ 'TTI', cwv.tti ] ].forEach( function ( p ) {
			out.push( '<div class="cm-metric"><div class="cm-metric-val" style="font-size:15px">' + escHtml( p[1] || 'N/A' ) + '</div><div class="cm-metric-label">' + escHtml( p[0] ) + '</div></div>' );
		} );
		out.push( '</div></div>' );

		// Prioritised fixes
		var fixes = Array.isArray( d.fixes ) ? d.fixes : [];
		if ( fixes.length ) {
			out.push( '<div class="cm-section"><div class="cm-section-title">Prioritised Fixes</div><ul class="cm-item-list">' );
			fixes.forEach( function ( f ) {
				out.push( '<li class="cm-item">' );
				out.push( '<span class="cm-item-icon">' + ( f.priority <= 2 ? '&#128680;' : '&#128308;' ) + '</span>' );
				out.push( '<div><div class="cm-item-title">#' + escHtml( f.priority ) + ' ' + escHtml( f.title ) );
				if ( f.estimatedGain ) out.push( ' <span class="cm-badge cm-badge-ok">' + escHtml( f.estimatedGain ) + '</span>' );
				out.push( '</div>' );
				out.push( '<div class="cm-item-desc">' + escHtml( f.description ) + '</div>' );
				if ( f.wpSolution ) out.push( '<div style="margin-top:4px;font-size:12px;color:#7c3aed">&#128279; ' + escHtml( f.wpSolution ) + '</div>' );
				out.push( '</div></li>' );
			} );
			out.push( '</ul></div>' );
		}

		// Quick wins
		var qw = Array.isArray( d.quickWins ) ? d.quickWins : [];
		if ( qw.length ) {
			out.push( '<div class="cm-section"><div class="cm-section-title">Quick Wins (&lt; 5 min)</div><ul class="cm-item-list">' );
			qw.forEach( function ( w ) {
				out.push( '<li class="cm-item"><span class="cm-item-icon">&#9193;</span><div>' + escHtml( w ) + '</div></li>' );
			} );
			out.push( '</ul></div>' );
		}

		if ( d.topPlugin ) {
			out.push( '<div style="padding:12px 16px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;font-size:13px;color:#5b21b6;margin-bottom:16px">' );
			out.push( '<strong>Top plugin to install:</strong> ' + escHtml( d.topPlugin ) + '</div>' );
		}

		out.push( upgradeBox( 'Upgrade for unlimited audits, multi-page tracking, and client-ready reports.', upgradeUrl ) );
		container.innerHTML = out.join( '' );
	}

	( window.cmSoInstances || [] ).forEach( init );
}() );
