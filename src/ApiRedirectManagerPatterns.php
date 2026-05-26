<?php

namespace MediaWiki\Extension\RedirectManager;

use MediaWiki\Api\ApiBase;
use MediaWiki\Api\ApiMain;
use Wikimedia\ParamValidator\ParamValidator;

class ApiRedirectManagerPatterns extends ApiBase {
	public function __construct(
		ApiMain $main,
		string $action,
		private readonly TitlePatternResolver $titlePatternResolver
	) {
		parent::__construct( $main, $action );
	}

	/**
	 * @inheritDoc
	 */
	public function execute(): void {
		$patterns = $this->getParameter( 'patterns' );
		$out = [];
		foreach ( $patterns as $pattern ) {
			$out[] = [
				'pattern' => $pattern,
				'title' => $this->titlePatternResolver->resolve( $pattern ),
			];
		}
		$this->getResult()->addValue( 'redirectmanagerpatterns', 'patterns', $out );
	}

	/**
	 * @return mixed[][]
	 */
	public function getAllowedParams(): array {
		return [
			'patterns' => [
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_REQUIRED => true,
				ParamValidator::PARAM_ISMULTI => true,
			],
		];
	}

	/**
	 * @inheritDoc
	 */
	protected function getExamplesMessages(): array {
		return [
			'action=redirectmanagerpatterns&patterns=Exploration {date}' => 'apihelp-redirectmanagerpatterns-example-1',
		];
	}
}
