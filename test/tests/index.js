'use strict';

const path = '../..';
const Jobi = require('../../lib/jobi');
const formats = getModule('lib/formats');

describe( 'index', () => {
  beforeEach( () => {
    // Clear the require cache
    delete require.cache[ require.resolve( path ) ];
  });

  it( 'should export a default instance of Jobi', () => {
    const logger = require('../..');
    expect( logger instanceof Jobi );
  });

  it( 'should set a "Jobi" property on the default instance', () => {
    const logger = require('../..');
    expect( logger.Jobi ).to.deep.equal( Jobi );
  });

  it( 'should set the shared format with process.env.JOBI_FORMAT', () => {
    process.env.JOBI_FORMAT = 'json';
    require('../..');
    expect( Jobi.format ).to.deep.equal( formats.json );
  });

  it( 'should set the shared level with process.env.NODE_DEBUG', () => {
    process.env.NODE_DEBUG = 'warn';
    require('../..');
    expect( Jobi.level ).to.deep.equal('warn');
  });
});
