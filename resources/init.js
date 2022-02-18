( function () {
	var RedirectManager = require( './RedirectManager.js' );
	mw.hook( 'wikiEditor.toolbarReady' ).add( function ( $textarea ) {
		var dialog = new RedirectManager();
		OO.ui.getWindowManager().addWindows( [ dialog ] );
		$textarea.wikiEditor( 'addToToolbar', {
			section: 'main',
			group: 'insert',
			tools: {
				redirectmanager: {
					type: 'button',
					label: mw.msg( 'redirectmanager-title' ),
					oouiIcon: 'articleRedirect',
					action: {
						type: 'callback',
						execute: function () {
							OO.ui.getWindowManager().openWindow( dialog );
						}
					}
				}
			}
		} );
	} );
}() );
