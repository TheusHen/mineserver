const http = require('http');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'install.ps1');

const server = http.createServer((req, res) => {
  if (req.url === '/install.ps1') {
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500);
        return res.end('Error loading file');
      }
      res.writeHead(200, {
        'Content-Type': 'text/plain',
        'Content-Disposition': 'attachment; filename="install.ps1"',
      });
      res.end(data);
    });
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(80, () => {
  console.log('Serving install.ps1 at http://localhost/install.ps1');
});
