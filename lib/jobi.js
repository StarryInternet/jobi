
const EventEmitter = require('events');
const { Writable } = require('stream');
const formats      = require('./formats');
const levels       = require('./levels');
const util         = require('./util');

const DEFAULT_OPTS = {
  stdout: process.stdout,
  stderr: process.stderr,
  format: null,
  prefix: ''
};

// Shared Jobi settings symbols
const sharedLogLevel  = Symbol.for('JOBI_sharedLogLevel');
const sharedLogFormat = Symbol.for('JOBI_sharedLogFormat');

// Symbols for private properties and methods
const logWithFormat  = Symbol.for('JOBI_logWithFormat');
const localLogFormat = Symbol.for('JOBI_localLogFormat');
const localLogPrefix = Symbol.for('JOBI_localLogPrefix');

class Jobi extends EventEmitter {
  /**********/
  /* Static */
  /**********/

  /**
   * @type {string}
   */
  static get level() {
    return global[ sharedLogLevel ];
  }

  static set level( level ) {
    global[ sharedLogLevel ] = util.parseLevel( level );
  }

  /**
   * @type {Format}
   */
  static get format() {
    return global[ sharedLogFormat ] || formats.pretty;
  }

  static set format( format ) {
    global[ sharedLogFormat ] = util.parseFormat( format );
  }

  /************/
  /* Instance */
  /************/

  /**
   * Construct an instance of Jobi
   *
   * @param {Options} opts
   */
  constructor( opts = {} ) {
    super();
    const {
      stdout,
      stderr,
      format,
      prefix
    } = { ...DEFAULT_OPTS, ...opts };

    if ( !( stdout instanceof Writable ) ) {
      throw new Error('stdout must be Writable');
    }

    if ( !( stderr instanceof Writable ) ) {
      throw new Error('stderr must be Writable');
    }

    this.stdout = stdout;
    this.stderr = stderr;
    this.format = format;

    this[ localLogPrefix ] = prefix;

    // Ignore 'error' events to avoid Node process exiting
    this.on( 'error', () => {} );

    // Setup shortcuts for each level to call this.log()
    Object.keys( levels ).forEach( level => {
      this[ level ] = this.log.bind( this, level );

      // Maintain level.json for backwards compatibility
      const logJson = this[ logWithFormat ].bind( this, level, formats.json );
      this[ level ].json = logJson;
    });
  }

  /**
   * @type {Format|null}
   */
  get format() {
    return this[ localLogFormat ] || Jobi.format;
  }

  set format( format ) {
    this[ localLogFormat ] = format ? util.parseFormat( format ) : null;
  }

  /**
   * @type {string}
   */
  get level() {
    // For now, use the shared level
    // If needed, add the option for a local level
    return Jobi.level;
  }

  set level( _ ) {
    const msg = 'Do not set the level of Jobi instance. ' +
                'Instead, set the Jobi level sharedly.';
    throw new Error( msg );
  }

  /**
   * @type {string}
   */
  get prefix() {
    return this[ localLogPrefix ];
  }

  set prefix( _ ) {
    const msg = 'Do not set the prefix of a Jobi instance. ' +
                'Instead, create a new instance.';
    throw new Error( msg );
  }

  /**
   * Log the formatted level, message, and args to the appropriate stream
   *
   * @param {string} level - The level to log
   * @param {string} message - the message itself
   * @param {...any} [interpolationValues] - values to format into the message
   */
  log( level, ...args ) {
    this[ logWithFormat ]( level, this.format, ...args );
  }

  /**
   * Log the formatted level, message, and args to the appropriate stream
   *
   * @param {string} level - The level to log
   * @param {Function} format - A function to convert the Log into a string
   * @param {string} message - see log()
   * @param {...any} [interpolationValues] - see log()
   */
  [ logWithFormat ]( level, format, ...args ) {
    const levelValue = levels[ level ];

    // Ignore invalid or insufficient log levels
    const shouldLog =
      levelValue !== undefined &&
      this.level !== undefined &&
      levelValue >= levels[ this.level ];

    const shouldEmit = this.listenerCount('log') > 0;

    // Return early if no action is required
    if ( !shouldLog && !shouldEmit ) {
      return;
    }

    // Aggregate and format the log into a writable string
    const log = util.buildLogObject( level, args );
    log.message = this[ localLogPrefix ] + log.message;
    const formattedLog = format( log );

    // Write the formatted log to the output stream. Always add a newline
    if ( shouldLog ) {
      const stream = levelValue > 3 ? this.stderr : this.stdout;
      stream.write( formattedLog + '\n' );
      this.emit( level, formattedLog, log );
    }

    // Emit a "log" event if there are any listeners
    if ( shouldEmit ) {
      this.emit( 'log', level, formattedLog, log );
    }
  }
}

module.exports = Jobi;
