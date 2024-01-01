/**
 * @param {jQuery} $textarea
 */
function RedirectManager( $textarea ) {
	RedirectManager.super.call( this, {} );
	this.$textarea = $textarea;
}

OO.inheritClass( RedirectManager, OO.ui.ProcessDialog );

RedirectManager.static.name = 'extRedirectManager';

RedirectManager.static.title = OO.ui.deferMsg( 'redirectmanager-title' );

RedirectManager.static.actions = [
	{
		title: OO.ui.deferMsg( 'redirectmanager-close' ),
		flags: [ 'safe', 'close' ]
	},
	{
		action: 'help',
		label: OO.ui.deferMsg( 'redirectmanager-help' ),
		title: OO.ui.deferMsg( 'redirectmanager-help-title' ),
		href: 'https://www.mediawiki.org/wiki/Special:MyLanguage/Help:Extension:RedirectManager'
	}
];

/**
 * Set the height to a reasonable maximum.
 *
 * @return {number} Body height
 */
RedirectManager.prototype.getBodyHeight = function () {
	return 400;
};

RedirectManager.prototype.initialize = function () {
	RedirectManager.super.prototype.initialize.apply( this, arguments );
	this.content = new OO.ui.PanelLayout( { padded: true, expanded: false } );

	this.newRedirectInput = new mw.widgets.TitleInputWidget();
	const newRedirectButton = new OO.ui.ButtonWidget( {
		label: mw.msg( 'redirectmanager-newredirect-button' ),
		title: mw.msg( 'redirectmanager-newredirect-button-title' ),
		flags: [ 'progressive' ]
	} );
	newRedirectButton.connect( this, { click: this.addRedirect } );
	this.newRedirectField = new OO.ui.ActionFieldLayout(
		this.newRedirectInput,
		newRedirectButton,
		{
			align: 'top',
			label: mw.msg( 'redirectmanager-newredirect-field' )
		}
	);
	this.newRedirectInput.connect( this, { change: () => {
		this.newRedirectField.setErrors( [] );
	} } );

	const title = new mw.Title( mw.config.get( 'wgPageName' ) );
	const $strongTitle = $( '<strong>' ).text( title.getPrefixedText() );
	this.existingRedirectsField = new OO.ui.FieldLayout( new OO.ui.Widget(), {
		label: mw.message( 'redirectmanager-existing-redirects', [ $strongTitle ] ).parseDom(),
		align: 'top'
	} );

	this.content.$element.append(
		this.newRedirectField.$element,
		this.existingRedirectsField.$element
	);
	this.$body.append( this.content.$element );
};

RedirectManager.prototype.addRedirect = function () {
	const redirect = this.newRedirectInput.getValue();
	if ( redirect === '' ) {
		this.newRedirectInput.focus();
		return;
	}
	( new mw.Api() ).post( {
		formatversion: 2,
		action: 'redirectmanager',
		target: mw.config.get( 'wgPageName' ),
		redirect: redirect,
		errorformat: 'html',
		uselang: mw.config.get( 'wgUserLanguage' )
	} ).done( () => {
		this.refreshList();
	} ).fail( ( errorCode, result ) => {
		this.newRedirectField.setErrors(
			result.errors.map(
				( error ) => new OO.ui.HtmlSnippet( error.html )
			)
		);
	} );
};

/**
 * @param {mw.Title} title
 * @return {jQuery.Promise}
 */
RedirectManager.prototype.deleteRedirect = function ( title ) {
	this.newRedirectField.setErrors( [] );
	return ( new mw.Api() ).postWithToken( 'csrf', {
		formatversion: 2,
		action: 'delete',
		title: title.getPrefixedText(),
		assert: 'user',
		tags: 'redirectmanager',
		errorformat: 'html',
		uselang: mw.config.get( 'wgUserLanguage' )
	} ).fail( ( errorCode, result ) => {
		this.newRedirectField.setErrors(
			result.errors.map(
				( error ) => new OO.ui.HtmlSnippet( error.html )
			)
		);
	} );
};

RedirectManager.prototype.getSetupProcess = function ( data ) {
	data = data || {};
	return RedirectManager.super.prototype.getSetupProcess.call( this, data )
		.next( function () {
			this.newRedirectField.setErrors( [] );
			this.refreshList();
		}, this );
};

