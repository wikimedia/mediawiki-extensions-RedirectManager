<?php

use MediaWiki\Extension\RedirectManager\TitlePatternResolver;
use Wikimedia\Timestamp\ConvertibleTimestamp;

/**
 * @group Database
 */
class TitlePatternResolverTest extends MediaWikiIntegrationTestCase {

	private TitlePatternResolver $resolver;

	/** @inheritDoc */
	public function setUp(): void {
		$this->resolver = new TitlePatternResolver( $this->getServiceContainer()->getConnectionProvider() );
	}

	/**
	 * @covers \MediaWiki\Extension\RedirectManager\TitlePatternResolver::resolve
	 * @dataProvider provideResolve
	 */
	public function testResolve( string $input, string $output ): void {
		$this->insertPage( 'B1' );
		$this->insertPage( 'B2' );
		ConvertibleTimestamp::setFakeTime( '20260522120000' );
		$this->assertSame( $output, $this->resolver->resolve( $input ) );
	}

	public function provideResolve(): array {
		return [
			'No patterns' => [ 'ABC', 'ABC' ],
			'A date without format' => [ 'A {date}', 'A 2026-05-22' ],
			'Two date parts' => [ 'Y{date:Y}, {date:M}', 'Y2026, May' ],
		];
	}

	/**
	 * @covers \MediaWiki\Extension\RedirectManager\TitlePatternResolver::resolve
	 */
	public function testResolveRandom(): void {
		$this->assertSame( 3, strlen( $this->resolver->resolve( '{random:length=3}' ) ) );
	}

	/**
	 * @covers \MediaWiki\Extension\RedirectManager\TitlePatternResolver::resolve
	 */
	public function testResolveNumber(): void {
		// No pages yet.
		$this->assertSame( 'FOO1', $this->resolver->resolve( 'FOO{number}' ) );

		// Add one page that doesn't match.
		$this->insertPage( 'Lorem' );
		$this->assertSame( 'A1B', $this->resolver->resolve( 'A{number}B' ) );

		// Add two pages that do match, but aren't consecutive.
		$this->insertPage( 'A1B' );
		$this->insertPage( 'A2B' );
		$this->insertPage( 'A35B' );
		$this->assertSame( 'A3B', $this->resolver->resolve( 'A{number}B' ) );

		// Add some more with a different pattern.
		$this->insertPage( 'BAR1' );
		$this->insertPage( 'BAR2' );
		$this->assertSame( 'BAR3', $this->resolver->resolve( 'BAR{number}' ) );
	}
}
