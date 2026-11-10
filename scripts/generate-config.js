// Regenerates contributes.configuration.properties in package.json from the option schema.
const fs = require('fs');
const path = require('path');
const { buildConfigurationProperties } = require('../out/src/core/schema');

const file = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
pkg.contributes.configuration.properties = buildConfigurationProperties();
fs.writeFileSync(file, JSON.stringify(pkg, null, 4) + '\n');
console.log('package.json configuration updated');