RedirectManager.prototype.refreshList = function () {
	$.when(
		( new mw.Api() ).get( {
			formatversion: 2,
			action: 'query',
			prop: 'redirects',
			titles: mw.config.get( 'wgPageName' )
		} ),
		mw.user.getRights()
	).then( ( result, rights ) => {
		const hasDeleteRight = rights.indexOf( 'delete' ) !== -1;
		let $out;
		const pageInfo = result[ 0 ].query.pages[ 0 ];
		if ( pageInfo.redirects === undefined ) {
			$out = $( '<p>' ).append(
				$( '<em>' ).text( mw.msg( 'redirectmanager-no-redirects-found' ) )
			);
		} else {
			$out = $( '<table>' ).addClass( 'ext-redirectmanager-table' ).append(
				pageInfo.redirects
					.sort( ( a, b ) => a.title > b.title )
					.map( ( redirect ) => this.getTableRow(
						new mw.Title( redirect.title, redirect.ns ),
						hasDeleteRight
					) )
			);
		}
		this.existingRedirectsField.getField().$element.empty().append( $out );
	} );
};

/**
 * @private
 * @param {mw.Title} title
 * @return {jQuery}
 */
RedirectManager.prototype.getTableRow = function ( title, hasDeleteRight ) {
	const redirectButton = new OO.ui.ButtonWidget( {
		href: title.getUrl( { redirect: 'no' } ),
		target: '_base',
		label: title.getPrefixedText(),
		title: mw.msg( 'redirectmanager-link-title' ),
		framed: false
	} );

	const insertButton = new OO.ui.ButtonWidget( {
		label: mw.msg( 'redirectmanager-insert' ),
		title: mw.msg( 'redirectmanager-insert-title' ),
		flags: [ 'progressive' ],
		framed: false
	} );
	insertButton.connect( this, {
		click: () => {
			this.close().closed.then( () => {
				this.$textarea.textSelection( 'replaceSelection', title.getPrefixedText() );
			} );
		}
	} );

	let copyButton = false;
	if ( navigator && navigator.clipboard ) {
		copyButton = new OO.ui.ButtonWidget( {
			label: mw.msg( 'redirectmanager-copy-to-clipboard' ),
			title: mw.msg( 'redirectmanager-copy-to-clipboard-title' ),
			flags: [ 'progressive' ],
			framed: false
		} );
		copyButton.connect( this, {
			click: () => {
				navigator.clipboard.writeText( title.getPrefixedText() ).then( () => {
					copyButton.setLabel( mw.msg( 'redirectmanager-copied-to-clipboard' ) );
					setTimeout( () => {
						copyButton.setLabel( mw.msg( 'redirectmanager-copy-to-clipboard' ) );
					}, 800 );
				} );
			}
		} );
	}

	const $row = $( '<tr>' ).append(
		$( '<td>' ).append( redirectButton.$element ),
		$( '<td>' ).append( insertButton.$element )
	);
	if ( copyButton ) {
		$row.append( $( '<td>' ).append( copyButton.$element ) );
	}

	if ( hasDeleteRight ) {
		const deleteButton = new OO.ui.ButtonWidget( {
			label: mw.msg( 'redirectmanager-delete-redirect' ),
			title: mw.msg( 'redirectmanager-delete-redirect-title' ),
			flags: [ 'progressive' ],
			framed: false
		} );
		deleteButton.connect( this, { click: () => {
			$row.addClass( 'ext-redirectmanager-deleting' );
			this.deleteRedirect( title )
				.done( () => {
					$row.remove();
				} )
				.fail( () => {
					$row.removeClass( 'ext-redirectmanager-deleting' );
				} );
		} } );
		$row.append( $( '<td>' ).append( deleteButton.$element ) );
	}

	return $row;
};

RedirectManager.prototype.getActionProcess = function ( action ) {
	if ( action ) {
		return new OO.ui.Process( () => {
			if ( action === 'help' ) {
				window.open( this.actions.list[ 1 ].href );
			} else {
				this.close( { action: action } );
			}
		} );
	}
	return RedirectManager.super.prototype.getActionProcess.call( this, action );
};

module.exports = RedirectManager;
