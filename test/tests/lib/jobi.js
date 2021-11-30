const fs           = require('fs');
const { Writable } = require('stream');
const path         = 'lib/jobi';

const Jobi           = getModule( path );
const formats        = getModule('lib/formats');
const buildLogObject = getModule('lib/util/build-log-object');
const levels         = getModule('lib/levels');

// Shared Jobi settings symbols
const sharedLogLevel  = Symbol.for('JOBI_sharedLogLevel');
const sharedLogFormat = Symbol.for('JOBI_sharedLogFormat');

// Symbols for private properties and methods
const logWithFormat   = Symbol.for('JOBI_logWithFormat');

describe( path, () => {
  // Reset the shared log level and shared log format
  beforeEach( () => {
    delete global[ sharedLogLevel ];
    delete global[ sharedLogFormat ];
  });

  describe( 'static', () => {
    describe( '.level', () => {
      it( 'should get the shared log level', () => {
        global[ sharedLogLevel ] = 'info';
        expect( Jobi.level ).to.equal('info');
      });

      it( 'should set the shared log level', () => {
        Jobi.level = 'bad warn,critical----';
        expect( global[ sharedLogLevel ] ).to.equal('warn');
      });
    });

    describe( '.format', () => {
      it( 'should default the shared log format to pretty', () => {
        expect( Jobi.format ).to.deep.equal( formats.pretty );
      });

      it( 'should get the global format', () => {
        const format = log => JSON.stringify( log );
        global[ sharedLogFormat ] = format;
        expect( Jobi.format ).to.deep.equal( format );
      });

      it( 'should set the global format', () => {
        const format = log => JSON.stringify( log );
        Jobi.format = format;
        expect( Jobi.format ).to.deep.equal( format );
      });

      it( 'should ensure the format is valid', () => {
        assert.throws(
          () => Jobi.format = null,
          'Invalid format \'null\'. Must be string or Function'
        );
      });
    });
  });

  describe( 'instance', () => {
    describe( '#constructor', () => {
      it( 'should ensure stdout is Writable', () => {
        const read = fs.createReadStream('README.md');
        assert.throws(
          () => new Jobi({ stdout: read }),
          'stdout must be Writable'
        );
      });

      it( 'should ensure stderr is Writable', () => {
        const read = fs.createReadStream('README.md');
        assert.throws(
          () => new Jobi({ stderr: read }),
          'stderr must be Writable'
        );
      });

      it( 'should throw on an invalid format', () => {
        assert.throws(
          () => new Jobi({ format: true }),
          'Invalid format \'true\'. Must be string or Function'
        );
      });

      it( 'should set the format if passed', () => {
        const custom = () => 'test string';
        const logger = new Jobi({ format: custom });
        expect( logger.format({ 'test': true }) ).to.equal('test string');
      });

      it( 'should allow a format string', () => {
        const logger = new Jobi({ format: 'json' });
        expect( logger.format({ 'test': true }) ).to.equal('{"test":true}');
      });

      it( 'should allow a custom prefix', () => {
        new Jobi({ prefix: 'cognomen' });
      });

      it( 'should set up correct defaults', () => {
        const logger = new Jobi();
        expect( logger.stdout ).to.deep.equal( process.stdout );
        expect( logger.stderr ).to.deep.equal( process.stderr );
        expect( logger.format ).to.deep.equal( formats.pretty );
      });

      it( 'should not blow up if an error is emitted', () => {
        const logger = new Jobi();
        logger.emit('error');
      });
    });

    describe( '#format', () => {
      it( 'should allow setting the local format', () => {
        const logger = new Jobi();
        const format = () => 'test log string';
        logger.format = format;
        expect( logger.format({}) ).to.equal('test log string');
      });

      it( 'should revert to the shared format if unset', () => {
        const logger = new Jobi();
        const local = () => 'test log string';
        const shared = () => 'test log string shared';
        Jobi.format = shared;
        logger.format = local;

        expect( logger.format({}) ).to.equal('test log string');

        logger.format = null;
        expect( logger.format({}) ).to.equal('test log string shared');
      });
    });

    describe( 'level', () => {
      it( 'should get the shared level', () => {
        const logger = new Jobi();
        expect( logger.level ).to.deep.equal( Jobi.level );
      });

      it( 'should throw on set', () => {
        const logger = new Jobi();
        assert.throws( () => logger.level = 'info' );
      });
    });

    describe( 'prefix', () => {
      it( 'should allow prefix to be read', () => {
        const logger = new Jobi({ prefix: 'prefix' });
        expect( logger.prefix ).to.equal('prefix');
      });

      it( 'should not allow prefix to be written', () => {
        const logger = new Jobi({ prefix: 'prefix' });
        assert.throws( () => logger.prefix = 'cognomen' );
      });
    });

    describe( '#log', () => {
      it( 'should alias all log levels to call #log', () => {
        const data = { some: [ 'nested', 'data' ] };
        const msg = 'This is the message';
        const args = [ 'plus', 1, 'more', 'arg' ];

        const devNull = new Writable();
        devNull._write = ( chunk, enc, next ) => next();

        for ( const level in levels ) {
          const logger = new Jobi({ stdout: devNull, stderr: devNull });
          sinon.spy( logger, 'log' );
          logger[ level ]( data, msg, ...args );
          expect( logger.log.calledWith( level, data, msg, ...args ) );
        }
      });

      it( 'should alias all log levels .json to call #logWithFormat', () => {
        const data = { some: [ 'nested', 'data' ] };
        const msg = 'This is the message';
        const args = [ 'plus', 1, 'more', 'arg' ];

        const devNull = new Writable();
        devNull._write = ( chunk, enc, next ) => next();

        for ( const level in levels ) {
          const logger = new Jobi({ stdout: devNull, stderr: devNull });
          sinon.spy( logger, logWithFormat );
          logger[ level ].json( data, msg, ...args );
          expect(
            logger[ logWithFormat ].calledWith(
              level, formats.json, data, msg, ...args
            )
          );
        }
      });

      it( 'should call #logWithFormat with the shared format', () => {
        const writable = new Writable();
        writable._write = ( chunk, enc, next ) => next();
        const logger = new Jobi({ stdout: writable });

        const args = [ 1, 'two', null, { four: 5, six: [ 7, '8' ] } ];
        sinon.spy( logger, logWithFormat );
        logger.log( 'info', ...args );

        expect(
          logger[ logWithFormat ].calledWith( 'info', logger.format, ...args )
        ).to.be.true;
      });

      it( 'should call #logWithFormat with the local format', () => {
        const writable = new Writable();
        writable._write = ( chunk, enc, next ) => next();
        const logger = new Jobi({ stdout: writable });
        const localFormat = obj => obj.toString();
        logger.format = localFormat; // Set the local instance format

        const args = [ 1, 'two', null, { four: 5, six: [ 7, '8' ] } ];
        sinon.spy( logger, logWithFormat );
        logger.log( 'info', ...args );

        expect(
          logger[ logWithFormat ].calledWith( 'info', localFormat, ...args )
        ).to.be.true;
      });
    });
  });

  describe( '#logWithFormat', () => {
    beforeEach( () => {
      delete this.data;
      delete this.error;
      const stdout = new Writable();
      stdout._write = ( chunk, enc, next ) => {
        this.data = chunk.toString();
        next();
      };

      const stderr = new Writable();
      stderr._write = ( chunk, enc, next ) => {
        this.error = chunk.toString();
        next();
      };

      this.opts = { stdout, stderr };
    });

    before( () => {
      this.date = new Date( 1578068225388 );
      this.clock = sinon.useFakeTimers( this.date );
    });

    after( () => this.clock.restore() );

    it( 'should do nothing if level is undefined', () => {
      const logger = new Jobi( this.opts );
      Jobi.level = undefined;
      expect(
        logger[ logWithFormat ]( 'error', JSON.stringify, 'message' )
      ).to.be.undefined;
      expect( this.data ).to.be.undefined;
    });

    it( 'should do nothing with an insufficient level', () => {
      const logger = new Jobi( this.opts );
      Jobi.level = 'warn';
      expect(
        logger[ logWithFormat ]( 'info', JSON.stringify, 'message' )
      ).to.be.undefined;
      expect( this.data ).to.be.undefined;
    });

    it( 'should log with a sufficient level and add a newline', () => {
      const logger = new Jobi( this.opts );
      Jobi.level = 'info';
      expect(
        logger[ logWithFormat ]( 'info', () => 'test', 'message' )
      ).to.be.undefined;

      expect( this.data ).to.equal('test\n');
    });

    it( 'should log to stderr if loglevel <= 3', () => {
      const logger = new Jobi( this.opts );
      Jobi.level = 'info';
      expect(
        logger[ logWithFormat ]( 'error', () => 'test', 'message' )
      ).to.be.undefined;

      expect( this.error ).to.equal('test\n');
    });

    it( 'should use util.buildLogObject with the level and args', () => {
      const logger = new Jobi( this.opts );
      Jobi.level = 'info';

      const format = JSON.stringify;

      const args = [ 1, 'two', null, { four: 5, six: [ 7, '8' ] } ];
      logger[ logWithFormat ]( 'info', format, ...args );
      const expected = buildLogObject( 'info', args );

      expect( this.data ).to.equal( format( expected ) + '\n' );
    });

    it( 'should add prefix to log objects message prop', () => {
      const logger = new Jobi({
        ...this.opts,
        prefix: 'prefix.'
      });
      Jobi.level = 'info';

      const format = JSON.stringify;

      const args = [ 1, 'two', null, { four: 5, six: [ 7, '8' ] } ];
      logger[ logWithFormat ]( 'info', format, ...args );
      const expected = buildLogObject( 'info', args );
      expected.message = 'prefix.' + expected.message;

      expect( this.data ).to.equal( format( expected ) + '\n' );
    });

    it( 'should emit an event with the log level and log object', done => {
      const logger = new Jobi( this.opts );
      Jobi.level = 'trace';
      Jobi.format = 'json';

      const args = [ 1, 'two', null, { four: 5, six: [ 7, '8' ] } ];
      const expectedLog = buildLogObject( 'debug', args );

      logger.once( 'debug', ( formatted, log ) => {
        expect( log ).to.deep.equal( expectedLog );
        expect( formatted ).to.equal( logger.format( expectedLog ) );
        done();
      });

      logger[ logWithFormat ]( 'debug', formats.json, ...args );
    });

    it( 'should not emit level event if level is insufficient', () => {
      const logger = new Jobi( this.opts );
      Jobi.level = 'error';
      Jobi.format = 'json';

      const args = [ 1, 'two', null, { four: 5, six: [ 7, '8' ] } ];

      let emitted = false;
      logger.once( 'info', () => {
        emitted = true;
      });

      logger[ logWithFormat ]( 'info', formats.json, ...args );
      assert.isFalse( emitted );
    });

    it( 'should emit "log" if listener even if level is insufficient', done => {
      const logger = new Jobi( this.opts );
      Jobi.level = 'error';
      Jobi.format = 'json';

      const args = [ 1, 'two', null, { four: 5, six: [ 7, '8' ] } ];
      const expectedLog = buildLogObject( 'info', args );

      logger.once( 'log', ( level, formatted, log ) => {
        expect( level ).to.equal('info');
        expect( log ).to.deep.equal( expectedLog );
        expect( formatted ).to.equal( logger.format( expectedLog ) );
        done();
      });

      logger[ logWithFormat ]( 'info', formats.json, ...args );
    });
  });
});
