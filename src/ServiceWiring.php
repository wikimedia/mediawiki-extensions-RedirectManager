<?php

use MediaWiki\Extension\RedirectManager\TitlePatternResolver;
use MediaWiki\MediaWikiServices;

/** @phpcs-require-sorted-array */
return [
	'RedirectManager.TitlePatternResolver' => static function ( MediaWikiServices $services ): TitlePatternResolver {
		return new TitlePatternResolver( $services->getConnectionProvider() );
	},
];
