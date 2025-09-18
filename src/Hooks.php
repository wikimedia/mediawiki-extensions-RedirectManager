<?php

namespace MediaWiki\Extension\RedirectManager;

use MediaWiki\ChangeTags\Hook\ChangeTagsAllowedAddHook;
use MediaWiki\ChangeTags\Hook\ChangeTagsListActiveHook;
use MediaWiki\ChangeTags\Hook\ListDefinedTagsHook;
use MediaWiki\Hook\EditPage__showEditForm_initialHook;

class Hooks implements
	EditPage__showEditForm_initialHook,
	ListDefinedTagsHook,
	ChangeTagsListActiveHook,
	ChangeTagsAllowedAddHook
{

	/** @inheritDoc */
	public function onEditPage__showEditForm_initial( $editor, $out ) {
		$out->addModules( [ 'ext.RedirectManager' ] );
	}

	/** @inheritDoc */
	public function onListDefinedTags( &$tags ): void {
		$tags[] = 'redirectmanager';
	}

	/** @inheritDoc */
	public function onChangeTagsListActive( &$tags ): void {
		$tags[] = 'redirectmanager';
	}

	/** @inheritDoc */
	public function onChangeTagsAllowedAdd( &$allowedTags, $addTags, $user ): void {
		$allowedTags[] = 'redirectmanager';
	}
}
