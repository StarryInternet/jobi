'use strict';

const Jobi = require('./lib/jobi');

// Set the default global level and format
if ( process.env.NODE_DEBUG ) {
  Jobi.level = process.env.NODE_DEBUG;
}

if ( process.env.JOBI_FORMAT ) {
  Jobi.format = process.env.JOBI_FORMAT;
}

module.exports = new Jobi();
module.exports.Jobi = Jobi;
