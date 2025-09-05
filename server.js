/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

const express = require('express');
const path = require('path');
const app = express();

// The hosting environment (like Google Cloud Run, used by Firebase) sets the PORT environment variable.
// We must listen on this port for the deployment to be considered healthy.
const port = process.env.PORT || 8080;

// This line tells our server to serve the static files (HTML, CSS, JS) from the 'dist' directory.
// The 'dist' directory is where your `npm run build` command outputs the final application.
app.use(express.static(path.join(__dirname, 'dist')));

// This is a catch-all route. If a user requests a page that isn't a static file (e.g., /editor),
// we send them the main index.html file. This allows your React application to handle the routing.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Pixshop server listening on port ${port}`);
});
