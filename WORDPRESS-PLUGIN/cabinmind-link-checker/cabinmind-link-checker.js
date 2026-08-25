/* CabinMind Link Checker — bundled JS v1.0.0 */
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

	function statusBadge( status ) {
		if ( status >= 200 && status < 300 ) return '<span class="cm-badge cm-badge-ok">OK ' + escHtml( status ) + '</span>';
		if ( status >= 300 && status < 400 ) return '<span class="cm-badge cm-badge-info">Redirect ' + escHtml( status ) + '</span>';
		if ( status === 0 )                  return '<span class="cm-badge cm-badge-critical">Timeout</span>';
		return '<span class="cm-badge cm-badge-critical">' + escHtml( status ) + '</span>';
	}

	function csvDownload( rows, filename ) {
		var content = rows.map( function ( r ) {
			return r.map( function ( c ) { return '"' + String( c ).replace( /"/g, '""' ) + '"'; } ).join( ',' );
		} ).join( '\r\n' );
		var blob = new Blob( [ content ], { type: 'text/csv' } );
		var a    = document.createElement( 'a' );
		a.href   = URL.createObjectURL( blob );
		a.download = filename;
		a.click();
		URL.revokeObjectURL( a.href );
	}

	function init( config ) {
		var wrap = document.getElementById( config.id );
		if ( ! wrap ) return;

		wrap.innerHTML = [
			'<div class="cm-wrap">',
				'<div class="cm-header">',
					'<span class="cm-icon">&#128279;</span>',
					'<div><h2 class="cm-title">Broken Link Checker</h2>',
					'<p class="cm-subtitle">Crawl your sitemap, find broken links, and export a redirect map.</p></div>',
				'</div>',
				'<span class="cm-free-badge">&#10003; Free &mdash; 1 crawl per day, up to 100 URLs</span>',
				'<hr class="cm-divider">',
				'<form class="cm-form" id="' + escHtml( config.id ) + '-form" novalidate>',
					'<div class="cm-field">',
						'<label class="cm-label" for="' + escHtml( config.id ) + '-url">Website or Sitemap URL</label>',
						'<input class="cm-input" id="' + escHtml( config.id ) + '-url" type="url" placeholder="https://yoursite.com" required autocomplete="url">',
					'</div>',
					'<div class="cm-field">',
						'<label class="cm-label" for="' + escHtml( config.id ) + '-max">Max URLs to check <span style="font-weight:400;color:#9ca3af">(free tier: up to 100)</span></label>',
						'<input class="cm-input" id="' + escHtml( config.id ) + '-max" type="number" min="1" max="100" value="50" style="max-width:120px">',
					'</div>',
					'<button class="cm-btn" type="submit">',
						'<span class="cm-btn-spinner"></span>',
						'<span class="cm-btn-label">Start Crawl</span>',
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
			var maxVal = parseInt( document.getElementById( config.id + '-max' ).value, 10 ) || 50;
			if ( ! urlVal ) return;

			btn.disabled = true;
			btn.classList.add( 'loading' );
			label.textContent = 'Crawling\u2026';
			results.innerHTML = '<p class="cm-loading-msg">Discovering and checking URLs\u2026 this may take up to 30 seconds for larger sites.</p>';

			fetch( config.apiUrl, {
				method:  'POST',
				headers: { 'Content-Type': 'application/json' },
				body:    JSON.stringify( { url: urlVal, maxUrls: maxVal } ),
			} )
				.then( function ( r ) { return r.json().then( function ( d ) { return { ok: r.ok, status: r.status, d: d }; } ); } )
				.then( function ( res ) {
					btn.disabled = false;
					btn.classList.remove( 'loading' );
					label.textContent = 'Start Crawl';

					if ( res.status === 429 ) {
						results.innerHTML = upgradeBox( 'You have used your free crawl for today. Upgrade for unlimited crawls.', config.upgradeUrl );
						return;
					}
					if ( ! res.ok ) {
						results.innerHTML = '<div class="cm-error-box">' + escHtml( res.d.error || 'Crawl failed.' ) + '</div>';
						return;
					}
					renderResults( results, res.d, config.upgradeUrl );
				} )
				.catch( function () {
					btn.disabled = false;
					btn.classList.remove( 'loading' );
					label.textContent = 'Start Crawl';
					results.innerHTML = '<div class="cm-error-box">Network error. Please try again.</div>';
				} );
		} );
	}

	function renderResults( container, resp, upgradeUrl ) {
		var out     = [];
		var summary = resp.summary || {};
		var broken  = Array.isArray( resp.broken    ) ? resp.broken    : [];
		var redir   = Array.isArray( resp.redirects ) ? resp.redirects : [];
		var all     = Array.isArray( resp.all       ) ? resp.all       : [];

		// Summary metrics
		out.push( '<div class="cm-metrics">' );
		out.push( '<div class="cm-metric"><div class="cm-metric-val" style="color:#22c55e">' + escHtml( summary.ok || 0 ) + '</div><div class="cm-metric-label">OK</div></div>' );
		out.push( '<div class="cm-metric"><div class="cm-metric-val" style="color:#ef4444">' + escHtml( summary.broken || 0 ) + '</div><div class="cm-metric-label">Broken</div></div>' );
		out.push( '<div class="cm-metric"><div class="cm-metric-val" style="color:#f59e0b">' + escHtml( summary.redirects || 0 ) + '</div><div class="cm-metric-label">Redirects</div></div>' );
		out.push( '<div class="cm-metric"><div class="cm-metric-val">' + escHtml( resp.scanned || 0 ) + '</div><div class="cm-metric-label">Total Checked</div></div>' );
		out.push( '</div>' );

		if ( resp.note ) {
			out.push( '<div style="font-size:12px;color:#6b7280;margin-bottom:16px">&#128203; ' + escHtml( resp.note ) + '</div>' );
		}

		// Broken links
		if ( broken.length ) {
			out.push( '<div class="cm-section"><div class="cm-section-title">&#10060; Broken Links (' + escHtml( broken.length ) + ')</div>' );
			out.push( '<div style="margin-bottom:8px"><button class="cm-copy-btn" id="' + escHtml( container.id || '' ) + '-dl-broken">&#8681; Export CSV</button></div>' );
			out.push( '<div class="cm-table-wrap"><table class="cm-table"><thead><tr><th>URL</th><th>Status</th><th>Response</th></tr></thead><tbody>' );
			broken.slice( 0, 50 ).forEach( function ( r ) {
				out.push( '<tr><td style="word-break:break-all;max-width:300px">' + escHtml( r.url ) + '</td><td>' + statusBadge( r.status ) + '</td><td>' + escHtml( r.statusText || '—' ) + '</td></tr>' );
			} );
			out.push( '</tbody></table></div></div>' );
		} else {
			out.push( '<div style="padding:12px 16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;font-size:13px;color:#14532d;margin-bottom:16px">&#9989; No broken links found in the scanned URLs.</div>' );
		}

		// Redirects
		if ( redir.length ) {
			out.push( '<div class="cm-section"><div class="cm-section-title">&#8617;&#65039; Redirects (' + escHtml( redir.length ) + ')</div>' );
			out.push( '<div style="margin-bottom:8px"><button class="cm-copy-btn" id="' + escHtml( container.id || '' ) + '-dl-redir">&#8681; Export CSV</button></div>' );
			out.push( '<div class="cm-table-wrap"><table class="cm-table"><thead><tr><th>From</th><th>Status</th><th>To</th></tr></thead><tbody>' );
			redir.slice( 0, 50 ).forEach( function ( r ) {
				out.push( '<tr><td style="word-break:break-all;max-width:200px">' + escHtml( r.url ) + '</td><td>' + statusBadge( r.status ) + '</td><td style="word-break:break-all;max-width:200px">' + escHtml( r.redirectTo || '—' ) + '</td></tr>' );
			} );
			out.push( '</tbody></table></div></div>' );
		}

		out.push( upgradeBox( 'Upgrade for unlimited crawls, scheduled scans, and WP Redirection import files.', upgradeUrl ) );
		container.innerHTML = out.join( '' );

		// CSV export buttons (bind after render)
		var dlBroken = document.getElementById( container.id + '-dl-broken' );
		if ( dlBroken ) {
			dlBroken.addEventListener( 'click', function () {
				var rows = [ [ 'URL', 'Status', 'Response', 'Response Time (ms)' ] ]
					.concat( broken.map( function ( r ) { return [ r.url, r.status, r.statusText, r.ms ]; } ) );
				csvDownload( rows, 'broken-links.csv' );
			} );
		}
		var dlRedir = document.getElementById( container.id + '-dl-redir' );
		if ( dlRedir ) {
			dlRedir.addEventListener( 'click', function () {
				var rows = [ [ 'From', 'Status', 'To', 'Response Time (ms)' ] ]
					.concat( redir.map( function ( r ) { return [ r.url, r.status, r.redirectTo || '', r.ms ]; } ) );
				csvDownload( rows, 'redirects.csv' );
			} );
		}
	}

	( window.cmLcInstances || [] ).forEach( init );
}() );
