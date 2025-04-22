// dev.js
const browserSync = require('browser-sync').create();
const nodemon = require('nodemon');
const path = require('path');

// Start nodemon to watch server files
nodemon({
  script: 'server.js',
  watch: ['server.js', 'utils/**/*.js'],
  ext: 'js,json',
  ignore: ['public/**/*', 'generated/**/*']
})
.on('start', () => {
  console.log('Server started');
})
.on('restart', (files) => {
  console.log('Server restarted due to changes in:', files);
});

// Wait for nodemon to start before launching browser-sync
setTimeout(() => {
  // Start browser-sync to watch frontend files and refresh the browser
  browserSync.init({
    proxy: 'localhost:3000', // Your Express app's address
    files: ['public/**/*.{html,css,js}', 'index.html'],
    port: 3001, // Browser-sync runs on a different port
    ui: { port: 3002 }, // Browser-sync UI runs on yet another port
    open: false, // Don't open the browser automatically
    notify: false, // Don't show the browser-sync connected notification
    reloadDelay: 500 // Small delay to ensure server has restarted
  });
  
  console.log('Browser-sync started at http://localhost:3001');
}, 1000);
