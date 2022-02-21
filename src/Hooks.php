<?php

namespace MediaWiki\Extension\RedirectManager;

use MediaWiki\Hook\EditPage__showEditForm_initialHook;

class Hooks implements EditPage__showEditForm_initialHook {

	// phpcs:disable MediaWiki.NamingConventions.LowerCamelFunctionsName.FunctionName

	/**
	 * @inheritDoc
	 */
	public function onEditPage__showEditForm_initial( $editor, $out ) {
		$out->addModules( [ 'ext.RedirectManager', 'ext.RedirectManager.images' ] );
	}
}
